/**
 * Procedural Behavior Generator
 * 
 * Generates realistic idle animations using layered noise and weighted state transitions.
 * Combines micro-movements (continuous noise-driven transforms) with macro-actions
 * (event-driven state changes) to avoid mechanical repetition while maintaining
 * computational efficiency.
 */

import { ImprovedNoise } from 'simplex-noise';

export class BehaviorGenerator {
  constructor(config = {}) {
    const {
      seed = Math.random(),
      intensity = 'normal',
      lowResource = false,
    } = config;

    this.seed = seed;
    this.intensity = intensity;
    this.lowResource = lowResource;
    this.elapsed = 0;
    this.macroState = 'idle';
    this.macroStateStartTime = 0;
    this.macroStateChangedAt = -Infinity;
    
    // Initialize PRNG with seed for deterministic behavior
    this.rng = new SimpleSeededRandom(seed);
    this.noise = new ImprovedNoise();

    // Micro-primitives: noise-driven parameters
    this.microPrimitives = [
      { name: 'headSwayX', frequency: 0.3, amplitude: 0.15, phase: 0 },
      { name: 'headSwayZ', frequency: 0.25, amplitude: 0.12, phase: 0.5 },
      { name: 'eyeBlinkIntensity', frequency: 1.2, amplitude: 1.0, phase: 1.0 },
      { name: 'breathingAmplitude', frequency: 0.4, amplitude: 0.1, phase: 0.3 },
      { name: 'shoulderSway', frequency: 0.35, amplitude: 0.08, phase: 0.7 },
    ];

    // Macro-state machine
    this.macroStates = {
      idle: {
        duration: { min: 5000, max: 12000 },
        nextStates: [
          { state: 'lookLeft', weight: 0.2 },
          { state: 'lookRight', weight: 0.2 },
          { state: 'lookDown', weight: 0.15 },
          { state: 'idle', weight: 0.45 },
        ],
      },
      lookLeft: {
        duration: { min: 1500, max: 3000 },
        nextStates: [
          { state: 'idle', weight: 0.8 },
          { state: 'lookRight', weight: 0.2 },
        ],
      },
      lookRight: {
        duration: { min: 1500, max: 3000 },
        nextStates: [
          { state: 'idle', weight: 0.8 },
          { state: 'lookLeft', weight: 0.2 },
        ],
      },
      lookDown: {
        duration: { min: 1000, max: 2500 },
        nextStates: [
          { state: 'idle', weight: 1.0 },
        ],
      },
    };

    // Performance sampling
    this.telemetryBuffer = [];
    this.performanceSamples = [];
  }

  /**
   * Generated procedural pose for the current frame
   * @param {number} deltaTime - Time elapsed since last frame in milliseconds
   * @returns {Object} Pose object with bone transforms
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    this.elapsed += deltaSeconds;

    // Update macro state if duration exceeded
    const currentMacroConfig = this.macroStates[this.macroState];
    const elapsedInState = (this.elapsed * 1000) - this.macroStateStartTime;
    
    if (
      elapsedInState >
      (currentMacroConfig.duration.max + this.rng.nextFloat() * 500)
    ) {
      this._transitionMacroState();
    }

    // Generate micro-movements
    const microPose = this._generateMicroMovements(this.elapsed);

    // Generate macro-movement based on current state
    const macroPose = this._generateMacroMovement(this.macroState);

    // Blend micro and macro movements
    const pose = this._blendPoses(microPose, macroPose, 0.7);

    return pose;
  }

  /**
   * Generate continuous micro-movements using noise
   * @private
   */
  _generateMicroMovements(elapsed) {
    const pose = {};

    for (const primitive of this.microPrimitives) {
      const t = elapsed * primitive.frequency;
      const noiseValue = this.noise.perlin2(t, primitive.phase);
      const smoothedValue = noiseValue * primitive.amplitude;

      pose[primitive.name] = this.lowResource ? smoothedValue * 0.5 : smoothedValue;
    }

    return pose;
  }

  /**
   * Generate macro-movement based on current state
   * @private
   */
  _generateMacroMovement(state) {
    const pose = {};

    switch (state) {
      case 'lookLeft':
        pose.headRotationY = -0.5;
        pose.eyeLookX = -0.3;
        break;
      case 'lookRight':
        pose.headRotationY = 0.5;
        pose.eyeLookX = 0.3;
        break;
      case 'lookDown':
        pose.headRotationX = 0.3;
        pose.eyeLookY = -0.4;
        break;
      case 'idle':
      default:
        pose.headRotationY = 0;
        pose.headRotationX = 0;
        pose.eyeLookX = 0;
        pose.eyeLookY = 0;
        break;
    }

    return pose;
  }

  /**
   * Blend micro and macro poses
   * @private
   */
  _blendPoses(microPose, macroPose, microWeight) {
    const blended = { ...microPose };

    for (const key of Object.keys(macroPose)) {
      blended[key] = (blended[key] || 0) * microWeight + macroPose[key] * (1 - microWeight);
    }

    return blended;
  }

  /**
   * Transition to next macro state
   * @private
   */
  _transitionMacroState() {
    const currentConfig = this.macroStates[this.macroState];
    const nextStates = currentConfig.nextStates;

    // Weighted random selection
    const totalWeight = nextStates.reduce((sum, s) => sum + s.weight, 0);
    let randomValue = this.rng.nextFloat() * totalWeight;

    for (const stateOption of nextStates) {
      randomValue -= stateOption.weight;
      if (randomValue <= 0) {
        this.macroState = stateOption.state;
        break;
      }
    }

    this.macroStateStartTime = this.elapsed * 1000;
    this.macroStateChangedAt = this.elapsed * 1000;
  }

  /**
   * Set generator intensity
   */
  setIntensity(level) {
    this.intensity = level;

    // Adjust micro-primitive amplitudes based on intensity
    const intensityMultipliers = {
      subtle: 0.4,
      normal: 1.0,
      animated: 1.5,
    };

    const multiplier = intensityMultipliers[level] || 1.0;

    for (const primitive of this.microPrimitives) {
      primitive.amplitude *= multiplier;
    }
  }

  /**
   * Toggle low-resource mode
   */
  setLowResource(flag) {
    this.lowResource = flag;
  }

  /**
   * Reset with new seed
   */
  setSeed(seed) {
    this.seed = seed;
    this.rng = new SimpleSeededRandom(seed);
    this.elapsed = 0;
    this.macroState = 'idle';
    this.macroStateStartTime = 0;
  }

  /**
   * Get telemetry events
   */
  getTelemetry() {
    return {
      macroState: this.macroState,
      elapsedTime: this.elapsed,
      samples: this.performanceSamples.slice(-10),
    };
  }
}

/**
 * Simple seeded random number generator
 * Provides deterministic randomness for reproducible behavior
 */
class SimpleSeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  nextFloat() {
    const x = Math.sin(this.seed) * 10000;
    this.seed = (x - Math.floor(x)) * 10000;
    return (x - Math.floor(x));
  }

  nextInt(min, max) {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

export default BehaviorGenerator;
