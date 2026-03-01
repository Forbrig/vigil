/**
 * GLTF Model Adapter
 *
 * Provides a unified interface for loading, managing, and animating GLTF/GLB models.
 * Abstracts away model-specific implementation details and provides a contract
 * for model swapping at runtime.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

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
   * Show skeleton bones as visual helpers
   * @param {THREE.Group} model - The loaded model
   */
  showBones(model) {
    // Default: do nothing
  }

  /**
   * Hide skeleton bones visualization
   * @param {THREE.Group} model - The loaded model
   */
  hideBones(model) {
    // Default: do nothing
  }

  /**
   * Toggle the visibility of skeleton bones
   * @param {THREE.Group} model - The loaded model
   * @returns {boolean} The new visibility state
   */
  toggleBones(model) {
    // Default: do nothing
    return false;
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
    this.boneHelpers = new Map(); // Store bone visualization helpers
    this.boneLines = []; // Track bone lines for cleanup
    this.boneSpheres = []; // Track bone spheres for cleanup
    this.bonesVisible = false;
    this.materialOpacityStates = new Map(); // Store original opacity values
    this.meshVisibilityStates = new Map(); // Store original mesh visibility states
  }

  /**
   * Load a GLTF model from URL
   */
  async loadModel(url) {
    const gltf = await new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });

    // Use SkeletonUtils to properly clone rigged models with intact skeletons
    const scene = SkeletonUtils.clone(gltf.scene);

    this._cacheBindPose(scene);

    // If the model has animations, store them for later use
    if (gltf.animations && gltf.animations.length > 0) {
      scene.animations = gltf.animations;
    }

    return scene;
  }

  _cacheBindPose(model) {
    model.traverse((node) => {
      if (node.isBone) {
        // Cache bind pose only once
        if (!node.userData.bindRotation) {
          node.userData.bindRotation = node.rotation.clone();
          node.userData.bindPosition = node.position.clone();
          node.userData.bindScale = node.scale.clone();
        }
      }
    });
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
   * Targets specific bones for each transform to avoid unwanted root movements
   * @private
   */
  _applyPoseToBones(node, pose) {
    if (!node || !pose) return;

    // Track applied keys to avoid duplicate processing
    const appliedKeys = new Set();

    for (const key of Object.keys(pose)) {
      const value = pose[key];

      // Head and neck transforms
      if (key === 'headSwayX' || key === 'headSwayZ' || key === 'headTiltZ') {
        const headBone =
          this._findBone(node, 'head') ||
          this._findBone(node, 'neck') ||
          this._findBone(node, 'skull');

        if (headBone) {
          this._applyTransform(headBone, key, value);
          appliedKeys.add(key);
        }
      }

      // Head rotation transforms
      else if (key === 'headRotationY' || key === 'headRotationX') {
        const headBone =
          this._findBone(node, 'head') ||
          this._findBone(node, 'neck') ||
          this._findBone(node, 'skull');

        if (headBone) {
          this._applyTransform(headBone, key, value);
          appliedKeys.add(key);
        }
      }

      // Eye transforms
      else if (key.includes('eyeLook') || key === 'eyeBlinkIntensity') {
        const eyeBone = this._findBone(node, 'eye') || this._findBone(node, 'head');
        if (eyeBone) {
          this._applyTransform(eyeBone, key, value);
          appliedKeys.add(key);
        }
      }

      // Breathing/chest transforms
      else if (key === 'breathingAmplitude') {
        const chest =
          this._findBone(node, 'chest') ||
          this._findBone(node, 'spine') ||
          this._findBone(node, 'torso');

        if (chest) {
          this._applyTransform(chest, key, value);
          appliedKeys.add(key);
        }
      }

      // Shoulder transforms
      else if (key === 'shoulderSway') {
        const shoulderL = this._findBone(node, 'shoulder_l') || this._findBone(node, 'shoulder.l');
        const shoulderR = this._findBone(node, 'shoulder_r') || this._findBone(node, 'shoulder.r');

        if (shoulderL) {
          this._applyTransform(shoulderL, key, value);
        }
        if (shoulderR) {
          this._applyTransform(shoulderR, key, -value);
        }

        appliedKeys.add(key);
      }

      // Left arm transforms
      else if (key === 'leftArmRotationZ') {
        const leftArm = this._findBone(node, 'arm_l') || this._findBone(node, 'upper_arm_l');
        if (leftArm) {
          this._applyTransform(leftArm, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'leftForearmRotationZ') {
        const leftForearm =
          this._findBone(node, 'forearm_l') || this._findBone(node, 'lower_arm_l');
        if (leftForearm) {
          this._applyTransform(leftForearm, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'leftHandRotationX') {
        const leftHand = this._findBone(node, 'hand_l') || this._findBone(node, 'hand.l');
        if (leftHand) {
          this._applyTransform(leftHand, key, value);
          appliedKeys.add(key);
        }
      }

      // Right arm transforms
      else if (key === 'rightArmRotationZ') {
        const rightArm = this._findBone(node, 'arm_r') || this._findBone(node, 'upper_arm_r');
        if (rightArm) {
          this._applyTransform(rightArm, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'rightForearmRotationZ') {
        const rightForearm =
          this._findBone(node, 'forearm_r') || this._findBone(node, 'lower_arm_r');
        if (rightForearm) {
          this._applyTransform(rightForearm, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'rightHandRotationX') {
        const rightHand = this._findBone(node, 'hand_r') || this._findBone(node, 'hand.r');
        if (rightHand) {
          this._applyTransform(rightHand, key, value);
          appliedKeys.add(key);
        }
      }

      // Left leg transforms
      else if (key === 'leftLegRotationZ') {
        const leftLeg = this._findBone(node, 'leg_l') || this._findBone(node, 'upper_leg_l');
        if (leftLeg) {
          this._applyTransform(leftLeg, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'leftFootRotationX') {
        const leftFoot = this._findBone(node, 'foot_l') || this._findBone(node, 'foot.l');
        if (leftFoot) {
          this._applyTransform(leftFoot, key, value);
          appliedKeys.add(key);
        }
      }

      // Right leg transforms
      else if (key === 'rightLegRotationZ') {
        const rightLeg = this._findBone(node, 'leg_r') || this._findBone(node, 'upper_leg_r');
        if (rightLeg) {
          this._applyTransform(rightLeg, key, value);
          appliedKeys.add(key);
        }
      } else if (key === 'rightFootRotationX') {
        const rightFoot = this._findBone(node, 'foot_r') || this._findBone(node, 'foot.r');
        if (rightFoot) {
          this._applyTransform(rightFoot, key, value);
          appliedKeys.add(key);
        }
      }
    }

    // NOTE: We deliberately skip any unhandled keys to avoid applying
    // arbitrary transforms to the root node, which causes tilting
  }

  /**
   * Find a bone by name in the model hierarchy
   * Uses more specific matching to avoid cross-matching different bones
   * @private
   */
  _findBone(node, boneName) {
    // Exact match first
    if (node.name === boneName) return node;

    // Case-insensitive exact match
    if (node.name && node.name.toLowerCase() === boneName.toLowerCase()) {
      return node;
    }

    // For specific named searches, use stricter matching
    if (node.name && boneName) {
      const lowerName = boneName.toLowerCase();
      const lowerNodeName = node.name.toLowerCase();

      // Only match if the bone name is contained AND it's a word boundary
      // This prevents "leg" from matching "headleg"
      const wordBoundaryPattern = new RegExp(`(^|[._\\-])${lowerName}([._\\-]|$|\\d)`);

      if (wordBoundaryPattern.test(lowerNodeName)) {
        return node;
      }

      // Also check with common prefixes stripped
      const cleanedNodeName = lowerNodeName
        .replace(/^(armature|skeleton|rig|mixamorig)[._\-]*/i, '')
        .replace(/[._\-]+/g, '');
      const cleanedSearchName = lowerName.replace(/[._\-]+/g, '');

      if (cleanedNodeName === cleanedSearchName) {
        return node;
      }

      // Handle left/right variants
      const leftVariants = [lowerName + '_l', lowerName + '.l', lowerName + 'left'];
      const rightVariants = [lowerName + '_r', lowerName + '.r', lowerName + 'right'];

      if (
        leftVariants.some((v) => lowerNodeName.includes(v)) ||
        rightVariants.some((v) => lowerNodeName.includes(v))
      ) {
        return node;
      }
    }

    // Recursively search children
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
    if (!bone) return;

    // Use more conservative amplification to avoid extreme rotations
    const amplify = (v, factor) => v * factor;

    const bind = bone.userData.bindRotation;

    try {
      switch (property) {
        // Head transforms
        case 'headRotationY':
          bone.rotation.y = bind.y + amplify(value, 1.0); // Reduced from 2
          break;
        case 'headRotationX':
          bone.rotation.x = bind.x + amplify(value, 1.0); // Reduced from 2
          break;
        case 'headTiltZ':
          bone.rotation.z = bind.z + amplify(value, 0.8); // Reduced from 1.5
          break;
        case 'headSwayX':
          // Only apply position to head bone, not root
          if (bone.position && bone.isGroup !== true) {
            try {
              bone.position.x = amplify(value, 0.05); // Reduced from 0.1
            } catch (e) {}
          }
          break;
        case 'headSwayZ':
          if (bone.position && bone.isGroup !== true) {
            try {
              bone.position.z = bind.z + amplify(value, 0.05); // Reduced from 0.1
            } catch (e) {}
          }
          break;

        // Eye transforms
        case 'eyeLookX':
          bone.rotation.y = bind.y - amplify(value, 0.8);
          break;
        case 'eyeLookY':
          bone.rotation.x = bind.x + amplify(value, 0.8);
          break;
        case 'eyeBlinkIntensity':
          // Eye blink affects scale slightly
          bone.scale.y = 1.0 + amplify(value * 0.1, 0.5);
          break;

        // Breathing (chest scale)
        case 'breathingAmplitude':
          bone.scale.y = 1.0 + amplify(value, 0.05); // Reduced from 0.08
          break;

        // Shoulder (rotation)
        case 'shoulderSway':
          bone.rotation.z = bind.z + amplify(value, 0.3); // Reduced from 0.5
          break;

        // Left arm
        case 'leftArmRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.8); // Reduced from 1.5
          break;

        // Right arm
        case 'rightArmRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.8); // Reduced from 1.5
          break;

        // Left forearm
        case 'leftForearmRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.6); // Reduced from 1.2
          break;

        // Right forearm
        case 'rightForearmRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.6); // Reduced from 1.2
          break;

        // Left hand
        case 'leftHandRotationX':
          bone.rotation.x = bind.x + amplify(value, 0.4); // Reduced from 0.8
          break;

        // Right hand
        case 'rightHandRotationX':
          bone.rotation.x = bind.x + amplify(value, 0.4); // Reduced from 0.8
          break;

        // Left leg
        case 'leftLegRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.5); // Reduced from 1.0
          break;

        // Right leg
        case 'rightLegRotationZ':
          bone.rotation.z = bind.z + amplify(value, 0.5); // Reduced from 1.0
          break;

        // Left foot
        case 'leftFootRotationX':
          bone.rotation.x = bind.x + amplify(value, 0.3); // Reduced from 0.6
          break;

        // Right foot
        case 'rightFootRotationX':
          bone.rotation.x = bind.x + amplify(value, 0.3); // Reduced from 0.6
          break;

        default:
          // Ignore unknown properties
          break;
      }
    } catch (err) {
      // Silently ignore errors in transform application
    }
  }

  /**
   * Show skeleton bones as visual helpers
   * Hides the mesh and attaches bone lines and joints directly to bone nodes so they inherit transforms
   * @param {THREE.Group} model - The loaded model
   */
  showBones(model) {
    if (!model || this.bonesVisible) return;

    // Clear any previous bone visualizations
    this.boneLines = [];
    this.boneSpheres = [];

    // Hide all meshes to show only the skeleton
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Store original visibility state
        if (!this.meshVisibilityStates.has(node)) {
          this.meshVisibilityStates.set(node, node.visible);
        }
        // Hide the mesh
        node.visible = false;
      }
    });

    // Traverse the model and attach bone visualizations directly to bone nodes
    const createBoneVisualizations = (node) => {
      // Skip if this is a mesh (we only care about bones/joints)
      if (node instanceof THREE.Mesh) return;

      // Process children
      for (const child of node.children) {
        // Skip mesh nodes - we want to visualize bones/joints
        if (child instanceof THREE.Mesh) {
          continue;
        }

        // Create a line from parent to child
        // Line goes from parent (0,0,0) to child position in local space
        const distance = child.position.length();

        if (distance > 0.0001) {
          // Create bone line
          const positions = new Float32Array([
            0,
            0,
            0,
            child.position.x,
            child.position.y,
            child.position.z,
          ]);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2,
            depthTest: true,
            depthWrite: false,
          });
          const line = new THREE.Line(geometry, material);
          line.name = '__bone-line';
          line.renderOrder = 1;

          // Attach line to parent bone - this makes it inherit parent transforms
          node.add(line);
          this.boneLines.push(line);

          // Create joint sphere at the child position
          const sphereGeo = new THREE.SphereGeometry(0.015, 8, 8);
          const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            depthTest: true,
            depthWrite: false,
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.copy(child.position);
          sphere.name = '__bone-joint';
          sphere.renderOrder = 1;

          // Attach sphere to parent bone
          node.add(sphere);
          this.boneSpheres.push(sphere);
        }

        // Recursively process child bones
        createBoneVisualizations(child);
      }
    };

    createBoneVisualizations(model);
    this.boneHelpers.set(model, true); // Just mark as having bones
    this.bonesVisible = true;
  }

  /**
   * Hide skeleton bones visualization
   * Removes bones lines and joints from bone nodes and restores the model mesh visibility
   * @param {THREE.Group} model - The loaded model
   */
  hideBones(model) {
    if (!model || !this.bonesVisible) return;

    // Remove all bone lines from their parent bones
    for (const line of this.boneLines) {
      if (line.parent) {
        line.parent.remove(line);
      }
      line.geometry?.dispose();
      line.material?.dispose();
    }
    this.boneLines = [];

    // Remove all bone spheres from their parent bones
    for (const sphere of this.boneSpheres) {
      if (sphere.parent) {
        sphere.parent.remove(sphere);
      }
      sphere.geometry?.dispose();
      sphere.material?.dispose();
    }
    this.boneSpheres = [];

    // Restore mesh visibility
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        const originalVisibility = this.meshVisibilityStates.get(node);
        if (originalVisibility !== undefined) {
          node.visible = originalVisibility;
        } else {
          node.visible = true; // Default to visible if we don't have the original state
        }
      }
    });

    this.boneHelpers.delete(model);
    this.bonesVisible = false;
  }

  /**
   * Toggle the visibility of skeleton bones
   * @param {THREE.Group} model - The loaded model
   * @returns {boolean} The new visibility state
   */
  toggleBones(model) {
    if (this.bonesVisible) {
      this.hideBones(model);
      return false;
    } else {
      this.showBones(model);
      return true;
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

    // Clean up bone visualization if visible
    this.hideBones(model);

    // Clear material opacity states and mesh visibility states
    this.materialOpacityStates.clear();
    this.meshVisibilityStates.clear();

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
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Group();
    group.add(mesh);

    return group;
  }

  applyPose(model, pose) {
    // Apply pose with amplification so animation is visible
    if (pose.headRotationY !== undefined) {
      model.rotation.y = pose.headRotationY * 2; // Amplify by 2x
    }
    if (pose.headRotationX !== undefined) {
      model.rotation.x = pose.headRotationX * 2; // Amplify by 2x
    }
    if (pose.headSwayX !== undefined) {
      model.position.x = pose.headSwayX * 0.5; // Amplify sway
    }
    if (pose.headSwayZ !== undefined) {
      model.position.z = pose.headSwayZ * 0.5; // Amplify sway
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
