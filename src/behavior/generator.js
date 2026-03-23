/**
 * Procedural Behavior Generator
 *
 * Generates realistic idle animations using layered noise and weighted state transitions.
 * Combines micro-movements (continuous noise-driven transforms) with macro-actions
 * (event-driven state changes) to create natural, non-repetitive idle behavior.
 */

import { createNoise2D } from 'simplex-noise';

export class BehaviorGenerator {
  constructor(config = {}) {
    const {
      seed = Math.random(),
      intensity = 'normal',
      lowResource = false,
      sceneWeights = {},
    } = config;

    this.seed = seed;
    this.intensity = intensity;
    this.lowResource = lowResource;
    this.elapsed = 0;
    this.macroState = 'idle';
    this.macroStateStartTime = 0;
    this.forcedMacroState = null; // when set, prevents automatic transitions
    this.forcedUntil = null; // timestamp in ms when forced state expires (optional)

    // Initialize PRNG with seed for deterministic behavior
    this.rng = new SimpleSeededRandom(seed);
    const seededRng = new SimpleSeededRandom(seed);
    const random = () => seededRng.nextFloat();
    this.noise = createNoise2D(random);

    // Micro-primitives: noise-driven parameters
    this.microPrimitives = [
      // Head and upper body
      { name: 'headSwayX', frequency: 0.3, amplitude: 0.15, phase: 0 },
      { name: 'headSwayZ', frequency: 0.25, amplitude: 0.12, phase: 0.5 },
      { name: 'headTiltZ', frequency: 0.28, amplitude: 0.08, phase: 0.2 },
      { name: 'breathingAmplitude', frequency: 0.4, amplitude: 0.1, phase: 0.3 },
      { name: 'shoulderSway', frequency: 0.35, amplitude: 0.08, phase: 0.7 },

      // Upper arms - opposing movement
      { name: 'leftArmRotationZ', frequency: 0.32, amplitude: 0.08, phase: 0.0 },
      { name: 'rightArmRotationZ', frequency: 0.34, amplitude: 0.06, phase: Math.PI },
      // Upper arm forward/back rotation
      { name: 'leftArmRotationX', frequency: 0.32, amplitude: 0.22, phase: 0.0 },
      { name: 'rightArmRotationX', frequency: 0.34, amplitude: 0.2, phase: Math.PI },

      // Forearms - follow arms with slight delay (forward/back X-axis)
      { name: 'leftForearmRotationX', frequency: 0.28, amplitude: 0.16, phase: 0.3 },
      { name: 'rightForearmRotationX', frequency: 0.26, amplitude: 0.16, phase: Math.PI + 0.3 },

      // Hands - minor oscillation
      { name: 'leftHandRotationX', frequency: 0.22, amplitude: 0.08, phase: 0.5 },
      { name: 'rightHandRotationX', frequency: 0.24, amplitude: 0.08, phase: Math.PI + 0.5 },

      // Legs - slower than arms, opposing movement
      { name: 'leftLegRotationZ', frequency: 0.19, amplitude: 0.12, phase: 0.2 },
      { name: 'rightLegRotationZ', frequency: 0.21, amplitude: 0.12, phase: Math.PI + 0.2 },

      // Feet - small rotation to show weight shift
      { name: 'leftFootRotationX', frequency: 0.25, amplitude: 0.06, phase: 0.4 },
      { name: 'rightFootRotationX', frequency: 0.23, amplitude: 0.06, phase: Math.PI + 0.4 },
    ];

    // Preserve base amplitudes so `setIntensity` is idempotent
    for (const p of this.microPrimitives) {
      p.baseAmplitude = p.amplitude;
    }

    // Intensity multipliers used across generator
    this._intensityMultipliers = {
      subtle: 0.4,
      normal: 1.0,
      animated: 1.5,
    };

    // Macro-state machine
    this.macroStates = {
      idle: {
        duration: { min: 5000, max: 12000 },
        nextStates: [
          { state: 'lookLeft', weight: 0.18 },
          { state: 'lookRight', weight: 0.18 },
          { state: 'lookDown', weight: 0.15 },
          { state: 'walk', weight: 0.05 },
          { state: 'run', weight: 0.03 },
          { state: 'lookingAround', weight: 0.07 },
          { state: 'idle', weight: 0.18 },
        ],
      },
      walk: {
        // Short walk cycles that can occur occasionally
        duration: { min: 1500, max: 4000 },
        nextStates: [
          { state: 'idle', weight: 0.65 },
          { state: 'lookingAround', weight: 0.25 },
          { state: 'run', weight: 0.05 },
        ],
      },
      run: {
        // Faster, more energetic run cycles
        duration: { min: 800, max: 2200 },
        nextStates: [
          { state: 'idle', weight: 0.7 },
          { state: 'walk', weight: 0.2 },
          { state: 'lookingAround', weight: 0.1 },
        ],
      },
      lookingAround: {
        // Small sequence of glances and head turns
        duration: { min: 2000, max: 4500 },
        nextStates: [
          { state: 'idle', weight: 0.6 },
          { state: 'lookLeft', weight: 0.2 },
          { state: 'lookRight', weight: 0.2 },
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
        nextStates: [{ state: 'idle', weight: 1.0 }],
      },
    };

    // Optional overrides for next-state weights. Format:
    // { stateName: { nextStateName: weight, ... }, ... }
    this.sceneWeights = sceneWeights || {};

    // Pick a preferred idle weight side (left or right) so idle posture varies
    this._idleWeightSide = this.rng.nextFloat() < 0.5 ? 'left' : 'right';

    // Macro transition blending state
    this._macroTransition = null; // { from, to, startElapsed, duration }
    this._macroTransitionDuration = 0.25; // seconds
  }

  /**
   * Generated procedural pose for the current frame
   * @param {number} deltaTime - Time elapsed since last frame in milliseconds
   * @returns {Object} Pose object with bone transforms
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    this.elapsed += deltaSeconds;

    // Update macro state if duration exceeded (skip if a forced state without expiry is set)
    const currentMacroConfig = this.macroStates[this.macroState];
    const elapsedInState = this.elapsed * 1000 - this.macroStateStartTime;

    // If a forced macro state exists and has no expiry, skip transitions
    if (this.forcedMacroState && !this.forcedUntil) {
      // keep current forced state
    } else {
      // If forcedUntil expired, clear forced state
      if (this.forcedUntil && Date.now() > this.forcedUntil) {
        this.forcedMacroState = null;
        this.forcedUntil = null;
      }

      if (elapsedInState > currentMacroConfig.duration.max + this.rng.nextFloat() * 500) {
        this._transitionMacroState();
      }
    }

    // Generate micro-movements
    const microPose = this._generateMicroMovements(this.elapsed);

    // Generate macro-movement with optional cross-fade if transitioning
    let macroPose;
    if (this._macroTransition) {
      const tinfo = this._macroTransition;
      const progress = Math.min(1, (this.elapsed - tinfo.startElapsed) / tinfo.duration);
      const eased = progress * progress * (3 - 2 * progress); // smoothstep

      if (progress >= 1) {
        // finalize transition
        this.macroState = tinfo.to;
        this.macroStateStartTime = this.elapsed * 1000;
        this._macroTransition = null;
        macroPose = this._generateMacroMovement(this.macroState);
      } else {
        const fromPose = this._generateMacroMovement(tinfo.from);
        const toPose = this._generateMacroMovement(tinfo.to);
        macroPose = this._lerpPoses(fromPose, toPose, eased);
      }
    } else {
      macroPose = this._generateMacroMovement(this.macroState);
    }

    // Blend micro and macro movements. Favor macro during walk to get clearer gait.
    const microWeight = this.macroState === 'walk' ? 0.4 : 0.7;
    const pose = this._blendPoses(microPose, macroPose, microWeight);

    return pose;
  }

  /**
   * Linearly interpolate between two poses
   * @private
   */
  _lerpPoses(a = {}, b = {}, alpha = 0) {
    const out = { ...a };
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const va = a[k] ?? 0;
      const vb = b[k] ?? 0;
      out[k] = va * (1 - alpha) + vb * alpha;
    }
    return out;
  }

