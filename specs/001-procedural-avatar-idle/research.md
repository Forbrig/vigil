++# Research: Procedural Avatar Idle Behavior

Decision: Use Vite + React + SCSS with `three` + `@react-three/fiber` for rendering; procedural motion implemented in-browser using layered noise and an event-weighted sequencer.

Rationale: Vite provides minimal build overhead. `@react-three/fiber` integrates Three.js with React component model, simplifying lifecycle and swaps. Procedural generation avoids large animation assets and enables infinite variation.

Alternatives considered:

- Motion-capture playback: higher realism but requires asset storage and causes repetition; rejected due to FR constraints (procedural-only).
- WebGL raw (no React): slightly lower overhead but higher integration complexity for React consumers; rejected to keep embedding ergonomic.

Motion design patterns evaluated:

- Layered noise-driven micro-movements (head sway, eyelid jitter, breathing) — lightweight and continuous.
- Event-weighted state machine for macro actions (look, shift weight, gesture) to avoid mechanical repetition.
- Seeded PRNG + slight parameter jitter to enable deterministic tests and long non-repetition windows.

Performance & low-resource strategy:

- Low-resource mode reduces sampling rate, lowers bone updates, and uses simplified LOD meshes or skinned-to-vertex shader simplifications.
- Profiling plan: use requestAnimationFrame sample of frame times and instrument via `performance.now()`; expose summarized telemetry events.

Dependencies (minimal):

- `react`, `react-dom`, `vite`, `sass` (SCSS), `three`, `@react-three/fiber`, `simplex-noise` (small), `vitest`, `@testing-library/react`, `playwright` (optional for visual tests).

Unknowns / NEEDS CLARIFICATION (to resolve in Phase 0):

- FR-008a persistence scope: Should behavior state persist across browser sessions or server-side? (Spec currently marks as NEEDS CLARIFICATION.)

Decision log: select `simplex-noise` for noise generation (small, battle-tested) and an internal sequencer combining weighted timers with constraints to avoid repetition.
