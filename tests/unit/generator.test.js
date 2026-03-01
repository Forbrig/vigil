import { describe, it, expect, beforeEach } from 'vitest';
import BehaviorGenerator from '../../src/behavior/generator';

describe('BehaviorGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new BehaviorGenerator({
      seed: 42,
      intensity: 'normal',
      lowResource: false,
    });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const gen = new BehaviorGenerator();
      expect(gen.intensity).toBe('normal');
      expect(gen.lowResource).toBe(false);
      expect(gen.elapsed).toBe(0);
      expect(gen.macroState).toBe('idle');
    });

    it('should initialize with custom config', () => {
      expect(generator.seed).toBe(42);
      expect(generator.intensity).toBe('normal');
      expect(generator.lowResource).toBe(false);
    });

    it('should have seeded RNG for deterministic behavior', () => {
      const gen1 = new BehaviorGenerator({ seed: 123 });
      const gen2 = new BehaviorGenerator({ seed: 123 });

      // Both generators with same seed should produce same sequence
      const pose1 = gen1.update(16); // ~60fps
      const pose2 = gen2.update(16);

      expect(pose1.headSwayX).toBe(pose2.headSwayX);
      expect(pose1.headSwayZ).toBe(pose2.headSwayZ);
    });
  });

  describe('Micro-movements', () => {
    it('should generate micro-movement values', () => {
      const pose = generator.update(16);

      expect(pose).toHaveProperty('headSwayX');
      expect(pose).toHaveProperty('headSwayZ');
      expect(pose).toHaveProperty('eyeBlinkIntensity');
      expect(pose).toHaveProperty('breathingAmplitude');
      expect(pose).toHaveProperty('shoulderSway');
    });

    it('should have bounded amplitude values', () => {
      const pose = generator.update(16);

      // Values should be within reasonable bounds
      expect(Math.abs(pose.headSwayX)).toBeLessThan(1);
      expect(Math.abs(pose.headSwayZ)).toBeLessThan(1);
      expect(Math.abs(pose.breathingAmplitude)).toBeLessThan(1);
    });

    it('should vary over time', () => {
      const pose1 = generator.update(16);
      generator.update(100); // Advance time significantly
      const pose2 = generator.update(16);

      // Values should be different after advancing time
      const isHeadSwayXDifferent = Math.abs(pose1.headSwayX - pose2.headSwayX) > 0.01;
      const isHeadSwayZDifferent = Math.abs(pose1.headSwayZ - pose2.headSwayZ) > 0.01;

      expect(isHeadSwayXDifferent || isHeadSwayZDifferent).toBe(true);
    });

    it('should respect low-resource mode', () => {
      const normalGenerator = new BehaviorGenerator({
        seed: 42,
        lowResource: false,
      });
      const lowResourceGenerator = new BehaviorGenerator({
        seed: 42,
        lowResource: true,
      });

      const normalPose = normalGenerator.update(16);
      const lowResourcePose = lowResourceGenerator.update(16);

      // Low-resource mode should have reduced amplitudes
      expect(Math.abs(lowResourcePose.headSwayX)).toBeLessThanOrEqual(
        Math.abs(normalPose.headSwayX)
      );
    });
  });

  describe('Macro-movements', () => {
    it('should have macro state', () => {
      expect(generator.macroState).toBe('idle');
    });

    it('should generate macro-movement pose', () => {
      const pose = generator.update(16);

      expect(pose).toHaveProperty('headRotationY');
      expect(pose).toHaveProperty('headRotationX');
      expect(pose).toHaveProperty('eyeLookX');
      expect(pose).toHaveProperty('eyeLookY');
    });

    it('should transition through macro states', () => {
      const startState = generator.macroState;

      // Simulate long idle to force state transition
      for (let i = 0; i < 1000; i++) {
        generator.update(16);
      }

      const endState = generator.macroState;

      // Should either stay in idle or transition to another valid state
      const validStates = ['idle', 'lookLeft', 'lookRight', 'lookDown'];
      expect(validStates).toContain(endState);
    });

    it('should have different values for different macro states', () => {
      generator.macroState = 'lookLeft';
      const leftPose = generator._generateMacroMovement('lookLeft');

      generator.macroState = 'lookRight';
      const rightPose = generator._generateMacroMovement('lookRight');

      expect(leftPose.headRotationY).not.toBe(rightPose.headRotationY);
      expect(leftPose.eyeLookX).not.toBe(rightPose.eyeLookX);
    });
  });

  describe('Intensity Control', () => {
    it('should adjust intensity', () => {
      generator.setIntensity('subtle');
      expect(generator.intensity).toBe('subtle');

      generator.setIntensity('animated');
      expect(generator.intensity).toBe('animated');
    });

    it('should affect micro-primitive amplitudes', () => {
      const originalAmplitudes = generator.microPrimitives.map((p) => p.amplitude);

      generator.setIntensity('animated');
      const animatedAmplitudes = generator.microPrimitives.map((p) => p.amplitude);

      // At least some primitives should have different (greater) amplitudes
      const anyIncreased = animatedAmplitudes.some((amp, i) => amp > originalAmplitudes[i]);
      expect(anyIncreased).toBe(true);
    });
  });

  describe('Low-Resource Mode', () => {
    it('should toggle low-resource mode', () => {
      expect(generator.lowResource).toBe(false);
      generator.setLowResource(true);
      expect(generator.lowResource).toBe(true);
      generator.setLowResource(false);
      expect(generator.lowResource).toBe(false);
    });

    it('should reduce amplitude in low-resource mode', () => {
      generator.setLowResource(false);
      const normalPose = generator.update(16);

      generator.setLowResource(true);
      const lowResPose = generator.update(16);

      // Low-resource amplitudes should be <= normal
      expect(Math.abs(lowResPose.headSwayX)).toBeLessThanOrEqual(Math.abs(normalPose.headSwayX));
    });
  });

  describe('Seed Control', () => {
    it('should reset and change seed', () => {
      const elapsed1 = generator.elapsed;
      generator.setSeed(100);
      expect(generator.seed).toBe(100);
      expect(generator.elapsed).toBe(0);
      expect(generator.macroState).toBe('idle');
    });

    it('should produce different behaviors with different seeds', () => {
      const gen1 = new BehaviorGenerator({ seed: 1 });
      const gen2 = new BehaviorGenerator({ seed: 2 });

      const pose1 = gen1.update(16);
      const pose2 = gen2.update(16);

      // Different seeds should (likely) produce different poses
      const anyDifferent =
        pose1.headSwayX !== pose2.headSwayX ||
        pose1.headSwayZ !== pose2.headSwayZ ||
        pose1.breathingAmplitude !== pose2.breathingAmplitude;

      expect(anyDifferent).toBe(true);
    });
  });

  describe('Telemetry', () => {
    it('should provide telemetry data', () => {
      generator.update(16);
      const telemetry = generator.getTelemetry();

      expect(telemetry).toHaveProperty('macroState');
      expect(telemetry).toHaveProperty('elapsedTime');
      expect(telemetry).toHaveProperty('samples');
    });

    it('should track macro state in telemetry', () => {
      const telemetry1 = generator.getTelemetry();
      expect(telemetry1.macroState).toBe('idle');

      generator.macroState = 'lookLeft';
      const telemetry2 = generator.getTelemetry();
      expect(telemetry2.macroState).toBe('lookLeft');
    });

    it('should track elapsed time', () => {
      generator.update(16);
      const telemetry1 = generator.getTelemetry();

      generator.update(100);
      const telemetry2 = generator.getTelemetry();

      expect(telemetry2.elapsedTime).toBeGreaterThan(telemetry1.elapsedTime);
    });
  });

  describe('Update Loop', () => {
    it('should accumulate elapsed time', () => {
      expect(generator.elapsed).toBe(0);

      generator.update(16);
      expect(generator.elapsed).toBeCloseTo(0.016, 3);

      generator.update(16);
      expect(generator.elapsed).toBeCloseTo(0.032, 3);
    });

    it('should return pose object on each update', () => {
      for (let i = 0; i < 10; i++) {
        const pose = generator.update(16);
        expect(typeof pose).toBe('object');
        expect(pose !== null).toBe(true);
      }
    });

    it('should handle variable deltaTime', () => {
      const poses = [];
      poses.push(generator.update(16)); // 60fps
      poses.push(generator.update(33)); // 30fps
      poses.push(generator.update(8)); // 120fps

      // All should produce valid poses
      poses.forEach((pose) => {
        expect(pose).toHaveProperty('headSwayX');
      });
    });
  });
});
