/**
 * GLTF Model Adapter
 * 
 * Provides a unified interface for loading, managing, and animating GLTF/GLB models.
 * Abstracts away model-specific implementation details and provides a contract
 * for model swapping at runtime.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Base adapter interface - all adapters should implement this contract
 */
export class AdapterInterface {
  /**
   * Load a model from a URL
   * @param {string} url - URL to the model resource
   * @returns {Promise<THREE.Group>} Loaded model group
   */
  async loadModel(url) {
    throw new Error('loadModel() must be implemented by subclass');
  }

  /**
   * Apply a pose to the loaded model
   * @param {THREE.Group} model - The loaded model
   * @param {Object} pose - Pose object with bone transforms
   */
  applyPose(model, pose) {
    throw new Error('applyPose() must be implemented by subclass');
  }

  /**
   * Get the animation mixer for the model (if applicable)
   * @param {THREE.Group} model - The loaded model
   * @returns {THREE.AnimationMixer|null}
   */
  getMixer(model) {
    return null;
  }

  /**
   * Cleanup resources
   * @param {THREE.Group} model - The model to clean up
   */
  dispose(model) {
    // Default: do nothing
  }
}

/**
 * GLTF Model Adapter
 * Implements the adapter interface for GLTF/GLB models
 */
export class GLTFAdapter extends AdapterInterface {
  constructor(config = {}) {
    super();
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.mixers = new Map();
  }

  /**
   * Load a GLTF model from URL
   */
  async loadModel(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url).scene.clone();
    }

    const gltf = await new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });

    // Cache the loaded GLTF data
    this.cache.set(url, gltf);

    // Return a clone of the scene
    return gltf.scene.clone();
  }

  /**
   * Apply procedural pose to the model
   * Searches for bones in the model's skeleton and applies transformations
   */
  applyPose(model, pose) {
    if (!model || !pose) return;

    // If model has a skeleton, apply poses to bones
    if (model instanceof THREE.Group) {
      this._applyPoseToBones(model, pose);
    }
  }

  /**
   * Recursively apply pose transforms to model bones
   * @private
   */
  _applyPoseToBones(node, pose) {
    for (const key of Object.keys(pose)) {
      const bone = this._findBone(node, key);
      if (bone) {
        this._applyTransform(bone, key, pose[key]);
      }
    }
  }

  /**
   * Find a bone by name in the model hierarchy
   * @private
   */
  _findBone(node, boneName) {
    if (node.name === boneName) return node;

    for (const child of node.children) {
      const found = this._findBone(child, boneName);
      if (found) return found;
    }

    return null;
  }

  /**
   * Apply transform to a bone based on pose property
   * @private
   */
  _applyTransform(bone, property, value) {
    switch (property) {
      case 'headRotationY':
        bone.rotation.y = value;
        break;
      case 'headRotationX':
        bone.rotation.x = value;
        break;
      case 'eyeLookX':
        // Apply to eye bones if they exist
        const leftEye = this._findBone(bone, 'Eye_L');
        const rightEye = this._findBone(bone, 'Eye_R');
        if (leftEye) leftEye.rotation.y = -value;
        if (rightEye) rightEye.rotation.y = -value;
        break;
      case 'eyeLookY':
        const eyeUp = this._findBone(bone, 'Eye_L');
        const eyeUp2 = this._findBone(bone, 'Eye_R');
        if (eyeUp) eyeUp.rotation.x = value;
        if (eyeUp2) eyeUp2.rotation.x = value;
        break;
      case 'headSwayX':
        bone.position.x = value;
        break;
      case 'headSwayZ':
        bone.position.z = value;
        break;
      case 'breathingAmplitude':
        // Scale chest slightly
        const chest = this._findBone(bone, 'Chest');
        if (chest) {
          chest.scale.y = 1.0 + value * 0.1;
        }
        break;
      case 'shoulderSway':
        // Apply to shoulders if present
        const shoulderL = this._findBone(bone, 'Shoulder_L');
        const shoulderR = this._findBone(bone, 'Shoulder_R');
        if (shoulderL) shoulderL.position.z = value;
        if (shoulderR) shoulderR.position.z = -value;
        break;
      // Add more pose properties as needed
    }
  }

  /**
   * Get animation mixer if the model has animations
   */
  getMixer(model, scene) {
    if (!scene) return null;

    let mixer = this.mixers.get(model);
    if (!mixer) {
      mixer = new THREE.AnimationMixer(model);
      this.mixers.set(model, mixer);
    }

    return mixer;
  }

  /**
   * Cleanup resources
   */
  dispose(model) {
    // Remove mixer
    const mixer = this.mixers.get(model);
    if (mixer) {
      mixer.stopAllAction();
      this.mixers.delete(model);
    }

    // Dispose geometries and materials
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry?.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach((mat) => mat.dispose());
        } else {
          node.material?.dispose();
        }
      }
    });
  }
}

/**
 * Placeholder adapter for testing without a real model
 */
export class MockAdapter extends AdapterInterface {
  async loadModel(url) {
    // Return a simple cube as placeholder
    const geometry = new THREE.BoxGeometry(1, 1.8, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    
    const group = new THREE.Group();
    group.add(mesh);
    
    return group;
  }

  applyPose(model, pose) {
    // Simple mock: apply rotation to the group
    if (pose.headRotationY !== undefined) {
      model.rotation.y = pose.headRotationY;
    }
    if (pose.headSwayX !== undefined) {
      model.position.x = pose.headSwayX;
    }
  }

  dispose(model) {
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry?.dispose();
        node.material?.dispose();
      }
    });
  }
}

export default GLTFAdapter;
