import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Bake a macro animation from the procedural `BehaviorGenerator` into a THREE.AnimationClip
 * and export as GLB/GLTF using GLTFExporter. This runs in-browser and triggers a download.
 *
 * @param {BehaviorGenerator} generator
 * @param {Object} adapter - adapter with `applyPose(model, pose)`
 * @param {THREE.Group} model - skeleton root (must include bones in `model.userData.bones`)
 * @param {Object} options
 * @param {string} options.macroState - macro to bake (defaults to generator.macroState)
 * @param {number} options.duration - seconds to bake (default 2)
 * @param {number} options.fps - sampling FPS (default 30)
 * @param {string} options.clipName - output clip name (default macroState)
 */
export async function bakeAndExportClip(generator, adapter, model, options = {}) {
  const macroState = options.macroState || (generator && generator.macroState) || 'idle';
  const duration = typeof options.duration === 'number' ? options.duration : 2;
  const fps = typeof options.fps === 'number' ? options.fps : 30;
  const clipName = options.clipName || macroState;

  if (!generator || !adapter || !model) {
    throw new Error('generator, adapter, and model are required');
  }

  const frames = Math.ceil(duration * fps);
  const dtMs = 1000 / fps;
  const times = new Float32Array(frames);
  for (let i = 0; i < frames; i++) times[i] = i * (1 / fps);

  // Save generator state
  const savedElapsed = generator.elapsed;
  const savedMacroState = generator.macroState;
  const savedTransition = generator._macroTransition;

  // Force macro state and clear transitions for consistent bake
  generator._macroTransition = null;
  generator.macroState = macroState;
  generator.macroStateStartTime = generator.elapsed * 1000;

  // Clone model so we don't visually disturb the live scene
  const clone = model.clone(true);

  // Build bone map from original model.userData.bones to cloned nodes
  const originalBones = model.userData.bones || {};
  const boneMap = {};
  for (const name of Object.keys(originalBones)) {
    const original = originalBones[name];
    const cloned = clone.getObjectByName(original.name || name) || clone.getObjectByName(name);
    if (cloned) boneMap[name] = cloned;
  }
  clone.userData.bones = boneMap;

  const boneNames = Object.keys(boneMap);
  const posArrays = {};
  const quatArrays = {};
  const scaleArrays = {};
  for (const name of boneNames) {
    posArrays[name] = new Float32Array(frames * 3);
    quatArrays[name] = new Float32Array(frames * 4);
    scaleArrays[name] = new Float32Array(frames * 3);
  }

  // Sample generator and capture transforms
  for (let f = 0; f < frames; f++) {
    const pose = generator.update(dtMs);
    adapter.applyPose(clone, pose);

    for (const name of boneNames) {
      const b = boneMap[name];
      const p = b.position;
      const q = b.quaternion;
      const s = b.scale;
      posArrays[name].set([p.x, p.y, p.z], f * 3);
      quatArrays[name].set([q.x, q.y, q.z, q.w], f * 4);
      scaleArrays[name].set([s.x, s.y, s.z], f * 3);
    }
  }

  // Restore generator state
  generator.elapsed = savedElapsed;
  generator.macroState = savedMacroState;
  generator._macroTransition = savedTransition;

  // Build tracks
  const tracks = [];
  for (const name of boneNames) {
    const nodePath = name; // make sure exported node names match these
    tracks.push(new THREE.VectorKeyframeTrack(`${nodePath}.position`, times, posArrays[name]));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${nodePath}.quaternion`, times, quatArrays[name]));
    tracks.push(new THREE.VectorKeyframeTrack(`${nodePath}.scale`, times, scaleArrays[name]));
  }

  const clip = new THREE.AnimationClip(clipName, duration, tracks);

  // Export as GLB (binary) including animation
  const exporter = new GLTFExporter();
  exporter.parse(
    clone,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clipName}.glb`;
        a.click();
      } else {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clipName}.gltf`;
        a.click();
      }
    },
    (err) => console.error('GLTF export error', err),
    { binary: true, animations: [clip] }
  );

  return clip;
}

export default bakeAndExportClip;
