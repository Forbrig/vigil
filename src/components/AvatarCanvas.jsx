/**
 * AvatarCanvas Component
 *
 * React component that renders a 3D avatar in a Three.js canvas using react-three/fiber.
 * Manages the procedural behavior generator, model rendering, and integration with the
 * embedding API.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import BehaviorGenerator from '../behavior/generator';
import { MockAdapter } from '../adapters/gltfAdapter';
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
  const { camera } = useThree();

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

        // Load model - use provided URL or default to a public GLTF model
        const modelUrl =
          config.modelUrl ||
          'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb';

        console.log('Loading model from:', modelUrl);
        const loadedModel = await adapter.loadModel(modelUrl);
        console.log('Model loaded successfully:', loadedModel);

        localModelRef.current = loadedModel;
        // Update parent ref for external control
        if (modelRef) {
          modelRef.current = loadedModel;
        }

        if (groupRef.current && loadedModel) {
          // Position the model at origin
          try {
            // Don't scale - keep models at their natural size
            // Just center on XZ plane
            const bbox = new THREE.Box3();
            loadedModel.traverse((node) => {
              if (node instanceof THREE.Mesh) {
                bbox.expandByObject(node);
              }
            });

            if (!bbox.isEmpty()) {
              const center = bbox.getCenter(new THREE.Vector3());
              if (Math.abs(center.x) > 0.001) loadedModel.translateX(-center.x);
              if (Math.abs(center.z) > 0.001) loadedModel.translateZ(-center.z);

              const size = bbox.getSize(new THREE.Vector3());
              console.log('Model positioned at origin. Size:', {
                x: size.x.toFixed(2),
                y: size.y.toFixed(2),
                z: size.z.toFixed(2),
              });
            }
          } catch (err) {
            console.warn('Could not position model:', err);
          }

          groupRef.current.add(loadedModel);
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
  ({ config = {}, adapter = new MockAdapter(), onEvent = () => {}, onReady = () => {} }, ref) => {
    const canvasRef = useRef(null);
    const modelRef = useRef(null);
    const [showBones, setShowBones] = useState(false);

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
              const newState = await handleRef.current.toggleBones();
            }}
            title="Toggle skeleton visualization"
          >
            {showBones ? '✓ Bones' : 'Bones'}
          </button>
        </div>
      </div>
    );
  }
);

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;
