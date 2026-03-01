/**
 * AvatarCanvas Component
 * 
 * React component that renders a 3D avatar in a Three.js canvas using react-three/fiber.
 * Manages the procedural behavior generator, model rendering, and integration with the
 * embedding API.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Lighting } from '@react-three/drei';
import * as THREE from 'three';
import BehaviorGenerator from '../behavior/generator';
import { MockAdapter } from '../adapters/gltfAdapter';
import './AvatarCanvas.scss';

/**
 * Internal 3D scene component
 */
function AvatarScene({
  config,
  adapter,
  onEvent,
  onReady,
}) {
  const groupRef = useRef(null);
  const generatorRef = useRef(null);
  const modelRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { camera } = useThree();

  // Initialize generator and load model
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize behavior generator
        generatorRef.current = new BehaviorGenerator({
          seed: config.seed,
          intensity: config.intensity || 'normal',
          lowResource: config.lowResource || false,
        });

        // Load model
        const loadedModel = await adapter.loadModel(
          config.modelUrl || 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'
        );
        
        modelRef.current = loadedModel;
        if (groupRef.current) {
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
      if (modelRef.current && adapter) {
        adapter.dispose(modelRef.current);
      }
    };
  }, [adapter, config, onEvent, onReady]);

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
    if (!generatorRef.current || !modelRef.current || isLoading) return;

    const deltaTime = clockRef.current.getDelta();
    const pose = generatorRef.current.update(deltaTime * 1000);

    // Apply pose to model
    adapter.applyPose(modelRef.current, pose);

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
    {
      config = {},
      adapter = new MockAdapter(),
      onEvent = () => {},
      onReady = () => {},
    },
    ref
  ) => {
    const canvasRef = useRef(null);
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
      dispose: async () => {
        console.log('Disposing avatar');
      },
    });

    React.useImperativeHandle(ref, () => handleRef.current);

    return (
      <div className="avatar-canvas-wrapper">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 0.5, 1.5], fov: 75 }}
          gl={{ antialias: true, alpha: true }}
          className="avatar-canvas"
        >
          <color attach="background" args={['#f0f0f0']} />
          
          <PerspectiveCamera makeDefault position={[0, 0.5, 1.5]} fov={75} />
          
          <Lighting />
          
          <AvatarScene
            config={config}
            adapter={adapter}
            onEvent={onEvent}
            onReady={onReady}
          />
        </Canvas>
      </div>
    );
  }
);

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;