  /**
   * Generate continuous micro-movements using noise
   * @private
   */
  _generateMicroMovements(elapsed) {
    const pose = {};

    for (const primitive of this.microPrimitives) {
      const t = elapsed * primitive.frequency;
      const noiseValue = this.noise(t, primitive.phase);
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

      case 'walk': {
        // Simple procedural walk that uses elapsed time for phase
        const speedMul = this._intensityMultipliers[this.intensity] || 1.0;
        const t = this.elapsed * 3 * speedMul; // walk speed scales with intensity
        const legSwing = Math.sin(t) * 0.6 * speedMul; // swing magnitude scales
        const armSwing = Math.sin(t + Math.PI) * 0.45 * speedMul;

        // Swing around X axis for forward/back motion
        pose.leftLegRotationX = legSwing;
        pose.rightLegRotationX = -legSwing;

        // Foot pitch to match step (lift when leg swings forward)
        pose.leftFootRotationX = Math.max(-0.3, Math.sin(t) * 0.25);
        pose.rightFootRotationX = Math.max(-0.3, Math.sin(t + Math.PI) * 0.25);

        // Knee bend: bend the leg when foot is lifted (simple heuristic)
        const leftKneeBend = Math.max(0, -Math.sin(t)) * 0.6;
        const rightKneeBend = Math.max(0, -Math.sin(t + Math.PI)) * 0.6;
        pose.leftLowerLegRotationX = leftKneeBend;
        pose.rightLowerLegRotationX = rightKneeBend;

        // Swing arms forward/back around X axis to match leg gait
        pose.leftArmRotationX = armSwing;
        pose.rightArmRotationX = -armSwing;

        // Forearm bend: bend forearm when the corresponding arm swings forward.
        // Use a phase-shifted sine and clamp to positive to emulate knee-like bend.
        const leftForearmBend = Math.max(0, Math.sin(t - 0.5)) * 0.6 * speedMul;
        const rightForearmBend = Math.max(0, Math.sin(t + Math.PI - 0.5)) * 0.6 * speedMul;
        pose.leftForearmRotationX = leftForearmBend;
        pose.rightForearmRotationX = rightForearmBend;

        // Slight forward lean when walking (small radian value)
        pose.spineRotationX = 0.12;
        break;
      }
      case 'run': {
        // Energetic run: faster phase, larger swings and deeper knee bends
        const speedMul = this._intensityMultipliers[this.intensity] || 1.0;
        const t = this.elapsed * 5 * speedMul; // faster cadence
        const legSwing = Math.sin(t) * 6 * speedMul; // larger forward swing
        const armSwing = Math.sin(t + Math.PI) * 5 * speedMul;

        pose.leftLegRotationX = legSwing;
        pose.rightLegRotationX = -legSwing;

        // Foot pitch to match stronger steps (lift forward more)
        pose.leftFootRotationX = Math.max(-0.6, Math.sin(t) * 0.5);
        pose.rightFootRotationX = Math.max(-0.6, Math.sin(t + Math.PI) * 0.5);

        // (Removed direct foot lift - rely on larger leg swing and knee bend for visible lift)

        // Knee bend - more pronounced during run (sync with foot lift)
        const leftKneeBend = Math.max(0, -Math.sin(t)) * 1.0;
        const rightKneeBend = Math.max(0, -Math.sin(t + Math.PI)) * 1.0;
        pose.leftLowerLegRotationX = leftKneeBend;
        pose.rightLowerLegRotationX = rightKneeBend;

        // Arms swing more during run
        pose.leftArmRotationX = armSwing;
        pose.rightArmRotationX = -armSwing;

        // Forearm bend linked to gait with slightly increased magnitude from walk
        const leftForearmBend = Math.max(0, Math.sin(t - 0.4)) * 2 * speedMul;
        const rightForearmBend = Math.max(0, Math.sin(t + Math.PI - 0.4)) * 2 * speedMul;
        pose.leftForearmRotationX = leftForearmBend;
        pose.rightForearmRotationX = rightForearmBend;

        // Stronger forward lean while running
        pose.spineRotationX = 0.6;
        break;
      }
      case 'lookingAround': {
        // Gentle oscillation of head Y to simulate scanning the environment
        const t = this.elapsed * 0.8;
        pose.headRotationY = Math.sin(t) * 0.6;
        pose.eyeLookX = Math.sin(t) * 0.35;
        break;
      }
      case 'idle':
      default: {
        // Neutral standing pose: relax head/eyes and return legs toward base.
        pose.headRotationY = 0;
        pose.headRotationX = 0;
        pose.eyeLookX = 0;
        pose.eyeLookY = 0;

        // Counteract macro walk/large micro leg swings by nudging legs back
        // toward a neutral X rotation and keeping lower legs/feet relaxed.
        pose.leftLegRotationX = 0;
        pose.rightLegRotationX = 0;
        pose.leftLowerLegRotationX = 0;
        pose.rightLowerLegRotationX = 0;
        pose.leftFootRotationX = 0;
        pose.rightFootRotationX = 0;

        // Apply a very subtle slow weight shift (lean) so the avatar looks natural.
        // Choose a side based on seeded choice so different avatars vary.
        const slowT = this.elapsed * 0.25; // slow oscillation
        const sway = Math.sin(slowT) * 0.02; // small magnitude
        if (this._idleWeightSide === 'left') {
          pose.leftLegRotationX = -sway;
          pose.rightLegRotationX = sway;
        } else {
          pose.leftLegRotationX = sway;
          pose.rightLegRotationX = -sway;
        }

        // Slight spine/hips lean to convey weight shift
        pose.spineRotationX = sway * 0.5;
        pose.hipsShiftX = sway * 0.6;
        break;
      }
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
    // Allow runtime overrides of next-state weights per current macro state
    const baseNextStates = currentConfig.nextStates;
    const overrideMap = this.sceneWeights[this.macroState] || null;

    const nextStates = overrideMap
      ? baseNextStates.map((s) => ({ ...s, weight: overrideMap[s.state] ?? s.weight }))
      : baseNextStates;

    // Weighted random selection
    const totalWeight = nextStates.reduce((sum, s) => sum + s.weight, 0);
    let randomValue = this.rng.nextFloat() * totalWeight;

    for (const stateOption of nextStates) {
      randomValue -= stateOption.weight;
      if (randomValue <= 0) {
        const chosen = stateOption.state;
        // Start a smooth transition from current macro state to chosen state
        this._macroTransition = {
          from: this.macroState,
          to: chosen,
          startElapsed: this.elapsed,
          duration: this._macroTransitionDuration,
        };
        // record change time once transition completes
        this.macroStateChangedAt = this.elapsed * 1000;
        break;
      }
    }
  }

  /**
   * Force the macro state. If `durationMs` is provided, the forced state will
   * be released after that many milliseconds. Otherwise it stays forced until
   * `clearForcedMacroState()` is called.
   */
  setMacroState(state, durationMs = null) {
    if (!this.macroStates[state]) return false;
    // Start a smooth transition into the requested macro state instead of snapping
    this._macroTransition = {
      from: this.macroState,
      to: state,
      startElapsed: this.elapsed,
      duration: this._macroTransitionDuration,
    };
    // Mark forced state so automatic transitions are inhibited if desired
    this.forcedMacroState = state;
    if (durationMs && typeof durationMs === 'number') {
      this.forcedUntil = Date.now() + durationMs;
    } else {
      this.forcedUntil = null;
    }
    // Defer setting macroState until transition completes in `update()`
    this.macroStateChangedAt = this.elapsed * 1000;
    return true;
  }

  /**
   * Clear any forced macro state and allow normal transitions to resume.
   */
  clearForcedMacroState() {
    this.forcedMacroState = null;
    this.forcedUntil = null;
  }

  /**
   * Set scene weights at runtime. `weights` should be an object in the same format
   * as the `sceneWeights` constructor option: { stateName: { nextStateName: weight } }
   */
  setSceneWeights(weights = {}) {
    this.sceneWeights = weights;
  }

  /**
   * Set generator intensity
   */
  setIntensity(level) {
    // Make this idempotent: reset to base amplitudes then apply multiplier
    this.intensity = level;
    const multiplier = this._intensityMultipliers[level] ?? 1.0;

    for (const primitive of this.microPrimitives) {
      primitive.amplitude = (primitive.baseAmplitude ?? primitive.amplitude) * multiplier;
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
   * Get current state telemetry
   */
  getTelemetry() {
    return {
      macroState: this.macroState,
      elapsedTime: this.elapsed,
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
    return x - Math.floor(x);
  }

  nextInt(min, max) {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

export default BehaviorGenerator;
