import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export const loadModel = (url) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(error)
    );
  });
};