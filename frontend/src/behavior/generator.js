import SimplexNoise from 'simplex-noise';

const noise = new SimplexNoise();

export const generateMotion = (time) => {
  // Example procedural motion using simplex noise
  return {
    x: noise.noise2D(time, 0),
    y: noise.noise2D(0, time),
    z: noise.noise2D(time, time),
  };
};