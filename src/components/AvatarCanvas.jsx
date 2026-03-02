/**
 * AvatarCanvas Component
 *
 * React component that renders a 3D avatar skeleton in a Three.js canvas using react-three/fiber.
 * Manages the procedural behavior generator and skeleton rendering.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import BehaviorGenerator from '../behavior/generator';
import { SkeletonAdapter } from '../adapters/gltfAdapter';
import './AvatarCanvas.scss';

/**
 * Internal 3D scene component
 */
function AvatarScene({ config, adapter, onEvent, onReady, modelRef }) {
  const groupRef = useRef(null);
  const generatorRef = useRef(null);
  const localModelRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize generator and load model
  useEffect(() => {
    const init = async () => {
      try {
        // Clear previous model from scene
        if (groupRef.current && localModelRef.current) {
          groupRef.current.remove(localModelRef.current);
          if (adapter) {
            adapter.dispose(localModelRef.current);
          }
        }

        // Initialize behavior generator
        generatorRef.current = new BehaviorGenerator({
          seed: config.seed,
          intensity: config.intensity || 'normal',
          lowResource: config.lowResource || false,
        });

        // Create the fixed skeleton
        console.log('Creating fixed skeleton...');
        const skeleton = await adapter.loadModel();
        console.log('Skeleton created successfully');

        localModelRef.current = skeleton;
        // Update parent ref for external control
        if (modelRef) {
          modelRef.current = skeleton;
        }

        if (groupRef.current && skeleton) {
          groupRef.current.add(skeleton);
        }

        setIsLoading(false);
        onEvent?.({ type: 'behavior:start', timestamp: Date.now() });
        onReady?.();
      } catch (err) {
        console.error('Error initializing avatar:', err);
        setError(err.message);
        onEvent?.({ type: 'error', timestamp: Date.now(), error: err.message });
      }
    };

    init();

    return () => {
      if (localModelRef.current && groupRef.current) {
        groupRef.current.remove(localModelRef.current);
      }
      if (localModelRef.current && adapter) {
        adapter.dispose(localModelRef.current);
      }
    };
  }, [adapter, config, onEvent, onReady, modelRef]);

  // Handle visibility changes (accessibility)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause when page is not visible
        clockRef.current.stop();
      } else {
        // Resume when page becomes visible
        clockRef.current.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle prefers-reduced-motion accessibility setting
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMotionPreference = (e) => {
      if (generatorRef.current) {
        generatorRef.current.setLowResource(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleMotionPreference);

    // Check initial state
    if (mediaQuery.matches) {
      generatorRef.current?.setLowResource(true);
    }

    return () => mediaQuery.removeEventListener('change', handleMotionPreference);
  }, []);

  // Animation loop
  useFrame(() => {
    if (!generatorRef.current || !localModelRef.current || isLoading) return;

    const deltaTime = clockRef.current.getDelta();
    const pose = generatorRef.current.update(deltaTime * 1000);

    // Log pose occasionally for debugging
    if (Math.random() < 0.001) {
      console.log('Current pose:', {
        headRotationY: pose.headRotationY?.toFixed(4),
        headRotationX: pose.headRotationX?.toFixed(4),
        headSwayX: pose.headSwayX?.toFixed(4),
      });
    }

    // Apply pose to model
    adapter.applyPose(localModelRef.current, pose);

    // Emit telemetry event periodically
    if (Math.random() < 0.01) {
      const telemetry = generatorRef.current.getTelemetry();
      onEvent?.({ type: 'performance:sample', timestamp: Date.now(), telemetry });
    }
  });

  if (error) {
    return (
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {isLoading && (
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={0x0000ff} wireframe />
        </mesh>
      )}
    </group>
  );
}

/**
 * AvatarCanvas React Component
 *
 * Main wrapper component that sets up the Three.js canvas and render loop.
 * This component is embeddable into any React application.
 */
export const AvatarCanvas = React.forwardRef(
  (
    { config = {}, adapter = new SkeletonAdapter(), onEvent = () => {}, onReady = () => {} },
    ref
  ) => {
    const canvasRef = useRef(null);
    const modelRef = useRef(null);
    const [showBones, setShowBones] = useState(true);
    const [showMesh, setShowMesh] = useState(false);

    const handleRef = useRef({
      setIntensity: async (level) => {
        // Placeholder - will be connected to behavior generator
        console.log('Setting intensity to:', level);
      },
      setLowResource: async (flag) => {
        console.log('Setting low resource mode to:', flag);
      },
      setSeed: async (seed) => {
        console.log('Setting seed to:', seed);
      },
      toggleBones: async () => {
        if (modelRef.current && adapter) {
          const newState = adapter.toggleBones(modelRef.current);
          setShowBones(newState);
          return newState;
        }
        return false;
      },
      setBones: async (visible) => {
        if (modelRef.current && adapter) {
          if (visible) {
            adapter.showBones(modelRef.current);
          } else {
            adapter.hideBones(modelRef.current);
          }
          setShowBones(visible);
        }
      },
      attachMesh: async (options = {}) => {
        if (modelRef.current && adapter && adapter.attachMesh) {
          adapter.attachMesh(modelRef.current, options);
          setShowMesh(true);
          return true;
        }
        return false;
      },
      toggleMesh: async () => {
        if (modelRef.current && adapter && adapter.toggleMesh) {
          const newState = adapter.toggleMesh(modelRef.current);
          setShowMesh(newState);
          return newState;
        }
        return false;
      },
      setMesh: async (visible) => {
        if (modelRef.current && adapter && adapter.setMeshVisible) {
          adapter.setMeshVisible(modelRef.current, visible);
          setShowMesh(visible);
        }
      },
      attachGLTFMesh: async (url, options = {}) => {
        if (modelRef.current && adapter && adapter.attachGLTFMesh) {
          try {
            await adapter.attachGLTFMesh(modelRef.current, url, options);
            setShowMesh(true);
            return true;
          } catch (error) {
            console.error('Failed to attach GLTF mesh:', error);
            return false;
          }
        }
        return false;
      },
      dispose: async () => {
        console.log('Disposing avatar');
      },
    });

    React.useImperativeHandle(ref, () => handleRef.current);

    return (
      <div className="avatar-canvas-wrapper">
        <Canvas
          ref={canvasRef}
          gl={{ antialias: true, alpha: true, sortObjects: true }}
          className="avatar-canvas"
        >
          <color attach="background" args={['#f0f0f0']} />

          <PerspectiveCamera makeDefault position={[0, 1, 2.5]} fov={75} />

          {/* Basic lighting setup */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <AvatarScene
            config={config}
            adapter={adapter}
            onEvent={onEvent}
            onReady={onReady}
            modelRef={modelRef}
          />
        </Canvas>

        {/* Debug Controls */}
        <div className="avatar-debug-controls">
          <button
            className={`bone-toggle-btn ${showBones ? 'active' : ''}`}
            onClick={async () => {
              await handleRef.current.toggleBones();
            }}
            title="Toggle skeleton visualization"
          >
            {showBones ? '✓ Bones' : 'Bones'}
          </button>
          <button
            className={`bone-toggle-btn ${showMesh ? 'active' : ''}`}
            onClick={async () => {
              if (!showMesh) {
                await handleRef.current.attachMesh({ color: 0xffdbac });
              } else {
                await handleRef.current.toggleMesh();
              }
            }}
            title="Toggle body mesh"
          >
            {showMesh ? '✓ Mesh' : 'Mesh'}
          </button>
        </div>
      </div>
    );
  }
);

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;
