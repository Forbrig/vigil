/**
 * Skeleton Builder
 *
 * Creates a fixed humanoid skeleton structure with proper bone hierarchy.
 * The skeleton can be visualized and animated without needing to load external models.
 */

import * as THREE from 'three';

/**
 * Create a fixed humanoid skeleton with standard bone structure
 * @returns {THREE.Group} Root group containing the skeleton
 */
export function createHumanoidSkeleton() {
  const root = new THREE.Group();
  root.name = 'SkeletonRoot';

  // Create bones with proper hierarchy
  const bones = createBoneHierarchy();

  // Add bones to root
  root.add(bones.hips);

  // Store bone references for easy access
  root.userData.bones = bones;

  // Create visual representation
  createSkeletonVisualization(bones, root);

  return root;
}

/**
 * Create the bone hierarchy
 * @private
 */
function createBoneHierarchy() {
  // Define bone positions and create bone objects
  const bones = {};

  // Hips (root)
  bones.hips = createBone('hips', new THREE.Vector3(0, 0, 0));

  // Spine - torso segments that stack vertically
  bones.spine = createBone('spine', new THREE.Vector3(0, 0.1, 0)); // 0.1 tall
  bones.chest = createBone('chest', new THREE.Vector3(0, 0.15, 0)); // 0.15 tall
  bones.neck = createBone('neck', new THREE.Vector3(0, 0.15, 0)); // 0.15 tall - same height as shoulders!
  bones.head = createBone('head', new THREE.Vector3(0, 0.12, 0)); // 0.12 tall

  // Build spine hierarchy
  bones.hips.add(bones.spine);
  bones.spine.add(bones.chest);
  bones.chest.add(bones.neck);
  bones.neck.add(bones.head);

  // Left arm - attach upper arm directly to chest (no separate shoulder bone)
  // Rotate upper arms so they hang down beside the torso (pointing -Y)
  bones.leftUpperArm = createBone(
    'upper_arm_l',
    new THREE.Vector3(-0.16, 0.12, 0),
    new THREE.Euler(0, 0, Math.PI / 2)
  );
  // Position forearm and hand along the local X axis so they follow upper-arm rotation
  bones.leftForearm = createBone('forearm_l', new THREE.Vector3(-0.18, 0, 0));
  bones.leftHand = createBone('hand_l', new THREE.Vector3(-0.12, 0, 0));

  bones.chest.add(bones.leftUpperArm);
  bones.leftUpperArm.add(bones.leftForearm);
  bones.leftForearm.add(bones.leftHand);

  // Right arm - attach upper arm directly to chest
  bones.rightUpperArm = createBone(
    'upper_arm_r',
    new THREE.Vector3(0.16, 0.12, 0),
    new THREE.Euler(0, 0, -Math.PI / 2)
  );
  bones.rightForearm = createBone('forearm_r', new THREE.Vector3(0.18, 0, 0));
  bones.rightHand = createBone('hand_r', new THREE.Vector3(0.12, 0, 0));

  bones.chest.add(bones.rightUpperArm);
  bones.rightUpperArm.add(bones.rightForearm);
  bones.rightForearm.add(bones.rightHand);

  // Left leg
  bones.leftUpperLeg = createBone('upper_leg_l', new THREE.Vector3(-0.08, -0.02, 0));
  bones.leftLowerLeg = createBone('lower_leg_l', new THREE.Vector3(0, -0.2, 0));
  bones.leftFoot = createBone('foot_l', new THREE.Vector3(0, -0.18, 0));

  bones.hips.add(bones.leftUpperLeg);
  bones.leftUpperLeg.add(bones.leftLowerLeg);
  bones.leftLowerLeg.add(bones.leftFoot);

  // Right leg
  bones.rightUpperLeg = createBone('upper_leg_r', new THREE.Vector3(0.08, -0.02, 0));
  bones.rightLowerLeg = createBone('lower_leg_r', new THREE.Vector3(0, -0.2, 0));
  bones.rightFoot = createBone('foot_r', new THREE.Vector3(0, -0.18, 0));

  bones.hips.add(bones.rightUpperLeg);
  bones.rightUpperLeg.add(bones.rightLowerLeg);
  bones.rightLowerLeg.add(bones.rightFoot);

  return bones;
}

/**
 * Create a single bone object
 * @private
 */
function createBone(name, position, rotationEuler = null) {
  const bone = new THREE.Object3D();
  bone.name = name;
  bone.position.copy(position);

  // Apply an initial rotation if provided (useful to set a relaxed pose)
  if (rotationEuler) {
    bone.rotation.copy(rotationEuler);
  }

  // Store bind pose for animation
  bone.userData.bindRotation = bone.rotation.clone();
  bone.userData.bindPosition = bone.position.clone();
  bone.userData.bindScale = bone.scale.clone();

  return bone;
}

/**
 * Create visual representation of the skeleton
 * @private
 */
