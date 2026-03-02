# Skinned Mesh Research & Implementation

## Overview

Research on attaching a mesh (skin) to a skeleton in Three.js for deformable character animation.

## Common Approach: THREE.SkinnedMesh

### What is Skinned Mesh Animation?

Skinned mesh (also called skeletal animation or rigging) is the industry-standard approach for character animation:

1. **Skeleton**: Hierarchical bone structure that defines the character's pose
2. **Skin/Mesh**: The visible geometry (vertices, faces) that represents the character's surface
3. **Skinning/Binding**: Each vertex is influenced by one or more bones with weights
4. **Deformation**: When bones move, vertices follow based on their bone influences

### Three.js Implementation

Three.js provides built-in support through:

- **`THREE.Bone`**: Specialized object for skeleton bones (extends Object3D)
- **`THREE.Skeleton`**: Container that manages bones and computes matrices
- **`THREE.SkinnedMesh`**: Mesh that deforms based on skeleton
- **Skin Attributes**: `skinIndex` and `skinWeight` vertex attributes

## Current Implementation Analysis

### What We Have

✅ Hierarchical bone structure (`createBoneHierarchy()`)
✅ Bone transformations (rotation, position, scale)
✅ Bone visualization (lines and joints)
✅ Animation system (procedural behavior generator)

### What's Missing

❌ Using `THREE.Bone` instead of `THREE.Object3D`
❌ `THREE.Skeleton` instance
❌ `THREE.SkinnedMesh` with proper binding
❌ Vertex-to-bone weight assignments

## Implementation Options

### Option 1: Full SkinnedMesh (Industry Standard)

**Pros:**

- Industry standard approach
- Supports complex deformations
- Works with any geometry
- Compatible with GLTF/FBX imports
- Smooth vertex deformations

**Cons:**

- Requires vertex weight painting/assignment
- More complex setup
- Higher computational cost
- Need proper UV mapping

**Use Case:** Production-quality character animation

### Option 2: Rigid Body Attachments (Simpler)

**Pros:**

- Very simple implementation
- Low computational cost
- Easy to understand
- Good for segmented characters

**Cons:**

- No smooth deformations
- Limited to rigid body parts
- Visible seams at joints
- Not suitable for organic characters

**Use Case:** Robots, toys, stylized low-poly characters

### Option 3: Hybrid Approach (Recommended)

**Pros:**

- Start simple with rigid attachments
- Can upgrade to skinned mesh later
- Progressive enhancement
- Flexible for different character types

**Cons:**

- May need refactoring later
- Two code paths to maintain

**Use Case:** Our current project - start simple, add complexity as needed

## Recommended Approach

### Phase 1: Rigid Body Attachments (Immediate)

Attach meshes as children of bones - each mesh follows a single bone rigidly:

```js
// Attach head mesh to head bone
bones.head.add(headMesh);

// Attach torso mesh to spine bone
bones.spine.add(torsoMesh);
```

**Benefits:**

- Simple to implement NOW
- Works with current Object3D bones
- No weight painting needed
- Good for testing and prototyping

### Phase 2: Simple Skinned Mesh (Future)

Convert to THREE.Bone and implement simple automatic weighting:

```js
// Convert existing bones to THREE.Bone
const skeleton = new THREE.Skeleton(bonesArray);

// Create skinned mesh with automatic weights
const skinnedMesh = createSkinnedHumanoid(geometry, skeleton);
```

**Benefits:**

- Smooth deformations at joints
- Industry-standard approach
- Better for organic characters

### Phase 3: Advanced Skinning (Optional)

Add weight painting tools and support for custom geometries:

```js
// Load custom character with pre-painted weights
const character = await loadCharacterWithWeights(url);
```

## Implementation Plan

### Immediate Implementation (This PR)

1. Create `attachRigidMesh()` function
   - Attach mesh to specific bone
   - Support for multiple mesh segments
   - Automatic cleanup

2. Create `createSimpleHumanoidMesh()` helper
   - Generate basic humanoid geometry
   - Split into body segments
   - Attach to appropriate bones

3. Add mesh visibility controls
   - Toggle between skeleton and mesh view
   - Show both simultaneously (for debugging)

### Future Enhancements

1. Convert to THREE.Bone
2. Implement THREE.Skeleton
3. Add automatic weight calculation
4. Support custom geometry loading
5. Add weight painting tools

## Code Examples

### Current Approach (Rigid)

```js
export function attachRigidMeshToBone(bone, mesh) {
  bone.add(mesh);
  return mesh;
}

export function createSimpleHumanoid(skeleton) {
  const bones = skeleton.userData.bones;

  // Head
  const headGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.05, 0);
  bones.head.add(headMesh);

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.3, 0.4, 0.2);
  const torsoMesh = new THREE.Mesh(torsoGeo, headMat);
  bones.spine.add(torsoMesh);

  // Arms, legs, etc...
}
```

### Future Approach (Skinned)

```js
export function createSkinnedHumanoid(skeleton) {
  // Convert to THREE.Bone if needed
  const bonesArray = convertToBones(skeleton);
  const threeSkeleton = new THREE.Skeleton(bonesArray);

  // Create geometry with skin attributes
  const geometry = createHumanoidGeometry();
  computeAutoWeights(geometry, bonesArray);

  // Create skinned mesh
  const material = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
  skinnedMesh.bind(threeSkeleton);

  return skinnedMesh;
}
```

## Conclusion

**For immediate implementation**, we should use **rigid body attachments** because:

1. ✅ Works with current bone system (no refactoring needed)
2. ✅ Simple to implement and understand
3. ✅ Good for testing and visualization
4. ✅ Low computational cost
5. ✅ Can be upgraded to skinned mesh later

We can add a placeholder for skinned mesh and implement it when needed for smooth organic deformations.

## References

- [Three.js SkinnedMesh Documentation](https://threejs.org/docs/#api/en/objects/SkinnedMesh)
- [Three.js Skeleton Documentation](https://threejs.org/docs/#api/en/objects/Skeleton)
- [Three.js Bone Documentation](https://threejs.org/docs/#api/en/objects/Bone)
- [Three.js Skinning Example](https://threejs.org/examples/#webgl_animation_skinning_blending)
