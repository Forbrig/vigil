# Vigil Concept Document

## Purpose

Vigil is a digital humanoid avatar that shares the screen with the user and creates a persistent feeling of being observed while they work or study.

The core effect is psychological presence: the avatar should feel attentive, alive, and mildly supervisory without becoming repetitive or scripted.

## Core Experience

The user should feel:

- "This character is paying attention to me."
- "Its behavior is not on a fixed loop."
- "It sometimes disappears and returns, as if patrolling."
- "Even random actions still look intentional and watchful."

## Behavioral Pillars

### 1. Constant Watchfulness

The avatar should repeatedly orient its attention toward the user viewpoint.

- Frequent gaze corrections toward the camera/user
- Subtle head and torso adjustments that imply tracking
- Short attention shifts away from user, then back to user

### 2. Unpredictable Motion

Movement must avoid obvious loops and fixed animation cycles.

- Use procedural variation in timing, amplitude, and sequence order
- Combine micro-movements (breathing, posture sway, eye/head shifts) with occasional macro-actions
- Keep transitions organic, not abrupt or robotic

### 3. Patrol In and Out of View

The avatar should not remain static in one place for long periods.

- Sometimes exits frame partially or fully
- Returns after variable durations
- Re-entry should still suggest continuity of awareness (e.g., peeking back in, checking from edge, stepping back into center)

### 4. Supervisory Personality

Random behavior should still reinforce the "supervising" tone.

- Idle actions can include stance changes, brief pacing, looking over shoulder, "inspection" pauses
- Avoid playful actions that break the mood (unless explicitly configured later)
- The default tone is neutral-serious, attentive, and calm

## Motion Design Rules

- No long deterministic loops
- No exact repetition of the same behavior block in short windows
- Weighted randomness over pure randomness to preserve believability
- Maintain readable silhouette and clear gaze direction
- Prioritize subtlety during normal idle periods; use stronger actions occasionally

## Interaction Model

The avatar is ambient and autonomous by default.

- No direct user control required for baseline behavior
- Presence should begin quickly after load
- Behavior continues continuously while app is active
- If performance constraints exist, degrade quality while preserving watchfulness cues
- The model should be customizable, allowing the user to change the appearance of the avatar and its behavior (in the future).

## Non-Goals (Current Scope)

- Fixed choreographed animation loops as the primary behavior system
- Cartoon/comedic personality as default
- Explicit biometric or personal-data tracking
- Heavy interaction UI for manual animation control

## Implementation Direction (High Level)

Use a layered behavior system:

1. Base Presence Layer: breathing, posture drift, gaze stabilization
2. Attention Layer: user-facing look-at logic, periodic re-focus
3. Action Layer: random supervisory actions selected by weighted state machine
4. Patrol Layer: leave/return logic with variable timing and position

This supports unpredictability while keeping a consistent "vigil" identity.

## Acceptance Signals

The concept is successful when observers report:

- The avatar appears to be watching them most of the time
- Motion feels varied and non-repetitive over extended viewing
- Leaving/re-entering behavior feels intentional, not like a glitch
- Overall impression is "supervising presence," not random noise

## One-Sentence Product Statement

Vigil is an ambient humanoid screen companion that procedurally behaves like a calm, unpredictable supervisor that keeps watching while the user works.
