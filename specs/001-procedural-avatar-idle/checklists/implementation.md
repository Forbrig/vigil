# Implementation Alignment Checklist: Vigil Behavioral Pillars

**Purpose**: Validate completeness, clarity, and measurability of the recommended changes before implementation
**Created**: 2026-06-13
**Scope**: Aligning `generator.js` and `AvatarCanvas.jsx` with `VIGIL_CONCEPT.md` behavioral pillars
**Reference docs**: [VIGIL_CONCEPT.md](../../../VIGIL_CONCEPT.md), [spec.md](../spec.md), [plan.md](../plan.md)

---

## `generator.js` — New Macro State Definitions

> Tests whether the requirements for each new state are complete and unambiguous enough to implement.

- [ ] CHK001 — Is the `lookAtUser` pose fully specified? The concept references "head forward, direct gaze at camera" but does not define `headRotationY`, `headRotationX`, or `eyeLookX/Y` target values in neutral-forward orientation. [Clarity, Gap]

- [ ] CHK002 — Is the duration range for `lookAtUser` defined? Without a `{ min, max }` duration, the state machine cannot schedule transitions. The concept does not quantify "frequent gaze corrections." [Completeness, Gap — Concept §Pillar 1]

- [ ] CHK003 — Is the `inspectionPause` pose specified beyond "forward lean, slow head scan, held stillness"? Specific bone targets (`spineRotationX` lean angle, `headRotationY` scan arc, scan speed/frequency) are absent from the recommendation. [Clarity, Gap]

- [ ] CHK004 — Is the `inspectionPause` duration range defined? "Held stillness" implies longer dwell, but no min/max is specified. Does it require a minimum dwell at scan endpoints before transitioning out? [Completeness, Gap — Concept §Pillar 4]

- [ ] CHK005 — Is the `lookOverShoulder` rotation magnitude defined precisely? "~180°" is approximate; the pose generator needs an exact radian value for `spineRotationY` and `headRotationY` to avoid clipping or unnatural limits. [Clarity, Gap]

- [ ] CHK006 — Does the `lookOverShoulder` requirement specify which direction(s) are valid — left only, right only, or randomized per invocation? Ambiguity here produces inconsistent behavior across transitions. [Clarity, Gap]

- [ ] CHK007 — Is the `patrol` state specified as a delta per frame or an absolute target position? The recommendation says "X-axis position translation to slide avatar out of frame" but does not define slide speed, easing curve, or final X offset value. [Clarity, Gap — Concept §Pillar 3]

- [ ] CHK008 — Does the `patrol` requirement define what "out of frame" means measurably? Frame boundaries depend on camera FOV, distance, and aspect ratio. Is the exit offset a hardcoded constant, a viewport-relative calculation, or configurable via `sceneWeights`? [Measurability, Gap — Concept §Pillar 3]

- [ ] CHK009 — Is the `returnToCenter` target position explicitly specified as `x=0` or relative to an initial spawn position? If the avatar's starting position is not guaranteed to be origin, `returnToCenter` could be ambiguous. [Clarity, Gap]

- [ ] CHK010 — Does the `patrol` / `returnToCenter` pair specify how position translation is applied? The current `applyPose` pipeline operates on bone rotations via `adapter.applyPose()`. Is a position channel (`hipsTranslateX` or root group position) defined and supported by the adapter? [Dependency, Gap — plan.md]

- [ ] CHK011 — Are the new states (`lookAtUser`, `inspectionPause`, `lookOverShoulder`, `patrol`, `returnToCenter`) listed as a complete and closed set, or are additional supervisory states implied? [Completeness, Concept §Pillar 4]

---

## `generator.js` — State Transition Weight Rebalancing

> Tests whether the weight constraints are specific, consistent, and leave a valid probability distribution.

- [ ] CHK012 — Are the idle `nextStates` weights for all states (including new ones) specified to sum to 1.0? The recommendation says ~60% watchfulness and ~30% look-away but does not account for walk, lookingAround, or patrol in the remaining ~10%. [Completeness, Consistency]

- [ ] CHK013 — Is the distinction between "demote `run`" and "remove `run`" from the `idle` nextStates resolved? The recommendation says "remove or demote to `sceneWeights` override" — two different behaviors with different implementation implications. [Clarity, Gap]

- [ ] CHK014 — Are the return-state weights for look-away states (`lookLeft`, `lookRight`, `lookDown`, `lookingAround`) specified to route toward `lookAtUser` as dominant? The recommendation identifies this as a requirement but provides no concrete weights for these transitions. [Completeness, Gap]

- [ ] CHK015 — Does the weight rebalancing spec account for `patrol` and `returnToCenter` as a forced sequential pair? Can `patrol` appear in `idle` nextStates independently, or must it always be followed by `returnToCenter`? [Consistency, Gap — Concept §Pillar 3]

- [ ] CHK016 — Is the total weight normalization behavior documented? The current `_transitionMacroState` divides by `totalWeight`, allowing unnormalized weight sets. Does the requirement intend for raw weights or normalized (summing to 1.0) weights? [Clarity]

---

## `generator.js` — Deprecation / Removal of `run`

> Tests whether the `run` state removal is specified with enough precision to be safe.

- [ ] CHK017 — Is the `run` removal scoped precisely? The recommendation says "remove or demote." If `run` remains in `macroStates` but is removed from `idle.nextStates`, is it still reachable via `setMacroState()` forcibly? Should it throw or silently no-op? [Clarity, Gap]

- [ ] CHK018 — Are any existing references to `run` in tests, documentation, or contracts (`contracts/avatar-api.md`) required to be updated as part of this change? The requirement does not enumerate downstream artifacts. [Dependency, Gap]

