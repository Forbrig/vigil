import { describe, it, expect, beforeEach } from 'vitest';
import { GLTFAdapter, MockAdapter, AdapterInterface } from '../../src/adapters/gltfAdapter';
import * as THREE from 'three';

describe('Adapters', () => {
  describe('AdapterInterface', () => {
    it('should be a base interface', async () => {
      const adapter = new AdapterInterface();
      
      // loadModel is async, so it should reject
      await expect(adapter.loadModel('url')).rejects.toThrow();
      
      // applyPose throws synchronously
      expect(() => adapter.applyPose({}, {})).toThrow();
    });
  });

  describe('MockAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new MockAdapter();
    });

    it('should load a placeholder model asynchronously', async () => {
      const model = await adapter.loadModel('test.glb');

      expect(model).toBeInstanceOf(THREE.Group);
      expect(model.children.length).toBeGreaterThan(0);
    });

    it('should return a mesh as the first child', async () => {
      const model = await adapter.loadModel('test.glb');
      const firstChild = model.children[0];

      expect(firstChild).toBeInstanceOf(THREE.Mesh);
    });

    it('should apply pose to model', async () => {
      const model = await adapter.loadModel('test.glb');
      const initialRotationY = model.rotation.y;

      adapter.applyPose(model, { headRotationY: 0.5 });

      expect(model.rotation.y).not.toBe(initialRotationY);
      expect(model.rotation.y).toBe(0.5);
    });

    it('should apply sway to model position', async () => {
      const model = await adapter.loadModel('test.glb');

      adapter.applyPose(model, { headSwayX: 0.3 });

      expect(model.position.x).toBe(0.3);
    });

    it('should dispose of resources', async () => {
      const model = await adapter.loadModel('test.glb');

      // Should not throw
      expect(() => adapter.dispose(model)).not.toThrow();
    });

    it('should handle null model gracefully', () => {
      expect(() => adapter.applyPose(null, {})).not.toThrow();
    });

    it('should handle empty pose gracefully', async () => {
      const model = await adapter.loadModel('test.glb');

      expect(() => adapter.applyPose(model, {})).not.toThrow();
    });
  });

  describe('GLTFAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new GLTFAdapter();
    });

    it('should create loader instance', () => {
      expect(adapter.loader).toBeDefined();
      expect(adapter.cache).toBeDefined();
      expect(adapter.cache.size).toBe(0);
    });

    it('should have cache mechanism', () => {
      expect(adapter.cache instanceof Map).toBe(true);
    });

    it('should have mixer tracking', () => {
      expect(adapter.mixers instanceof Map).toBe(true);
    });

    it('should dispose mixer if it exists', () => {
      const model = new THREE.Group();
      const mockMixer = { stopAllAction: () => {} };

      adapter.mixers.set(model, mockMixer);
      adapter.dispose(model);

      expect(adapter.mixers.has(model)).toBe(false);
    });

    it('should traverse and dispose geometries', () => {
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geom, mat);
      const group = new THREE.Group();
      group.add(mesh);

      const geometryDisposeSpy = { called: false };
      const materialDisposeSpy = { called: false };

      geom.dispose = () => {
        geometryDisposeSpy.called = true;
      };
      mat.dispose = () => {
        materialDisposeSpy.called = true;
      };

      adapter.dispose(group);

      expect(geometryDisposeSpy.called).toBe(true);
      expect(materialDisposeSpy.called).toBe(true);
    });
  });

  describe('Bone Finding', () => {
    let adapter;

    beforeEach(() => {
      adapter = new GLTFAdapter();
    });

    it('should find bone by name in hierarchy', () => {
      const root = new THREE.Group();
      const parent = new THREE.Group();
      parent.name = 'Parent';
      const child = new THREE.Group();
      child.name = 'Target';

      root.add(parent);
      parent.add(child);

      const found = adapter._findBone(root, 'Target');
      expect(found).toBe(child);
    });

    it('should return null if bone not found', () => {
      const root = new THREE.Group();
      const found = adapter._findBone(root, 'NonExistent');
      expect(found).toBeNull();
    });

    it('should find bone at root level', () => {
      const root = new THREE.Group();
      root.name = 'Root';

      const found = adapter._findBone(root, 'Root');
      expect(found).toBe(root);
    });
  });
});
