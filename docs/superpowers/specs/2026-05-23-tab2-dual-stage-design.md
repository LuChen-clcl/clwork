# Tab2 Dual-Stage Interaction Redesign

Date: 2026-05-23

## Goal

Redesign Tab2 from a tool-dense multiplayer control panel into a stage-first collaboration flow that matches Tab1.

The new Tab2 should:

- Use one primary stage and one secondary stage.
- Default to remote-first collaboration, with the remote side shown on the large stage.
- Allow switching the large and small stages by tapping the small stage.
- Reuse the same interaction rhythm as Tab1 for capture, sketch, generate, and result preview.
- Keep the current room, WebRTC, sticker generation, and asset APIs intact.

## Non-Goals

- No backend protocol redesign as part of this UI pass.
- No change to the current WebRTC transport model.
- No change to the sticker generation pipeline.
- No support for editing both sides at the same time.
- No attempt to make the dual-stage layout identical on phone and desktop.

## Product Direction

Tab2 should feel like a live collaboration camera surface rather than a multiplayer operations console.

The large stage defines the current subject of work.
The small stage is a monitoring surface only.

The user should always know:

- which side is currently the focus,
- whether the current focus is live, frozen, drawing, generating, or showing a result,
- and what the next action is.

## Layout Model

### Shared Rule

At any time there are only two visible stage roles:

- `primary stage`: the active work surface
- `secondary stage`: the passive monitor

Only the primary stage may:

- enter frozen-frame mode,
- show a sketch canvas,
- show generation overlay,
- show result-first editing actions

The secondary stage may:

- preview the other side
- be tapped to swap primary and secondary roles

### Default Assignment

On entering Tab2:

- primary stage: remote side
- secondary stage: local side

This means the default experience is “edit for the other person”.

### Stage Swap

Swapping is triggered by tapping the small stage.

Rules:

- Tap on the secondary stage swaps primary and secondary roles.
- No separate swap button is shown.
- Swapping is allowed only in `live` and `result` states.
- Swapping is disabled during `captured`, `drawing`, and `generating`.

This prevents losing the frozen frame or sketch state midway through an editing sequence.

## Responsive Layout

### Small Screens

On small screens:

- primary stage fills most of the available height
- secondary stage appears as a floating picture-in-picture tile
- controls remain in one bottom action bar, following Tab1

This should feel close to a mobile short-video editor.

### Large Screens

On large screens:

- primary stage remains visually dominant
- secondary stage becomes a smaller anchored side panel or inset tile
- the action bar remains tied to the primary stage rather than splitting into separate per-stage toolbars

The large-screen layout should preserve the same mental model instead of reverting to the old two-equal-pane dashboard.

## Interaction Model

Tab2 follows the same single-subject rhythm as Tab1, but the subject is whichever side is currently on the large stage.

### States

The primary state machine is:

1. `live`
2. `captured`
3. `drawing`
4. `generating`
5. `result`

### Meaning Of Each State

#### `live`

- Primary stage shows the active side's real-time video when available.
- Secondary stage shows the opposite side.
- User may swap stages.
- User may trigger capture on the current primary subject.

#### `captured`

- Primary stage freezes the current subject frame.
- Secondary stage stays visible as passive monitor.
- User may either discard this frame or confirm it for drawing.

#### `drawing`

- Sketch layer appears only on the primary stage.
- Brush controls appear only in this state.
- User may clear and redraw.
- Secondary stage remains passive.

#### `generating`

- Primary stage stays frozen.
- Generation overlay appears on the primary stage.
- Swap is disabled.
- Action bar is reduced to loading state.

#### `result`

- Primary stage returns to the current subject's live video if available.
- The generated sticker is mounted and previewed on the primary subject.
- User may restart creation.
- If the subject is remote, the user may send the generated result to the other side.
- Swap becomes available again.

## Subject Rules

### Remote As Primary

When the remote side is primary:

- capture means pulling and freezing the latest remote frame
- drawing happens on the remote frozen frame
- generate means generating a sticker for the remote side
- result means previewing the generated sticker on the remote live video
- send means delivering the chosen sticker payload to the remote user

This is the default collaboration flow.

### Local As Primary

When the local side is primary:

- the user is reviewing or previewing their own side
- capture and drawing behavior can mirror Tab1 where technically possible
- send-to-peer is not the default call-to-action in this mode

This mode exists mainly as a viewing and confirmation mode rather than the core creation path.

## Controls

Tab2 should stop exposing the full old toolbar all at once.

### Room Controls

Room creation and join controls remain in a compact top strip because they are setup actions, not stage actions.

They may keep limited text where precision is required:

- nickname input
- room code input
- connection state pill

### Stage Controls

The main action bar should mirror Tab1 and change by state.

#### `live`

- connect / ready action if needed
- capture current primary subject

#### `captured`

- discard current frame
- confirm and move to drawing

#### `drawing`

- clear sketch
- generate

#### `result`

- restart
- send if primary subject is remote

Only actions relevant to the current state remain visible.

## Button Behavior

The same visual rule as Tab1 applies:

- if only one action is visible, center it
- if multiple actions are visible, place them in one row

This keeps Tab2 visually aligned with Tab1.

## Data Flow Mapping

The redesign is intentionally a UI/state-machine rewrite over existing logic.

### Existing Logic To Reuse

- room create/join
- WebSocket room presence and signaling
- remote frame fetch
- sticker generation
- sticker postprocess
- send sticker payload
- local and incoming sticker mounting

### Existing Logic To De-emphasize

- old two-column equal-importance dashboard framing
- showing all multiplayer actions at once
- separate remote editing controls detached from stage state

## Error Handling

Errors remain textual and should be shown in the connection state pill or compact status area.

High-priority failures include:

- room creation/join failure
- socket disconnect
- camera permission failure
- remote frame unavailable
- generation failure
- send failure

When a failure happens mid-flow:

- the current stage should remain understandable
- the action bar should expose the single most relevant recovery step

## Testing

The implementation should add regression coverage for:

- presence of primary and secondary stage wrappers
- presence of a dedicated small-stage tap target
- Tab2 state metadata or data attributes for `live`, `captured`, `drawing`, `generating`, and `result`
- stage-swap lock during frozen/drawing/generating states
- state-driven button visibility rules

## Implementation Notes

The cleanest path is to treat Tab2 as a second single-stage state machine, not as an extension of the old multi-tool room UI.

This suggests:

- adding explicit `tab2Phase`
- adding explicit `tab2PrimarySubject` with values like `remote` or `local`
- centralizing Tab2 button visibility in one state update function
- centralizing stage role rendering in one layout update function

The final interface should feel like “pick a subject and create on the big screen” rather than “manage a multiplayer toolkit”.
