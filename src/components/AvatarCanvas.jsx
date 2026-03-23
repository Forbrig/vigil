/**
 * AvatarCanvas Component
 *
 * React component that renders a 3D avatar skeleton in a Three.js canvas using react-three/fiber.
 * Manages the procedural behavior generator and skeleton rendering.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import BehaviorGenerator from '../behavior/generator';
import { bakeAndExportClip } from '../behavior/baker';
import { SkeletonAdapter } from '../adapters/gltfAdapter';
import './AvatarCanvas.scss';

/**
 * Internal 3D scene component
 */
function AvatarScene({ config, adapter, onEvent, onReady, modelRef, generatorRef }) {
  const groupRef = useRef(null);
  // generatorRef is passed from parent so external controls can access it
  // (if not provided, create a local ref)
  generatorRef = generatorRef || useRef(null);
  const localModelRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const controlsRef = useRef(null);
  // Keep refs to callbacks so changes in parent functions don't force re-init
  const onEventRef = useRef(onEvent);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Initialize generator and load model (only once per adapter/modelRef/onReady change).
  // Do NOT depend on the whole `config` object here to avoid recreating the model
  // when callers update a single config property like `intensity`.
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // Clear previous model from scene
        if (groupRef.current && localModelRef.current) {
          groupRef.current.remove(localModelRef.current);
          if (adapter) {
            adapter.dispose(localModelRef.current);
          }
        }

        // Initialize behavior generator with initial config values
        generatorRef.current = new BehaviorGenerator({
          seed: config?.seed,
          intensity: config?.intensity || 'normal',
          lowResource: config?.lowResource || false,
        });

        // Create the fixed skeleton
        console.log('Creating fixed skeleton...');
        const skeleton = await adapter.loadModel();
        console.log('Skeleton created successfully');

        if (!mounted) return;

        localModelRef.current = skeleton;
        // Update parent ref for external control
        if (modelRef) {
          modelRef.current = skeleton;
        }

        if (groupRef.current && skeleton) {
          groupRef.current.add(skeleton);
        }

        setIsLoading(false);
        onEventRef.current?.({ type: 'behavior:start', timestamp: Date.now() });
        onReadyRef.current?.();
      } catch (err) {
        console.error('Error initializing avatar:', err);
        setError(err.message);
        onEvent?.({ type: 'error', timestamp: Date.now(), error: err.message });
      }
    };

    init();

    return () => {
      mounted = false;
      if (localModelRef.current && groupRef.current) {
        groupRef.current.remove(localModelRef.current);
      }
      if (localModelRef.current && adapter) {
        adapter.dispose(localModelRef.current);
      }
    };
    // intentionally omit `config` here so updates to intensity/seed don't recreate the model
  }, [adapter, modelRef]);

  // Apply runtime-only config updates (do not recreate model). This lets callers
  // change `intensity`, `seed`, or `lowResource` without replacing the skeleton
  // or reattaching meshes/bones.
  useEffect(() => {
    const gen = generatorRef.current;
    if (!gen) return;

    if (typeof config?.intensity !== 'undefined' && config.intensity !== gen.intensity) {
      try {
        gen.setIntensity?.(config.intensity);
      } catch (e) {
        console.warn('setIntensity failed:', e);
      }
    }

    if (typeof config?.lowResource !== 'undefined' && config.lowResource !== gen.lowResource) {
      try {
        gen.setLowResource?.(config.lowResource);
      } catch (e) {
        console.warn('setLowResource failed:', e);
      }
    }

    // Only change seed if explicitly provided (not null/undefined) and different
    // from current seed. setSeed resets macroState intentionally, so avoid
    // calling it on unrelated updates (like intensity).
    if (typeof config?.seed !== 'undefined' && config?.seed !== null && config.seed !== gen.seed) {
      try {
        gen.setSeed?.(config.seed);
      } catch (e) {
        console.warn('setSeed failed:', e);
      }
    }
  }, [config?.intensity, config?.lowResource, config?.seed]);

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

    // small optional telemetry already emitted via onEventRef; avoid noisy logging

    // Apply pose to model
    adapter.applyPose(localModelRef.current, pose);

    // Keep orbit controls target centered on the avatar model position
    try {
      if (controlsRef.current && localModelRef.current) {
        const p = localModelRef.current.position;
        controlsRef.current.target.set(p.x, p.y, p.z);
        controlsRef.current.update();
      }
    } catch (e) {
      // ignore if controls not available in test env
    }

    // Emit telemetry event periodically
    if (Math.random() < 0.01) {
      const telemetry = generatorRef.current.getTelemetry();
      onEventRef.current?.({ type: 'performance:sample', timestamp: Date.now(), telemetry });
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
      {/* OrbitControls kept here so they have access to the scene/camera and
          can be targeted to the avatar model. */}
      <OrbitControls ref={controlsRef} enablePan enableRotate enableZoom />
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
  ({ config = {}, adapter: adapterProp, onEvent = () => {}, onReady = () => {} }, ref) => {
    const canvasRef = useRef(null);
    const modelRef = useRef(null);
    const generatorRef = useRef(null);
    // Ensure a stable adapter instance so re-renders (e.g. config changes)
    // don't create a new adapter and force reinitialization of the scene.
    const adapterRef = useRef(adapterProp || new SkeletonAdapter());
    const adapter = adapterRef.current;
    const [showBones, setShowBones] = useState(true);
    const [showMesh, setShowMesh] = useState(false);
    const [randomMode, setRandomMode] = useState(true);
    const [activeMacro, setActiveMacro] = useState('idle');

    const handleRef = useRef({
      setIntensity: async (level) => {
        if (generatorRef.current) generatorRef.current.setIntensity?.(level);
      },
      setLowResource: async (flag) => {
        if (generatorRef.current) generatorRef.current.setLowResource?.(flag);
      },
      setSeed: async (seed) => {
        if (generatorRef.current) generatorRef.current.setSeed?.(seed);
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
        // disposing avatar
      },
      // Behavior control helpers
      setMacroState: async (state, durationMs = null) => {
        if (generatorRef.current) {
          const ok = generatorRef.current.setMacroState?.(state, durationMs);
          // When user forces a state, disable random mode and update UI
          if (ok) {
            setRandomMode(false);
            setActiveMacro(state);
          }
          return ok;
        }
        return false;
      },
      clearForcedMacroState: async () => {
        if (generatorRef.current) {
          generatorRef.current.clearForcedMacroState?.();
          setRandomMode(true);
          // sync UI to actual macroState
          const state =
            generatorRef.current.macroState ||
            generatorRef.current.getTelemetry?.()?.macroState ||
            'idle';
          setActiveMacro(state);
          return true;
        }
        return false;
      },
      setSceneWeights: async (weights) => {
        if (generatorRef.current) {
          generatorRef.current.setSceneWeights?.(weights);
          return true;
        }
        return false;
      },
    });

    // Keep UI in sync with generator state. Polling is small and simple.
    React.useEffect(() => {
      let mounted = true;
      const tick = () => {
        try {
          const gen = generatorRef.current;
          if (gen) {
            const state = gen.macroState || gen.getTelemetry?.()?.macroState || 'idle';
            if (mounted) setActiveMacro(state);
          }
        } catch (e) {
          // ignore
        }
      };

      const id = setInterval(tick, 200);
      // run once immediately
      tick();
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }, [generatorRef]);

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
            generatorRef={generatorRef}
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
                await handleRef.current.attachMesh();
              } else {
                await handleRef.current.toggleMesh();
              }
            }}
            title="Toggle body mesh"
          >
            {showMesh ? '✓ Mesh' : 'Mesh'}
          </button>
        </div>

        {/* Behavior Buttons */}
        <div className="avatar-behavior-controls">
          <button
            className={activeMacro === 'idle' ? 'active' : ''}
            onClick={async () => await handleRef.current.setMacroState('idle')}
          >
            Idle
          </button>
          {/* HandsDown removed - idle covers hands-down posture */}
          <button
            className={activeMacro === 'walk' ? 'active' : ''}
            onClick={async () => await handleRef.current.setMacroState('walk')}
          >
            Walk
          </button>
          <button
            className={activeMacro === 'run' ? 'active' : ''}
            onClick={async () => await handleRef.current.setMacroState('run')}
          >
            Run
          </button>
          <button
            className={activeMacro === 'lookingAround' ? 'active' : ''}
            onClick={async () => await handleRef.current.setMacroState('lookingAround')}
          >
            Looking Around
          </button>
          <button
            onClick={async () => {
              try {
                if (generatorRef.current && modelRef.current) {
                  await bakeAndExportClip(generatorRef.current, adapter, modelRef.current, {
                    macroState: generatorRef.current.macroState,
                    duration: 2,
                    fps: 30,
                    clipName: generatorRef.current.macroState,
                  });
                }
              } catch (e) {
                console.error('Bake failed:', e);
              }
            }}
          >
            Export Clip
          </button>
          <button
            onClick={async () => {
              if (randomMode) {
                await handleRef.current.clearForcedMacroState();
              } else {
                await handleRef.current.clearForcedMacroState();
              }
            }}
            className={randomMode ? 'active' : ''}
            title="Toggle automatic random behavior"
          >
            {randomMode ? 'Random (on)' : 'Random (off)'}
          </button>
        </div>
      </div>
    );
  }
);

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;
