/**
 * Procedural Behavior Generator
 *
 * Generates realistic idle animations using layered noise and weighted state transitions.
 * Combines micro-movements (continuous noise-driven transforms) with macro-actions
 * (event-driven state changes) to create natural, non-repetitive idle behavior.
 */

import { createNoise2D } from 'simplex-noise';

const DEFAULT_SCENARIO_ID = 'balanced';

const SCENARIO_PRESETS = {
  balanced: {
    id: 'balanced',
    label: 'Balanced Vigil',
    transitionDuration: 0.25,
    movement: {
      patrolOffsetX: 1.35,
      returnSettleRate: 4.2,
      patrolTravelSpeed: 0.52,
      returnTravelSpeed: 0.72,
      patrolTurnDuration: 0.45,
      patrolInitialTurnDuration: 0.38,
      returnTurnDuration: 0.38,
    },
    blend: {
      microWeights: {
        default: 0.68,
        lookAtUser: 0.55,
        patrol: 0.33,
        returnToCenter: 0.3,
      },
      patrolWalkBlend: 0.68,
      returnWalkBlend: 0.64,
    },
    walkCycles: {
      patrolBase: {
        cadence: 3.0,
        legSwingMul: 0.62,
        armSwingMul: 0.47,
        kneeMul: 0.62,
        forearmMul: 0.62,
        footMul: 0.25,
        lean: 0.12,
      },
      patrolLayer: {
        cadence: 3.45,
        legSwingMul: 0.76,
        armSwingMul: 0.54,
        kneeMul: 0.72,
        forearmMul: 0.7,
        footMul: 0.29,
        lean: 0.14,
      },
    },
  },
  sentinel: {
    id: 'sentinel',
    label: 'Sentinel Focus',
    movement: {
      patrolOffsetX: 1.2,
      returnSettleRate: 4.5,
      patrolTravelSpeed: 0.45,
      returnTravelSpeed: 0.75,
      patrolTurnDuration: 0.5,
      patrolInitialTurnDuration: 0.4,
      returnTurnDuration: 0.42,
    },
    blend: {
      patrolWalkBlend: 0.55,
      returnWalkBlend: 0.52,
      microWeights: {
        lookAtUser: 0.48,
      },
    },
  },
  restless: {
    id: 'restless',
    label: 'Restless Patrol',
    movement: {
      patrolOffsetX: 2.2,
      returnSettleRate: 3.6,
      patrolTravelSpeed: 0.68,
      returnTravelSpeed: 0.78,
      patrolTurnDuration: 0.38,
      patrolInitialTurnDuration: 0.32,
      returnTurnDuration: 0.3,
    },
    blend: {
      patrolWalkBlend: 0.78,
      returnWalkBlend: 0.72,
      microWeights: {
        patrol: 0.26,
        returnToCenter: 0.24,
      },
    },
    walkCycles: {
      patrolLayer: {
        cadence: 3.75,
        legSwingMul: 0.84,
        armSwingMul: 0.58,
        kneeMul: 0.78,
      },
    },
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(target, source) {
  const out = { ...target };
  if (!isPlainObject(source)) return out;

  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }

  return out;
}

export class BehaviorGenerator {
  constructor(config = {}) {
    const {
      seed = Math.random(),
      intensity = 'normal',
      lowResource = false,
      scenario = DEFAULT_SCENARIO_ID,
      scenarioOverrides = {},
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
    this._patrolDirection = this.rng.nextFloat() < 0.5 ? -1 : 1;
    this._rootOffsetX = 0;
    this._rootOffsetZ = 0;
    this._rootRotationY = 0;
    this._pendingMacroState = null;
    this._returnToCenterPlan = null;

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
          { state: 'lookAtUser', weight: 0.48 },
          { state: 'idle', weight: 0.34 },
          { state: 'patrol', weight: 0.18 },
        ],
      },
      lookAtUser: {
        duration: { min: 1800, max: 3500 },
        nextStates: [
          { state: 'idle', weight: 0.62 },
          { state: 'patrol', weight: 0.38 },
        ],
      },
      patrol: {
        duration: { min: 10000, max: 20000 },
        nextStates: [
          { state: 'lookAtUser', weight: 0.65 },
          { state: 'idle', weight: 0.35 },
        ],
      },
      returnToCenter: {
        duration: { min: 25000, max: 30000 },
        nextStates: [{ state: 'idle', weight: 1 }],
      },
    };

    this._scenarioCatalog = Object.fromEntries(
      Object.entries(SCENARIO_PRESETS).map(([id, preset]) => [
        id,
        deepMerge(SCENARIO_PRESETS[DEFAULT_SCENARIO_ID], deepMerge({ id }, preset)),
      ])
    );
    this._scenario = deepMerge({}, this._scenarioCatalog[DEFAULT_SCENARIO_ID]);
    this._scenarioOverrides = {};

    const mergedScenarioOverrides = deepMerge(
      deepMerge({}, scenarioOverrides || {}),
      Object.keys(sceneWeights || {}).length ? { sceneWeights } : {}
    );
    this._applyScenarioConfig(scenario, mergedScenarioOverrides);

    // Pick a preferred idle weight side (left or right) so idle posture varies
    this._idleWeightSide = this.rng.nextFloat() < 0.5 ? 'left' : 'right';

    // Macro transition blending state
    this._macroTransition = null; // { from, to, startElapsed, duration }
    this._macroTransitionDuration = this._scenario.transitionDuration ?? 0.25;
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

    // Blend micro and macro movements. Favor macro when a state needs clearer readability.
    const microWeight = this._getMicroWeight(this.macroState);
    const pose = this._blendPoses(microPose, macroPose, microWeight);

    const locomotionElapsedInState = this.elapsed * 1000 - this.macroStateStartTime;

    if (this.macroState === 'patrol') {
      const patrolLocomotion = this._computePatrolLocomotion(locomotionElapsedInState / 1000);
      this._rootOffsetX = patrolLocomotion.positionX;
      this._rootOffsetZ = 0;
      this._rootRotationY = patrolLocomotion.rotationY;
    } else if (this.macroState === 'returnToCenter') {
      if (this._returnToCenterPlan) {
        const returnLocomotion = this._computeReturnToCenterLocomotion(
          locomotionElapsedInState / 1000
        );
        this._rootOffsetX = returnLocomotion.positionX;
        this._rootOffsetZ = 0;
        this._rootRotationY = returnLocomotion.rotationY;

        if (returnLocomotion.done) {
          const targetState = this._pendingMacroState || 'idle';
          this._pendingMacroState = null;
          this._returnToCenterPlan = null;
          this._macroTransition = {
            from: 'returnToCenter',
            to: targetState,
            startElapsed: this.elapsed,
            duration: this._macroTransitionDuration,
          };
        }
      } else {
        this._rootOffsetX = 0;
        this._rootOffsetZ = 0;
        this._rootRotationY = 0;
      }
    } else {
      // Outside patrol, settle root back to center/front.
      const settleRate = this._scenario?.movement?.returnSettleRate ?? 4.2;
      const alpha = Math.min(1, settleRate * deltaSeconds);
      this._rootOffsetX = this._rootOffsetX + (0 - this._rootOffsetX) * alpha;
      this._rootOffsetZ = this._rootOffsetZ + (0 - this._rootOffsetZ) * alpha;
      this._rootRotationY = this._rootRotationY + (0 - this._rootRotationY) * alpha;
    }

    pose.modelPositionX = this._rootOffsetX;
    pose.modelPositionZ = this._rootOffsetZ;
    pose.modelRotationY = this._rootRotationY;

    return pose;
  }

  _getMicroWeight(state) {
    const weights = this._scenario?.blend?.microWeights || {};
    if (typeof weights[state] === 'number') return weights[state];
    return typeof weights.default === 'number' ? weights.default : 0.68;
  }

  _computePatrolLocomotion(elapsedSeconds) {
    const side = this._patrolDirection >= 0 ? 1 : -1;
    const distance = Math.max(0.25, Math.abs(this._scenario?.movement?.patrolOffsetX ?? 1.35));
    const speed = Math.max(0.05, this._scenario?.movement?.patrolTravelSpeed ?? 0.52);
    const initialTurnDuration = Math.max(
      0.05,
      this._scenario?.movement?.patrolInitialTurnDuration ?? 0.38
    );
    const turnDuration = Math.max(0.05, this._scenario?.movement?.patrolTurnDuration ?? 0.45);

    // Align model forward axis with travel direction on X so gait reads as forward walking.
    const yawForDir = (dir) => (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const walkToEdgeDuration = distance / speed;
    const walkAcrossDuration = (distance * 2) / speed;

    // 1) Turn 90 degrees from center.
    if (elapsedSeconds <= initialTurnDuration) {
      const t = elapsedSeconds / initialTurnDuration;
      return {
        positionX: 0,
        rotationY: yawForDir(side) * t,
      };
    }

    // 2) Walk from center to first edge.
    const afterInitialTurn = elapsedSeconds - initialTurnDuration;
    if (afterInitialTurn <= walkToEdgeDuration) {
      const t = afterInitialTurn / walkToEdgeDuration;
      return {
        positionX: side * distance * t,
        rotationY: yawForDir(side),
      };
    }

    // 3+) Loop: turn 180 at edge, walk across, turn 180, walk back.
    const loopT = afterInitialTurn - walkToEdgeDuration;
    const loopDuration = turnDuration + walkAcrossDuration + turnDuration + walkAcrossDuration;
    const m = loopT % loopDuration;

    if (m < turnDuration) {
      const t = m / turnDuration;
      return {
        positionX: side * distance,
        rotationY: yawForDir(side) + Math.PI * t,
      };
    }

    const afterTurnA = m - turnDuration;
    if (afterTurnA < walkAcrossDuration) {
      const t = afterTurnA / walkAcrossDuration;
      return {
        positionX: side * distance + (-side * distance - side * distance) * t,
        rotationY: yawForDir(-side),
      };
    }

    const afterWalkA = afterTurnA - walkAcrossDuration;
    if (afterWalkA < turnDuration) {
      const t = afterWalkA / turnDuration;
      return {
        positionX: -side * distance,
        rotationY: yawForDir(-side) + Math.PI * t,
      };
    }

    const afterTurnB = afterWalkA - turnDuration;
    const t = afterTurnB / walkAcrossDuration;
    return {
      positionX: -side * distance + (side * distance - -side * distance) * t,
      rotationY: yawForDir(side),
    };
  }

  _normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  _lerpAngle(from, to, alpha) {
    const delta = this._normalizeAngle(to - from);
    return this._normalizeAngle(from + delta * alpha);
  }

  _startReturnToCenter(targetState) {
    const turnDuration = Math.max(0.05, this._scenario?.movement?.returnTurnDuration ?? 0.38);
    const returnSpeed = Math.max(
      0.05,
      this._scenario?.movement?.returnTravelSpeed ??
        this._scenario?.movement?.patrolTravelSpeed ??
        0.52
    );

    const startX = this._rootOffsetX;
    const startRotationY = this._rootRotationY;
    const needsWalk = Math.abs(startX) > 0.03;
    const walkDirection = startX >= 0 ? -1 : 1;
    const walkYaw = walkDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
    const walkDuration = needsWalk ? Math.abs(startX) / returnSpeed : 0;

    this._pendingMacroState = targetState || 'idle';
    this._returnToCenterPlan = {
      startX,
      startRotationY,
      walkYaw,
      turnToWalkDuration: needsWalk ? turnDuration : 0,
      walkDuration,
      turnToFrontDuration: turnDuration,
    };

    this._macroTransition = {
      from: this.macroState,
      to: 'returnToCenter',
      startElapsed: this.elapsed,
      duration: this._macroTransitionDuration,
    };
    this.macroStateChangedAt = this.elapsed * 1000;
  }

  _computeReturnToCenterLocomotion(elapsedSeconds) {
    const plan = this._returnToCenterPlan;
    if (!plan) {
      return { positionX: 0, rotationY: 0, done: true };
    }

    const {
      startX,
      startRotationY,
      walkYaw,
      turnToWalkDuration,
      walkDuration,
      turnToFrontDuration,
    } = plan;

    let t = elapsedSeconds;

    if (t < turnToWalkDuration) {
      const alpha = turnToWalkDuration > 0 ? t / turnToWalkDuration : 1;
      return {
        positionX: startX,
        rotationY: this._lerpAngle(startRotationY, walkYaw, alpha),
        done: false,
      };
    }
    t -= turnToWalkDuration;

    if (t < walkDuration) {
      const alpha = walkDuration > 0 ? t / walkDuration : 1;
      return {
        positionX: startX * (1 - alpha),
        rotationY: walkYaw,
        done: false,
      };
    }
    t -= walkDuration;

    if (t < turnToFrontDuration) {
      const alpha = turnToFrontDuration > 0 ? t / turnToFrontDuration : 1;
      return {
        positionX: 0,
        rotationY: this._lerpAngle(walkYaw, 0, alpha),
        done: false,
      };
    }

    return { positionX: 0, rotationY: 0, done: true };
  }

  _buildWalkCycle(options = {}) {
    const {
      cadence = 3,
      legSwingMul = 0.6,
      armSwingMul = 0.45,
      kneeMul = 0.6,
      forearmMul = 0.6,
      footMul = 0.25,
      lean = 0.12,
      phaseShift = 0,
    } = options;

    const speedMul = this._intensityMultipliers[this.intensity] || 1.0;
    const t = this.elapsed * cadence * speedMul + phaseShift;
    const legSwing = Math.sin(t) * legSwingMul * speedMul;
    const armSwing = Math.sin(t + Math.PI) * armSwingMul * speedMul;

    const out = {};
    out.leftLegRotationX = legSwing;
    out.rightLegRotationX = -legSwing;
    out.leftFootRotationX = Math.max(-0.35, Math.sin(t) * footMul);
    out.rightFootRotationX = Math.max(-0.35, Math.sin(t + Math.PI) * footMul);
    out.leftLowerLegRotationX = Math.max(0, -Math.sin(t)) * kneeMul;
    out.rightLowerLegRotationX = Math.max(0, -Math.sin(t + Math.PI)) * kneeMul;
    out.leftArmRotationX = armSwing;
    out.rightArmRotationX = -armSwing;
    out.leftForearmRotationX = Math.max(0, Math.sin(t - 0.5)) * forearmMul * speedMul;
    out.rightForearmRotationX = Math.max(0, Math.sin(t + Math.PI - 0.5)) * forearmMul * speedMul;
    out.spineRotationX = lean;
    return out;
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
      case 'lookAtUser':
        pose.headRotationY = 0;
        pose.headRotationX = -0.03;
        pose.eyeLookX = 0;
        pose.eyeLookY = 0;
        break;
      case 'patrol': {
        const walkBase = this._buildWalkCycle(this._scenario?.walkCycles?.patrolBase || {});
        const patrolLayer = this._buildWalkCycle(this._scenario?.walkCycles?.patrolLayer || {});
        const patrolBlend = this._scenario?.blend?.patrolWalkBlend ?? 0.68;
        Object.assign(pose, this._lerpPoses(walkBase, patrolLayer, patrolBlend));
        // Keep upper body mostly neutral; root rotation drives patrol direction.
        pose.headRotationY = 0;
        pose.spineRotationY = 0;
        pose.eyeLookX = 0;
        break;
      }
      case 'returnToCenter': {
        const walkBase = this._buildWalkCycle(this._scenario?.walkCycles?.patrolBase || {});
        const patrolLayer = this._buildWalkCycle(this._scenario?.walkCycles?.patrolLayer || {});
        const returnBlend = this._scenario?.blend?.returnWalkBlend ?? 0.64;
        Object.assign(pose, this._lerpPoses(walkBase, patrolLayer, returnBlend));
        pose.headRotationY = 0;
        pose.headRotationX = -0.01;
        pose.spineRotationY = 0;
        pose.eyeLookX = 0;
        pose.eyeLookY = 0;
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
        if (chosen === 'patrol') {
          this._patrolDirection = this.rng.nextFloat() < 0.5 ? -1 : 1;
        }
        if (this.macroState === 'patrol' && chosen !== 'patrol') {
          this._startReturnToCenter(chosen);
          break;
        }
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
    if (state === 'patrol') {
      this._patrolDirection = this.rng.nextFloat() < 0.5 ? -1 : 1;
    }
    if (this.macroState === 'patrol' && state !== 'patrol') {
      this._startReturnToCenter(state);
      this.forcedMacroState = state;
      if (durationMs && typeof durationMs === 'number') {
        this.forcedUntil = Date.now() + durationMs;
      } else {
        this.forcedUntil = null;
      }
      return true;
    }
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

  _resolveScenarioBase(scenario) {
    if (typeof scenario === 'string' && this._scenarioCatalog[scenario]) {
      return deepMerge({}, this._scenarioCatalog[scenario]);
    }

    if (isPlainObject(scenario)) {
      const preferredId =
        typeof scenario.id === 'string' && this._scenarioCatalog[scenario.id]
          ? scenario.id
          : DEFAULT_SCENARIO_ID;
      const base = deepMerge({}, this._scenarioCatalog[preferredId]);
      return deepMerge(base, scenario);
    }

    return deepMerge({}, this._scenarioCatalog[DEFAULT_SCENARIO_ID]);
  }

  _applyScenarioConfig(scenario, overrides = {}) {
    const base = this._resolveScenarioBase(scenario);
    const merged = deepMerge(base, overrides || {});

    merged.id = typeof merged.id === 'string' ? merged.id : DEFAULT_SCENARIO_ID;
    merged.label = merged.label || merged.id;

    this._scenario = merged;
    this._scenarioOverrides = deepMerge({}, overrides || {});
    this.sceneWeights = merged.sceneWeights || {};
    this._macroTransitionDuration = merged.transitionDuration ?? 0.25;
  }

  getAvailableScenarios() {
    return Object.values(this._scenarioCatalog).map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
    }));
  }

  setScenario(scenario, overrides = {}) {
    this._applyScenarioConfig(scenario, overrides);
    return true;
  }

  setScenarioOverrides(overrides = {}) {
    if (!isPlainObject(overrides)) return false;
    const merged = deepMerge(this._scenarioOverrides || {}, overrides);
    this._applyScenarioConfig(this._scenario?.id || DEFAULT_SCENARIO_ID, merged);
    return true;
  }

  getScenario() {
    return {
      id: this._scenario?.id || DEFAULT_SCENARIO_ID,
      label: this._scenario?.label || DEFAULT_SCENARIO_ID,
      config: deepMerge({}, this._scenario || {}),
    };
  }

  /**
   * Set scene weights at runtime. `weights` should be an object in the same format
   * as the `sceneWeights` constructor option: { stateName: { nextStateName: weight } }
   */
  setSceneWeights(weights = {}) {
    this.setScenarioOverrides({ sceneWeights: weights });
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
    this._patrolDirection = this.rng.nextFloat() < 0.5 ? -1 : 1;
    this._rootOffsetX = 0;
    this._rootOffsetZ = 0;
    this._rootRotationY = 0;
    this._pendingMacroState = null;
    this._returnToCenterPlan = null;
  }

  /**
   * Get current state telemetry
   */
  getTelemetry() {
    return {
      macroState: this.macroState,
      elapsedTime: this.elapsed,
      scenarioId: this._scenario?.id || DEFAULT_SCENARIO_ID,
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