function createSkeletonVisualization(bones, root) {
  const visualGroup = new THREE.Group();
  visualGroup.name = 'SkeletonVisualization';

  // Create lines connecting bones
  const lines = [];
  const joints = [];

  // Helper function to create a line between parent and child
  const createBoneLine = (parent, child) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      0,
      0,
      0, // Start at parent's local origin
      child.position.x,
      child.position.y,
      child.position.z, // End at child's position
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, material);
    line.name = '__bone-line';
    parent.add(line);
    lines.push(line);

    // Create joint sphere at child position
    const sphereGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(child.position);
    sphere.name = '__bone-joint';
    parent.add(sphere);
    joints.push(sphere);
  };

  // Create visualization for each bone connection
  // Spine
  createBoneLine(bones.hips, bones.spine);
  createBoneLine(bones.spine, bones.chest);
  createBoneLine(bones.chest, bones.neck);
  createBoneLine(bones.neck, bones.head);

  // Left arm
  createBoneLine(bones.chest, bones.leftUpperArm);
  createBoneLine(bones.leftUpperArm, bones.leftForearm);
  createBoneLine(bones.leftForearm, bones.leftHand);

  // Right arm
  createBoneLine(bones.chest, bones.rightUpperArm);
  createBoneLine(bones.rightUpperArm, bones.rightForearm);
  createBoneLine(bones.rightForearm, bones.rightHand);

  // Left leg
  createBoneLine(bones.hips, bones.leftUpperLeg);
  createBoneLine(bones.leftUpperLeg, bones.leftLowerLeg);
  createBoneLine(bones.leftLowerLeg, bones.leftFoot);

  // Right leg
  createBoneLine(bones.hips, bones.rightUpperLeg);
  createBoneLine(bones.rightUpperLeg, bones.rightLowerLeg);
  createBoneLine(bones.rightLowerLeg, bones.rightFoot);

  // Store references for toggling visibility
  root.userData.boneLines = lines;
  root.userData.boneJoints = joints;
  root.userData.visualizationVisible = true;
}

/**
 * Toggle skeleton visualization on/off
 * @param {THREE.Group} skeleton - The skeleton root
 * @param {boolean} visible - Whether to show visualization
 */
export function toggleSkeletonVisualization(skeleton, visible) {
  const lines = skeleton.userData.boneLines || [];
  const joints = skeleton.userData.boneJoints || [];

  for (const line of lines) {
    line.visible = visible;
  }

  for (const joint of joints) {
    joint.visible = visible;
  }

  skeleton.userData.visualizationVisible = visible;
}

/**
 * Attach a mesh rigidly to a specific bone
 * The mesh will follow the bone's transformations exactly (no deformation)
 *
 * @param {THREE.Object3D} bone - The bone to attach to
 * @param {THREE.Mesh} mesh - The mesh to attach
 * @param {THREE.Vector3} [offset] - Optional position offset from bone origin
 * @returns {THREE.Mesh} The attached mesh
 *
 * @example
 * const headMesh = new THREE.Mesh(geometry, material);
 * attachRigidMeshToBone(bones.head, headMesh, new THREE.Vector3(0, 0.05, 0));
 */
export function attachRigidMeshToBone(bone, mesh, offset = null) {
  if (offset) {
    mesh.position.copy(offset);
  }
  bone.add(mesh);
  return mesh;
}

/**
 * Calculate box dimensions automatically based on bone length and direction
 * @private
 * @param {THREE.Object3D} bone - The bone to calculate dimensions for
 * @param {Object} [options] - Options for calculation
 * @param {number} [options.thickness=0.08] - Default thickness for limbs
 * @param {number} [options.torsoWidth=0.24] - Width multiplier for torso
 * @returns {{ size: THREE.Vector3, offset: THREE.Vector3, direction: string }}
 */
function calculateBoneBoxDimensions(bone, options = {}) {
  const { thickness = 0.08, torsoWidth = 0.24 } = options;

  // Find the first child bone to calculate length
  const childBone = bone.children.find((child) => child.userData.bindPosition);

  if (!childBone) {
    // No child - this is an end effector (hand, foot, head)
    // Use a default small box
    return {
      size: new THREE.Vector3(thickness, thickness, thickness),
      offset: new THREE.Vector3(0, 0, 0),
      direction: 'end',
    };
  }

  // Get the child's position relative to this bone
  const childPos = childBone.position;
  const length = childPos.length();

  // Determine primary direction based on largest component
  const absX = Math.abs(childPos.x);
  const absY = Math.abs(childPos.y);
  const absZ = Math.abs(childPos.z);

  let size, offset, direction;

  if (absY > absX && absY > absZ) {
    // Vertical bone (spine, neck, head, legs)
    direction = 'vertical';
    const isTorso =
      bone.name.includes('spine') || bone.name.includes('chest') || bone.name.includes('hips');
    const width = isTorso ? torsoWidth : thickness;
    size = new THREE.Vector3(width, length, thickness * 1.5);
    // Use the actual Y direction (positive for up, negative for down)
    offset = new THREE.Vector3(0, childPos.y / 2, 0);
  } else if (absX > absY && absX > absZ) {
    // Horizontal bone (arms)
    direction = 'horizontal';
    size = new THREE.Vector3(length, thickness, thickness);
    // Use the actual X direction (negative for left, positive for right)
    offset = new THREE.Vector3(childPos.x / 2, 0, 0);
  } else {
    // Forward/backward (rare, default to vertical)
    direction = 'forward';
    size = new THREE.Vector3(thickness, thickness, length);
    offset = new THREE.Vector3(0, 0, childPos.z / 2);
  }

  return { size, offset, direction };
}

