# TapShow TikTok-Style Frontend Redesign

Date: 2026-05-23

## Goal

Redesign the entire TapShow frontend from a soft claymorphism web prototype into a TikTok-style short-video editing interface.

The product goals are:

- Make the UI feel like a mobile-first capture and editing tool, not a desktop web app.
- Remove as much visible text as possible across the interface.
- Use icon-led navigation and controls throughout the product.
- Preserve the current backend APIs, room logic, generation flow, and asset persistence.
- Keep the existing Tab1 single-stage mobile flow and improve its visual language rather than rewriting the feature logic again.

## Non-Goals

- No backend API changes.
- No room protocol changes.
- No sticker generation pipeline changes.
- No face-tracking algorithm changes.
- No redesign of data storage format.
- No attempt to make the app fully text-free in situations where text is required for usability or debugging.

## Product Direction

The chosen direction is a short-video editing aesthetic rather than a livestream dashboard or content feed.

This means:

- Dark UI by default.
- Full-screen or near-full-screen stage areas.
- Floating controls instead of heavy card layouts.
- High-contrast neon accents inspired by short-video tools.
- Tool-first interaction design with minimal explanatory copy.

The UI should feel closer to a camera/editor surface than to a documentation-heavy web app.

## Core Visual System

### Color

Replace the current pastel claymorphism palette with a dark short-video palette:

- Primary background: near-black charcoal.
- Secondary surface: dark graphite with slightly translucent overlays.
- Accent 1: saturated TikTok-style red/pink.
- Accent 2: cool cyan highlight for depth and active glow.
- Neutral icons and separators: off-white and muted gray.

The visual contrast should come from glow, edge light, and layered opacity rather than soft white cards.

### Surfaces

Current rounded white glass cards should be replaced by:

- Dark translucent panels.
- Thin inner borders or faint neon outlines.
- Compact elevated tool surfaces.
- Sharper separation between stage and controls.

Cards should feel like editing modules, not soft content containers.

### Motion

Use restrained motion:

- Small active-state glow pulses.
- Smooth panel and tab transitions.
- Short press feedback for icon controls.
- Generation overlay animation can remain, but should be tuned to the darker visual language.

Avoid decorative floatiness that conflicts with the editing-tool tone.

### Typography

Text will be minimized, not celebrated.

- Reduce visible labels wherever icon meaning is clear.
- Retain readable typography only for required text surfaces such as room IDs, errors, system feedback, and rare metadata.
- The interface should never depend on long textual explanations in default view.

## Text Strategy

### Principle

The interface should be as text-light as possible.

Visible text should appear only where one of these is true:

- The user needs exact machine-readable information, such as a room ID.
- The user needs an error or permission explanation.
- The action cannot be safely understood by icon alone.
- A fallback message is needed when content is empty.

### What Becomes Icon-Only

- Bottom navigation.
- Tab1 primary actions.
- Most action controls in Tab2.
- Most utility controls in Tab3.
- Phase indicators where a symbol or motion is sufficient.

### What May Keep Text

- Permission failures.
- API or connection errors.
- Room code fields.
- Empty-state fallback if an area would otherwise become confusing.
- Asset metadata only when necessary and small.

## Navigation Design

### Bottom Navigation

Keep the three-entry bottom navigation, but remove all always-visible text.

The navigation will use three semantic icons:

- Tab1: camera icon.
- Tab2: dual-person social interaction icon.
- Tab3: asset box or resource drawer icon.

### States

- Default state: icon only.
- Active state: glowing capsule base or highlighted plate beneath the icon.
- Inactive state: lower brightness and no label.

No persistent Chinese labels should be visible in the tab bar.

### Accessibility

Even though the visual UI is textless, icon buttons and tabs must keep accessible labels via ARIA attributes.

This preserves usability without forcing visible text into the interface.

## Tab1 Design

### Intent

Tab1 remains the main product surface and should feel like a short-video capture/edit pipeline.

The flow remains:

1. Live camera capture.
2. Freeze frame.
3. Sketch on the frozen frame.
4. Generate sticker.
5. Return to live camera with sticker mounted and tracked.

### Layout

Tab1 keeps the single-stage architecture already introduced:

- One main stage.
- One floating top status area.
- One bottom icon-led action cluster.
- Optional brush color control shown only while sketching.

### Visual Changes

- The stage becomes darker and more immersive.
- The top bar becomes lighter in weight and more symbolic.
- Bottom actions become icon pills or icon capsules with no persistent visible words.
- The stage should resemble a short-video editor viewport.

### Candidate Handling

Current candidate rendering should be visually minimized in the default Tab1 experience.

