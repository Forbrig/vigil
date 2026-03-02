/**
 * Mesh Loader Utility
 *
 * Loads mesh geometry from GLTF models and attaches them to our fixed skeleton.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Load a GLTF model and extract its mesh
 * @param {string} url - URL to the GLTF/GLB file
 * @returns {Promise<THREE.Group>} - Group containing the loaded mesh
 */
export async function loadGLTFMesh(url) {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        resolve(gltf.scene);
      },
      (progress) => {
        console.log(`Loading: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('Error loading GLTF:', error);
        reject(error);
      }
    );
  });
}

/**
 * Extract all meshes from a loaded GLTF scene
 * @param {THREE.Group} scene - Loaded GLTF scene
 * @returns {THREE.Mesh[]} - Array of meshes
 */
export function extractMeshes(scene) {
  const meshes = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

/**
 * Attach a GLTF mesh to our fixed skeleton as a rigid body
 * @param {THREE.Object3D} skeleton - Our fixed skeleton root
 * @param {string} url - URL to the GLTF/GLB file
 * @param {Object} options - Configuration options
 * @returns {Promise<THREE.Group>} - The attached mesh group
 */
export async function attachGLTFMeshToSkeleton(skeleton, url, options = {}) {
  const {
    scale = 0.01,
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 },
  } = options;

  try {
    // Load the GLTF model
    const scene = await loadGLTFMesh(url);

    console.log('Loaded GLTF scene:', scene);
    console.log('Scene has', scene.children.length, 'children');

    // Create a new container
    const container = new THREE.Group();
    container.name = 'gltf-mesh-container';

    // Process all meshes
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        console.log('Found SkinnedMesh:', child.name, child.type);
        console.log('  Position:', child.position);
        console.log('  Scale:', child.scale);
        console.log('  Rotation:', child.rotation);

        // Clone the geometry - it's already in bind pose
        const geometry = child.geometry.clone();

        // Compute bounds
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        console.log('  Vertices:', geometry.attributes.position.count);
        console.log('  Bounding box:', geometry.boundingBox);

        // Clone material and disable skinning
        let material;
        if (child.material) {
          if (Array.isArray(child.material)) {
            material = child.material.map((m) => {
              const mat = m.clone();
              mat.skinning = false;
              mat.transparent = false;
              mat.opacity = 1.0;
              return mat;
            });
          } else {
            material = child.material.clone();
            material.skinning = false;
            material.transparent = false;
            material.opacity = 1.0;
          }
        } else {
          material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          });
        }

        // Create regular mesh (NOT skinned)
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = child.name || 'mesh';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = true;

        // Copy transforms from original
        mesh.position.copy(child.position);
        mesh.rotation.copy(child.rotation);
        mesh.scale.copy(child.scale);

        container.add(mesh);
        console.log('✓ Added mesh:', mesh.name);
      } else if (child instanceof THREE.Mesh) {
        console.log('Found regular Mesh:', child.name, child.type);
        const meshClone = child.clone();
        meshClone.visible = true;
        container.add(meshClone);
        console.log('✓ Added regular mesh:', child.name);
      }
    });

    console.log('Container has', container.children.length, 'meshes');

    // Apply transformations to container
    container.scale.set(scale, scale, scale);
    container.position.set(position.x, position.y, position.z);
    container.rotation.set(rotation.x, rotation.y, rotation.z);
    container.visible = true;

    console.log('Container scale:', container.scale);
    console.log('Container position:', container.position);
    console.log('Container visible:', container.visible);

    // Attach to the hips bone
    const hips = skeleton.userData.bones?.hips || skeleton;
    hips.add(container);

    console.log('Attached container to:', hips.name || 'skeleton');

    // Store reference for visibility toggling
    if (!skeleton.userData.gltfMeshes) {
      skeleton.userData.gltfMeshes = [];
    }

    skeleton.userData.gltfMeshes.push({
      container: container,
    });

    console.log(`Attached GLTF mesh from ${url} to skeleton`);
    return container;
  } catch (error) {
    console.error('Failed to attach GLTF mesh:', error);
    throw error;
  }
}

/**
 * Remove all GLTF meshes from the skeleton
 * @param {THREE.Object3D} skeleton - The skeleton root
 */
export function removeGLTFMeshes(skeleton) {
  if (skeleton.userData.gltfMeshes) {
    skeleton.userData.gltfMeshes.forEach((meshData) => {
      const mesh = meshData.container || meshData;
      mesh.parent?.remove(mesh);
      // Dispose of geometries and materials
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });
    skeleton.userData.gltfMeshes = [];
  }
}

/**
 * Toggle visibility of GLTF meshes
 * @param {THREE.Object3D} skeleton - The skeleton root
 * @returns {boolean} - New visibility state
 */
export function toggleGLTFMeshVisibility(skeleton) {
  if (skeleton.userData.gltfMeshes && skeleton.userData.gltfMeshes.length > 0) {
    const firstMesh = skeleton.userData.gltfMeshes[0].container || skeleton.userData.gltfMeshes[0];
    const currentVisibility = firstMesh.visible;
    const newVisibility = !currentVisibility;

    skeleton.userData.gltfMeshes.forEach((meshData) => {
      const mesh = meshData.container || meshData;
      mesh.visible = newVisibility;
    });

    return newVisibility;
  }
  return false;
}

/**
 * Set visibility of GLTF meshes
 * @param {THREE.Object3D} skeleton - The skeleton root
 * @param {boolean} visible - Whether meshes should be visible
 */
export function setGLTFMeshVisibility(skeleton, visible) {
  if (skeleton.userData.gltfMeshes) {
    skeleton.userData.gltfMeshes.forEach((meshData) => {
      const container = meshData.container || meshData;
      container.visible = visible;
    });
  }
}