/**
 * Create a simple humanoid mesh and attach segments to the skeleton
 * Uses rigid body attachments - each body part is a separate mesh attached to its bone
 * Box dimensions are calculated automatically from bone lengths
 *
 * @param {THREE.Group} skeleton - The skeleton root with bones in userData
 * @param {Object} [options] - Customization options
 * @param {number} [options.color=0xffdbac] - Skin color
 * @param {boolean} [options.showMesh=true] - Whether to make mesh visible
 * @param {number} [options.thickness=0.08] - Default thickness for limbs
 * @returns {Array<THREE.Mesh>} Array of created meshes
 *
 * @example
 * const meshes = createSimpleHumanoidMesh(skeleton, { color: 0xff9999, thickness: 0.1 });
 */
export function createSimpleHumanoidMesh(skeleton, options = {}) {
  const { color = 0xffdbac, showMesh = true, thickness = 0.08 } = options;
  // const { color = 0x000000, showMesh = true, thickness = 0.08 } = options;
  const bones = skeleton.userData.bones;
  const meshes = [];

  if (!bones) {
    console.warn('Skeleton does not have bones in userData');
    return meshes;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.0,
    flatShading: true,
  });

  // List of bones to create meshes for
  const boneNames = [
    'hips',
    'spine',
    'chest',
    'neck',
    'head',
    'leftUpperArm',
    'leftForearm',
    'leftHand',
    'rightUpperArm',
    'rightForearm',
    'rightHand',
    'leftUpperLeg',
    'leftLowerLeg',
    'leftFoot',
    'rightUpperLeg',
    'rightLowerLeg',
    'rightFoot',
  ];

  for (const boneName of boneNames) {
    const bone = bones[boneName];
    if (!bone) continue;

    // Calculate dimensions automatically
    const { size, offset } = calculateBoneBoxDimensions(bone, {
      thickness,
      torsoWidth: boneName.includes('chest') ? 0.24 : boneName.includes('spine') ? 0.22 : 0.24,
    });

    if (boneName === 'head') {
      size.set(0.18, 0.18, 0.18);
      offset.set(0, 0.06, 0);
    }

    // Make hands smaller so they read better visually (similar to feet)
    if (boneName.includes('Hand')) {
      // Narrow, short box for hands
      size.set(0.08, 0.04, 0.08);
      const isLeft = boneName.includes('left');
      offset.set(isLeft ? -0.02 : 0.02, 0, 0);
    } else if (boneName.includes('Foot')) {
      // Slightly flattened foot box to provide toe/heel shape
      size.set(0.08, 0.04, 0.16);
      offset.set(0, -0.02, 0.02);
    }

    // // Special handling for end effectors and specific bones
    // if (boneName === 'hips') {
    //   // Hips should be a centered box at the root
    //   size.set(0.24, 0.1, 0.12);
    //   offset.set(0, 0.05, 0);
    // } else if (boneName === 'head') {
    //   size.set(0.16, 0.12, 0.16);
    //   offset.set(0, 0.06, 0);
    // } else if (boneName.includes('Hand')) {
    //   // Hands extend horizontally from bone origin
    //   size.set(0.1, 0.06, 0.06);
    //   const isLeft = boneName.includes('left');
    //   offset.set(isLeft ? -0.05 : 0.05, 0, 0);
    // } else if (boneName.includes('Foot')) {
    //   size.set(0.08, 0.04, 0.12);
    //   offset.set(0, -0.02, 0.03);
    // } else if (boneName.includes('Shoulder')) {
    //   size.set(0.06, 0.06, 0.06);
    //   offset.set(0, 0, 0);
    // }

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${boneName}_mesh`;
    mesh.visible = showMesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    attachRigidMeshToBone(bone, mesh, offset);
    meshes.push(mesh);
  }

  // Store mesh references in skeleton userData
  skeleton.userData.bodyMeshes = meshes;

  return meshes;
}

/**
 * Toggle visibility of attached body meshes
 * @param {THREE.Group} skeleton - The skeleton root
 * @param {boolean} visible - Whether meshes should be visible
 */
export function toggleBodyMeshVisibility(skeleton, visible) {
  const meshes = skeleton.userData.bodyMeshes || [];
  meshes.forEach((mesh) => {
    mesh.visible = visible;
  });
  skeleton.userData.bodyMeshesVisible = visible;
}

/**
 * Remove all attached body meshes from skeleton
 * @param {THREE.Group} skeleton - The skeleton root
 */
export function removeBodyMeshes(skeleton) {
  const meshes = skeleton.userData.bodyMeshes || [];
  meshes.forEach((mesh) => {
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    mesh.geometry?.dispose();
    mesh.material?.dispose();
  });
  skeleton.userData.bodyMeshes = [];
}

export default createHumanoidSkeleton;
