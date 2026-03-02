import { describe, it, expect, beforeEach } from 'vitest';
import { SkeletonAdapter, AdapterInterface } from '../../src/adapters/gltfAdapter';
import * as THREE from 'three';

describe('Adapters', () => {
  describe('AdapterInterface', () => {
    it('should be a base interface', async () => {
      const adapter = new AdapterInterface();

      // loadModel is async, so it should reject
      await expect(adapter.loadModel()).rejects.toThrow();

      // applyPose throws synchronously
      expect(() => adapter.applyPose({}, {})).toThrow();
    });
  });

  describe('SkeletonAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new SkeletonAdapter();
    });

    it('should create a fixed skeleton', async () => {
      const skeleton = await adapter.loadModel();

      expect(skeleton).toBeInstanceOf(THREE.Group);
      expect(skeleton.name).toBe('SkeletonRoot');
      expect(skeleton.userData.bones).toBeDefined();
    });

    it('should have all required bones', async () => {
      const skeleton = await adapter.loadModel();
      const bones = skeleton.userData.bones;

      // Check for key bones
      expect(bones.hips).toBeDefined();
      expect(bones.spine).toBeDefined();
      expect(bones.chest).toBeDefined();
      expect(bones.neck).toBeDefined();
      expect(bones.head).toBeDefined();
      expect(bones.leftUpperArm).toBeDefined();
      expect(bones.rightUpperArm).toBeDefined();
      expect(bones.leftUpperLeg).toBeDefined();
      expect(bones.rightUpperLeg).toBeDefined();
    });

    it('should apply pose to skeleton bones', async () => {
      const skeleton = await adapter.loadModel();
      const bones = skeleton.userData.bones;
      const initialHeadRotationY = bones.head.rotation.y;

      adapter.applyPose(skeleton, { headRotationY: 0.5 });

      expect(bones.head.rotation.y).not.toBe(initialHeadRotationY);
    });

    it('should apply arm transforms', async () => {
      const skeleton = await adapter.loadModel();
      const bones = skeleton.userData.bones;
      const initialLeftArmRotation = bones.leftUpperArm.rotation.z;

      adapter.applyPose(skeleton, { leftArmRotationZ: 0.3 });

      expect(bones.leftUpperArm.rotation.z).not.toBe(initialLeftArmRotation);
    });

    it('should apply leg transforms', async () => {
      const skeleton = await adapter.loadModel();
      const bones = skeleton.userData.bones;
      const initialLeftLegRotation = bones.leftUpperLeg.rotation.z;

      adapter.applyPose(skeleton, { leftLegRotationZ: 0.2 });

      expect(bones.leftUpperLeg.rotation.z).not.toBe(initialLeftLegRotation);
    });

    it('should toggle skeleton visualization', async () => {
      const skeleton = await adapter.loadModel();
      const initialVisibility = skeleton.userData.visualizationVisible;

      const newState = adapter.toggleBones(skeleton);

      expect(newState).not.toBe(initialVisibility);
    });

    it('should dispose of resources', async () => {
      const skeleton = await adapter.loadModel();

      // Should not throw
      expect(() => adapter.dispose(skeleton)).not.toThrow();
    });

    it('should handle null model gracefully', () => {
      expect(() => adapter.applyPose(null, {})).not.toThrow();
    });

    it('should handle empty pose gracefully', async () => {
      const skeleton = await adapter.loadModel();

      expect(() => adapter.applyPose(skeleton, {})).not.toThrow();
    });

    it('should have bind pose stored for each bone', async () => {
      const skeleton = await adapter.loadModel();
      const bones = skeleton.userData.bones;

      // Check that bind poses are stored
      expect(bones.head.userData.bindRotation).toBeDefined();
      expect(bones.head.userData.bindPosition).toBeDefined();
      expect(bones.head.userData.bindScale).toBeDefined();
    });

    it('should attach body mesh to skeleton', async () => {
      const skeleton = await adapter.loadModel();

      const meshes = adapter.attachMesh(skeleton);

      expect(Array.isArray(meshes)).toBe(true);
      expect(meshes.length).toBeGreaterThan(0);
      expect(skeleton.userData.bodyMeshes).toBeDefined();
    });

    it('should toggle mesh visibility', async () => {
      const skeleton = await adapter.loadModel();
      adapter.attachMesh(skeleton);

      const initialState = adapter.meshVisible;
      const newState = adapter.toggleMesh(skeleton);

      expect(newState).not.toBe(initialState);
    });

    it('should set mesh visibility', async () => {
      const skeleton = await adapter.loadModel();
      adapter.attachMesh(skeleton);

      adapter.setMeshVisible(skeleton, false);
      expect(adapter.meshVisible).toBe(false);

      adapter.setMeshVisible(skeleton, true);
      expect(adapter.meshVisible).toBe(true);
    });

    it('should create meshes with custom color', async () => {
      const skeleton = await adapter.loadModel();
      const customColor = 0xff9999;

      const meshes = adapter.attachMesh(skeleton, { color: customColor });

      expect(meshes.length).toBeGreaterThan(0);
      // Check that at least one mesh has the custom color
      const firstMesh = meshes[0];
      expect(firstMesh.material.color.getHex()).toBe(customColor);
    });
  });
});
