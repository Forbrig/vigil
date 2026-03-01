++# Data Model: Procedural Avatar Feature

Entities

- Avatar (component)
  - id: string
  - modelAdapter: Adapter reference (implements `loadModel`, `applyPose`)
  - config: { intensity, mode, seed, lowResource }
  - state: { currentPoseSummary, macroState }

- Behavior Generator
  - seed: number
  - rng: PRNG instance
  - microPrimitives: list of noise-driven transforms (name, amplitude, frequency)
  - macroSequencer: weighted-state machine (states, weights, cooldowns)
  - historyBuffer: ring buffer of recent pose summaries for repetition detection

- Runtime Controller
  - visibility: visible|hidden
  - perfMode: normal|low
  - fpsTarget
  - telemetryEmitter

Behavioral accessibility mapping

- The `Runtime Controller` MUST observe OS/browser accessibility signals (e.g., `prefers-reduced-motion`) and set `perfMode` to `low` when the preference is present. When `perfMode` is `low` the `Behavior Generator` reduces macro actions, lowers sampling frequency for micro-primitives, and shortens or simplifies transitions to minimize perceived motion while preserving subtle presence.

- Telemetry/Diagnostics
  - events: { type, timestamp, payload }
  - samples: periodic perf samples { fps, cpuTime } (used for assertions)

Relationships

- `Avatar` aggregates `Behavior Generator` and `Runtime Controller`.
- `Behavior Generator` emits pose updates which `Avatar.adapter` maps to model transforms.

Validation rules

- `seed` optional; if provided, behavior generator must be deterministic for test runs.
- `historyBuffer` size configurable (used for repetition heuristics).

State transitions

- `Runtime Controller` visibility: hidden -> visible triggers smooth blend-in of behavior over 300-600ms.
- `perfMode` toggle reduces microPrimitives sampling frequency and simplifies pose blending.
