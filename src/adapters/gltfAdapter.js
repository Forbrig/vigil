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
    this.bonesVisible = true; // Start with bones visible
    this.meshVisible = false; // Start with mesh hidden
  }

  /**
   * Create the fixed skeleton
   */
  async loadModel() {
    const skeleton = createHumanoidSkeleton();
    return skeleton;
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
    const meshes = createSimpleHumanoidMesh(model, options);
    this.meshVisible = true;

    return meshes;
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

      // Breathing (chest scale)
      case 'breathingAmplitude':
        bones.chest.scale.y = 1.0 + value * 0.05;
        break;

      // Shoulder transforms
      case 'shoulderSway':
        bones.leftShoulder.rotation.z = getBind(bones.leftShoulder).z + value * 0.3;
        bones.rightShoulder.rotation.z = getBind(bones.rightShoulder).z - value * 0.3;
        break;

      // Left arm
      case 'leftArmRotationZ':
        bones.leftUpperArm.rotation.z = getBind(bones.leftUpperArm).z + value * 0.8;
        break;
      case 'leftForearmRotationZ':
        bones.leftForearm.rotation.z = getBind(bones.leftForearm).z + value * 0.6;
        break;
      case 'leftHandRotationX':
        bones.leftHand.rotation.x = getBind(bones.leftHand).x + value * 0.4;
        break;

      // Right arm
      case 'rightArmRotationZ':
        bones.rightUpperArm.rotation.z = getBind(bones.rightUpperArm).z + value * 0.8;
        break;
      case 'rightForearmRotationZ':
        bones.rightForearm.rotation.z = getBind(bones.rightForearm).z + value * 0.6;
        break;
      case 'rightHandRotationX':
        bones.rightHand.rotation.x = getBind(bones.rightHand).x + value * 0.4;
        break;

      // Left leg
      case 'leftLegRotationZ':
        bones.leftUpperLeg.rotation.z = getBind(bones.leftUpperLeg).z + value * 0.5;
        break;
      case 'leftFootRotationX':
        bones.leftFoot.rotation.x = getBind(bones.leftFoot).x + value * 0.3;
        break;

      // Right leg
      case 'rightLegRotationZ':
        bones.rightUpperLeg.rotation.z = getBind(bones.rightUpperLeg).z + value * 0.5;
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
    this.bonesVisible = !this.bonesVisible;
    toggleSkeletonVisualization(model, this.bonesVisible);
    return this.bonesVisible;
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
