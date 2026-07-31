/**
 * Skeleton Adapter
 *
 * Provides a simple interface for working with the fixed humanoid skeleton.
 * Applies poses directly to the known bone structure.
 */

import * as THREE from 'three';
import createHumanoidSkeleton, {
  toggleSkeletonVisualization,
  createSimpleHumanoidMesh,
  applySkinToHumanoidMeshes,
  listHumanoidSkinPresets,
  toggleBodyMeshVisibility,
  removeBodyMeshes,
} from '../skeleton/skeletonBuilder';
import {
  attachGLTFMeshToSkeleton,
  removeGLTFMeshes,
  toggleGLTFMeshVisibility,
  setGLTFMeshVisibility,
} from '../skeleton/meshLoader';

/**
 * Base adapter interface
 */
export class AdapterInterface {
  /**
   * Create or load a model
   * @returns {Promise<THREE.Group>} Model group
   */
  async loadModel() {
    throw new Error('loadModel() must be implemented by subclass');
  }

  /**
   * Apply a pose to the model
   * @param {THREE.Group} model - The model
   * @param {Object} pose - Pose object with bone transforms
   */
  applyPose(model, pose) {
    throw new Error('applyPose() must be implemented by subclass');
  }

  /**
   * Toggle the visibility of skeleton bones
   * @param {THREE.Group} model - The model
   * @returns {boolean} The new visibility state
   */
  toggleBones(model) {
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
 * Skeleton Adapter
 * Works with the fixed humanoid skeleton
 */
export class SkeletonAdapter extends AdapterInterface {
  constructor(config = {}) {
    super();
    this.skin = config.skin || 'vigil';
    this.bonesVisible = false; // Start with bones hidden
    this.meshVisible = true; // Start with mesh visible
  }

  /**
   * Create the fixed skeleton
   */
  async loadModel() {
    const skeleton = createHumanoidSkeleton();
    this.setBonesVisible(skeleton, this.bonesVisible);
    return skeleton;
  }

  /**
   * Set skeleton visualization visibility
   * @param {THREE.Group} model - The skeleton
   * @param {boolean} visible - Whether to show bones
   * @returns {boolean} The applied visibility state
   */
  setBonesVisible(model, visible) {
    if (!model) return this.bonesVisible;
    this.bonesVisible = !!visible;
    toggleSkeletonVisualization(model, this.bonesVisible);
    return this.bonesVisible;
  }

  /**
   * Show skeleton visualization
   */
  showBones(model) {
    return this.setBonesVisible(model, true);
  }

  /**
   * Hide skeleton visualization
   */
  hideBones(model) {
    return this.setBonesVisible(model, false);
  }

  /**
   * Attach a humanoid mesh to the skeleton
   * @param {THREE.Group} model - The skeleton
   * @param {Object} options - Mesh options (color, etc.)
   * @returns {Array<THREE.Mesh>} Array of created meshes
   */
  attachMesh(model, options = {}) {
    if (!model) return [];

    // Remove existing meshes if any
    removeBodyMeshes(model);

    // Create and attach new meshes
    const meshOptions = { ...options };
    if (typeof meshOptions.skin === 'undefined' && typeof meshOptions.color === 'undefined') {
      meshOptions.skin = this.skin;
    }
    const meshes = createSimpleHumanoidMesh(model, meshOptions);
    if (meshOptions.skin) {
      this.skin = meshOptions.skin;
    }
    this.meshVisible = true;

    return meshes;
  }

  /**
   * Apply a skin preset or custom skin object to the humanoid mesh.
   * If no mesh exists yet, a mesh is attached automatically.
   */
  setSkin(model, skin) {
    if (!model) return false;
    this.skin = skin || this.skin;

    const applied = applySkinToHumanoidMeshes(model, this.skin);
    if (!applied) {
      this.attachMesh(model, { skin: this.skin });
    }

    this.meshVisible = true;
    return true;
  }

  /**
   * Returns available built-in skin presets.
   */
  getAvailableSkins() {
    return listHumanoidSkinPresets();
  }

  /**
   * Returns the current selected skin id/config.
   */
  getSkin() {
    return this.skin;
  }

  /**
   * Toggle body mesh visibility
   * @param {THREE.Group} model - The skeleton
   * @returns {boolean} The new visibility state
   */
  toggleMesh(model) {
    this.meshVisible = !this.meshVisible;
    toggleBodyMeshVisibility(model, this.meshVisible);
    toggleGLTFMeshVisibility(model);
    return this.meshVisible;
  }

  /**
   * Show or hide the body mesh
   * @param {THREE.Group} model - The skeleton
   * @param {boolean} visible - Whether to show the mesh
   */
  setMeshVisible(model, visible) {
    this.meshVisible = visible;
    toggleBodyMeshVisibility(model, visible);
    setGLTFMeshVisibility(model, visible);
  }

  /**
   * Attach a GLTF mesh to the skeleton
   * @param {THREE.Group} model - The skeleton
   * @param {string} url - URL to the GLTF/GLB file
   * @param {Object} options - Loading options (scale, position, rotation)
   * @returns {Promise<THREE.Group>} The loaded mesh group
   */
  async attachGLTFMesh(model, url, options = {}) {
    if (!model) return null;

    // Remove existing simple meshes if any
    removeBodyMeshes(model);

    // Load and attach GLTF mesh
    const mesh = await attachGLTFMeshToSkeleton(model, url, options);
    this.meshVisible = true;

    return mesh;
  }

  /**
   * Remove all GLTF meshes from the skeleton
   * @param {THREE.Group} model - The skeleton
   */
  removeGLTFMesh(model) {
    if (!model) return;
    removeGLTFMeshes(model);
    this.meshVisible = false;
  }

  /**
   * Toggle GLTF mesh visibility
   * @param {THREE.Group} model - The skeleton
   * @returns {boolean} The new visibility state
   */
  toggleGLTFMesh(model) {
    this.meshVisible = !this.meshVisible;
    toggleGLTFMeshVisibility(model);
    return this.meshVisible;
  }

  /**
   * Set GLTF mesh visibility
   * @param {THREE.Group} model - The skeleton
   * @param {boolean} visible - Whether to show the mesh
   */
  setGLTFMeshVisible(model, visible) {
    this.meshVisible = visible;
    setGLTFMeshVisibility(model, visible);
  }

  /**
   * Apply procedural pose to the skeleton
   */
  applyPose(model, pose) {
    if (!model || !pose) return;

    const bones = model.userData.bones;
    if (!bones) return;

    // Apply transforms to bones based on pose properties
    for (const [key, value] of Object.entries(pose)) {
      this._applyTransform(bones, key, value);
    }
  }

  /**
   * Apply transform to bones based on pose property
   * @private
   */
  _applyTransform(bones, property, value) {
    const getBind = (bone) => bone.userData.bindRotation;

    switch (property) {
      // Root model translation for patrol in/out behavior
      case 'modelPositionX':
        if (bones.hips?.parent) {
          bones.hips.parent.position.x = value;
        }
        break;
      case 'modelPositionY':
        if (bones.hips?.parent) {
          bones.hips.parent.position.y = value;
        }
        break;
      case 'modelPositionZ':
        if (bones.hips?.parent) {
          bones.hips.parent.position.z = value;
        }
        break;
      case 'modelRotationY':
        if (bones.hips?.parent) {
          bones.hips.parent.rotation.y = value;
        }
        break;

      // Head transforms
      case 'headRotationY':
        bones.head.rotation.y = getBind(bones.head).y + value;
        break;
      case 'headRotationX':
        bones.head.rotation.x = getBind(bones.head).x + value;
        break;
      case 'headTiltZ':
        bones.head.rotation.z = getBind(bones.head).z + value * 0.8;
        break;
      case 'headSwayX':
        bones.head.position.x = value * 0.05;
        break;
      case 'headSwayZ':
        bones.head.position.z = getBind(bones.head).z + value * 0.05;
        break;

      // Hips position shift (used for subtle weight shifts during idle)
      case 'hipsShiftX':
        if (bones.hips) bones.hips.position.x = (getBind(bones.hips).x || 0) + value * 0.1;
        break;

      // Breathing (chest scale)
      case 'breathingAmplitude':
        bones.chest.scale.y = 1.0 + value * 0.05;
        break;

      // Spine / chest tilt forward/back
      case 'spineRotationX':
        bones.chest.rotation.x = getBind(bones.chest).x + value;
        break;
      case 'spineRotationY':
        bones.chest.rotation.y = getBind(bones.chest).y + value;
        break;

      // Shoulder-like sway: operate on upper arms now that shoulders are removed
      case 'shoulderSway':
        bones.leftUpperArm.rotation.z = getBind(bones.leftUpperArm).z + value * 0.3;
        bones.rightUpperArm.rotation.z = getBind(bones.rightUpperArm).z - value * 0.3;
        break;

      // Left arm
      case 'leftArmRotationZ':
        bones.leftUpperArm.rotation.z = getBind(bones.leftUpperArm).z + value * 0.8;
        break;
      case 'leftArmRotationX':
        bones.leftUpperArm.rotation.x = getBind(bones.leftUpperArm).x + value * 0.8;
        break;
      case 'leftForearmRotationX':
        // Forearm bend: map to local Y rotation to produce a forward flex
        // (avoids twisting around the bone axis). Use a positive multiplier.
        bones.leftForearm.rotation.y = getBind(bones.leftForearm).y + value * 1.2;
        break;
      case 'leftHandRotationX':
        bones.leftHand.rotation.x = getBind(bones.leftHand).x + value * 0.4;
        break;

      // Right arm
      case 'rightArmRotationZ':
        bones.rightUpperArm.rotation.z = getBind(bones.rightUpperArm).z + value * 0.8;
        break;
      case 'rightArmRotationX':
        bones.rightUpperArm.rotation.x = getBind(bones.rightUpperArm).x + value * 0.8;
        break;
      case 'rightForearmRotationX':
        // Forearm bend: invert sign so right forearm flexes in the same visual
        // direction as the left forearm (relative to the avatar forward).
        bones.rightForearm.rotation.y = getBind(bones.rightForearm).y - value * 1.2;
        break;
      case 'rightHandRotationX':
        bones.rightHand.rotation.x = getBind(bones.rightHand).x + value * 0.4;
        break;

      // Left leg
      case 'leftLegRotationZ':
        bones.leftUpperLeg.rotation.z = getBind(bones.leftUpperLeg).z + value * 0.5;
        break;
      case 'leftLegRotationX':
        bones.leftUpperLeg.rotation.x = getBind(bones.leftUpperLeg).x + value * 0.5;
        break;
      case 'leftLowerLegRotationX':
        bones.leftLowerLeg.rotation.x = getBind(bones.leftLowerLeg).x + value * 0.8;
        break;
      case 'leftFootRotationX':
        bones.leftFoot.rotation.x = getBind(bones.leftFoot).x + value * 0.3;
        break;

      // Right leg
      case 'rightLegRotationZ':
        bones.rightUpperLeg.rotation.z = getBind(bones.rightUpperLeg).z + value * 0.5;
        break;
      case 'rightLegRotationX':
        bones.rightUpperLeg.rotation.x = getBind(bones.rightUpperLeg).x + value * 0.5;
        break;
      case 'rightLowerLegRotationX':
        bones.rightLowerLeg.rotation.x = getBind(bones.rightLowerLeg).x + value * 0.8;
        break;
      case 'rightFootRotationX':
        bones.rightFoot.rotation.x = getBind(bones.rightFoot).x + value * 0.3;
        break;
    }
  }

  /**
   * Toggle skeleton visualization
   * @param {THREE.Group} model - The skeleton
   * @returns {boolean} The new visibility state
   */
  toggleBones(model) {
    return this.setBonesVisible(model, !this.bonesVisible);
  }

  /**
   * Cleanup resources
   */
  dispose(model) {
    if (!model) return;

    // Remove body meshes
    removeBodyMeshes(model);

    // Remove GLTF meshes
    removeGLTFMeshes(model);

    // Dispose geometries and materials
    model.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Line) {
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

export default SkeletonAdapter;