- [ ] CHK019 — Does the concept document explicitly prohibit running, or only say the tone is "calm, neutral-serious"? Is this exclusion a hard rule or a soft default that can be overridden via `sceneWeights`? [Clarity — Concept §Pillar 4, Consistency]

---

## `generator.js` — Pose Completeness for Supervisory States

> Tests whether micro-movement interaction with new macro poses is specified.

- [ ] CHK020 — Are requirements defined for how `inspectionPause` interacts with micro-movement primitives? Should breathing and head sway continue during a "held stillness" pause, or should amplitudes be suppressed to reinforce the stillness quality? [Completeness, Concept §Motion Design Rules]

- [ ] CHK021 — Is a `microWeight` override specified for supervisory states? The existing walk state overrides `microWeight` to 0.4. Should `inspectionPause` and `lookAtUser` have similar overrides to control how much procedural noise bleeds through? [Completeness, Gap]

- [ ] CHK022 — Are the `lookAtUser` pose values defined relative to the camera's position, or as fixed bone angles? If camera position changes (e.g., user adjusts OrbitControls), does the state specification require the pose to dynamically track, or remain at a fixed forward pose? [Clarity, Gap — Concept §Pillar 1]

---

## `generator.js` — Patrol Layer Architecture

> Tests whether the patrol feature has sufficient architectural requirements to avoid breaking the existing pose pipeline.

- [ ] CHK023 — Is it specified whether position translation for patrol is applied inside `_generateMacroMovement()` as a pose key, or as a separate `groupRef.position.x` mutation in `AvatarScene.useFrame()`? These two approaches have different integration contracts. [Clarity, Dependency]

- [ ] CHK024 — Does the requirement define patrol/return as interruptible? If a forced macro state (`setMacroState`) is called while patrol is active, what should happen to the in-progress translation? [Edge Case, Gap]

- [ ] CHK025 — Is re-entry behavior during `returnToCenter` specified beyond "return to center"? The concept says re-entry should "suggest continuity of awareness (e.g., peeking back in, checking from edge)." Is this visual framing a requirement or aspirational? [Clarity — Concept §Pillar 3]

---

## `AvatarCanvas.jsx` — Behavior Control UI Requirements

> Tests whether the UI update requirements are complete and consistent with the generator changes.

- [ ] CHK026 — Are requirements defined for which new states appear as manual trigger buttons in the debug control panel? The recommendation says "update AvatarCanvas behavior control buttons to expose new states" but does not specify which states are public-facing vs. internal-only. [Completeness, Gap]

- [ ] CHK027 — Is the `run` button removal from the UI specified alongside the generator-level demotion? If `run` is retained in `macroStates` but absent from the UI, is that the intended contract? [Consistency, Gap]

- [ ] CHK028 — Is the `activeMacro` polling synchronization requirement updated? The UI polling reads `gen.macroState`. During the `patrol` → `returnToCenter` sequence, should the UI display both states distinctly or show a single composite label? [Completeness, Edge Case]

- [ ] CHK029 — Are accessibility requirements (ARIA labels, keyboard nav) defined for the new state buttons? The existing buttons have no `aria-label` attributes; is this pattern intentionally extended to new buttons or a known gap? [Coverage, Gap]

---

## Consistency with Existing Spec and Plan

> Tests whether the recommended changes are consistent with already-approved documents.

- [ ] CHK030 — Are the five new macro states (`lookAtUser`, `inspectionPause`, `lookOverShoulder`, `patrol`, `returnToCenter`) consistent with the state machine design documented in [plan.md](../plan.md)? The plan may enumerate states that conflict with or duplicate these additions. [Consistency — plan.md]

- [ ] CHK031 — Does [spec.md](../spec.md) define acceptance criteria for Pillar 3 (patrol) that can be used to verify the `patrol`/`returnToCenter` implementation is correct? Without measurable criteria, the patrol feature has no clear definition of done. [Measurability — spec.md §Acceptance]

- [ ] CHK032 — Is the concept's "no exact repetition in short windows" rule addressable by the current weighted-random state machine? The `lookAtUser` dominant-return design could create near-loops (idle → lookLeft → lookAtUser → idle → lookLeft…). Is anti-repetition a requirement for state selection? [Consistency — Concept §Motion Design Rules]

- [ ] CHK033 — Does the API contract in [contracts/avatar-api.md](../contracts/avatar-api.md) enumerate valid macro state names? If so, adding five new states and removing/demoting `run` constitutes a breaking change that requires a contract version bump or amendment. [Dependency, Consistency]

---

## Acceptance Criteria Quality

> Tests whether success conditions for the overall alignment work are measurable.

- [ ] CHK034 — Is there a measurable threshold for "frequent gaze corrections"? The concept says the avatar should "appear to be watching them most of the time." Does this translate to a minimum percentage of time spent in `lookAtUser` or `idle` (both forward-facing)? [Measurability — Concept §Acceptance Signals]

- [ ] CHK035 — Is the patrol frequency defined measurably? "Sometimes exits frame" is not schedulable. Is there a minimum interval (e.g., once every N minutes) or a probability weight from `idle` that defines expected patrol cadence? [Measurability — Concept §Pillar 3]

- [ ] CHK036 — Are the acceptance signals from the concept document ("observers report…") reflected as testable criteria in spec.md, or do they remain as qualitative observer impressions only? [Measurability — Concept §Acceptance Signals]

- [ ] CHK037 — Is there a definition for "supervisory tone" that can be evaluated in a code review? Without a measurable filter (e.g., no rotation values exceeding X radians, no locomotion speed exceeding Y), reviewers cannot objectively reject a pose definition as "not supervisory." [Measurability — Concept §Pillar 4]