If candidates must still exist in logic, the default UI should emphasize the mounted result rather than a visible multi-card gallery.

### Save Actions

Save actions should remain available, but should appear as icon controls rather than labeled utility buttons.

## Tab2 Design

### Intent

Tab2 should shift from “form page for multiplayer setup” into “collaboration control deck”.

### Layout Changes

- Compress the room status into a top strip or compact control header.
- Keep the dual-stage structure functionally, but style it like paired monitoring panes.
- Reduce visible textual framing and use icons for actions such as create, join, copy, pull, send, and connect.

### Text Exceptions

Room ID and connection errors remain textual.

Those are high-precision values and cannot reasonably become icon-only.

### Visual Tone

- Deep dark panels.
- Compact utility controls.
- More technical live-session feel.

## Tab3 Design

### Intent

Tab3 becomes an asset drawer or sticker library rather than a document-like asset listing page.

### Layout Changes

- Denser visual grid.
- Larger emphasis on thumbnails.
- Lighter metadata footprint.
- Smaller captions or no captions where content is visually obvious.

### Empty States

Empty states may still keep minimal text because completely silent empty grids are ambiguous.

Those text fragments should stay short and secondary.

## Icon System

### Principles

- Icons must be semantically obvious.
- Prefer outline or duotone neon line icons over flat emoji-like glyphs.
- Use one icon family consistently across the product.
- Icons should remain legible against dark backgrounds.

### Required Icon Mappings

- Capture / create: camera.
- Draw / sketch: pen or brush.
- Generate: wand, spark, or effect icon.
- Retry / restart: refresh or replay arrow.
- Save image: download or image save icon.
- Save sticker: sticker badge or layered asset icon.
- Connect: dual-person interaction symbol.
- Library: asset box / tray / sticker drawer.

## Technical Design

### Scope of Code Changes

This redesign is primarily a frontend rewrite of presentation and interaction chrome:

- `static/styles.css`
- `static/index.html`
- `static/app.js`

Backend Python endpoints remain untouched except where tests inspect static files.

### Preferred Implementation Strategy

1. Replace global theme tokens first.
2. Replace bottom navigation structure and icon markup.
3. Restyle Tab1 controls and stage chrome.
4. Restyle Tab2 controls and dual panes.
5. Restyle Tab3 asset grid.
6. Remove or hide redundant visible text across all tabs.
7. Add ARIA labels where visible text is removed.

### Stability Requirements

- Preserve all current DOM hooks needed by JavaScript unless intentionally refactored in the same change.
- Avoid breaking the camera, sketch, generation, and tracking flow in Tab1.
- Avoid touching multiplayer request/response logic.
- Avoid changing any existing API contract.

## Testing Strategy

### Automated

- Keep current Python tests passing.
- Add regression tests where practical for static UI guarantees, especially icon-only navigation and key DOM presence.

### Manual

Manual verification is required for:

- Tab1 camera flow.
- Sticker generation visibility.
- Sticker mount and tracking while moving.
- Tab2 room flow.
- Tab3 asset visibility.
- Mobile viewport layout.

### Accessibility

Check:

- ARIA labels on icon-only controls.
- Keyboard focus visibility where possible.
- Sufficient icon contrast against the dark background.

## Risks

### Risk 1: Over-removing text

If text is removed too aggressively, the app may look sleek but become harder to understand.

Mitigation:

- Keep text only where precision or recovery is needed.
- Use ARIA labels and strong icon semantics.

### Risk 2: Style rewrite destabilizes current Tab1 logic

The current Tab1 was recently reworked into a single-stage mobile flow.

Mitigation:

- Treat that logic as the base.
- Prefer restyling and controlled DOM edits over another structural rewrite.

### Risk 3: Tab2 becomes visually cleaner but operationally unclear

Mitigation:

- Keep room ID, join state, and connection errors explicit.
- Only iconize actions, not essential session data.

## Deliverables

The implementation should deliver:

- A dark TikTok-style visual system.
- Icon-only bottom tab navigation.
- Text-minimized controls across the app.
- A stronger short-video editing feel in Tab1.
- Consistent styling for Tab2 and Tab3.
- Preserved core functionality.

## Final Decision Summary

Approved design choices:

- Overall style: short-video editing aesthetic.
- Bottom navigation: three tabs retained.
- Tab bar labels: fully hidden in visible UI.
- Tab icons:
  - camera for capture
  - dual-person interaction for multiplayer
  - asset box/drawer for library
- Text strategy: minimize across the entire frontend, keep only essential text.
- Tab1: preserve single-stage mobile flow, restyle rather than rebuild.
- Backend/API scope: unchanged.
