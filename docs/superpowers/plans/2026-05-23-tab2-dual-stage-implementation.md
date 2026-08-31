# Tab2 Dual-Stage Interaction Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Tab2 into a Tab1-like dual-stage collaboration flow with a dominant primary stage, tappable secondary stage swap, and state-driven controls.

**Architecture:** Keep the current room/WebRTC/generation logic in `static/app.js`, but add a dedicated Tab2 state machine and a primary-subject model on top of it. Update `static/index.html` so Tab2 renders as one dominant stage plus one small stage, then drive responsive behavior and button visibility from data attributes in `static/styles.css`.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript module, Python `unittest`, built-in HTTP/WebSocket server.

---

## File Map

- Modify: `static/index.html`
  - Replace Tab2’s equal two-pane markup with explicit primary/secondary stage wrappers.
  - Keep existing hook IDs for video, frame, sketch, and sticker elements where possible.
- Modify: `static/styles.css`
  - Add responsive primary/small-stage layout rules for phone and desktop.
  - Add state-driven visibility for Tab2 action groups and swap affordance.
- Modify: `static/app.js`
  - Add `tab2Phase` and `tab2PrimarySubject`.
  - Centralize Tab2 button visibility, stage assignment, and swap locking.
  - Reuse existing room/frame/generation functions behind the new state machine.
- Modify: `test_app.py`
  - Add regression coverage for Tab2 state metadata, dual-stage wrappers, swap gating, and primary-stage action rules.

## Task 1: Lock the New Tab2 DOM Contract

**Files:**
- Modify: `test_app.py`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_contains_primary_and_secondary_stage_wrappers(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="multi-primary-stage"', html)
        self.assertIn('id="multi-secondary-stage"', html)
        self.assertIn('id="multi-swap-stage"', html)

    def test_tab2_shell_exposes_phase_and_primary_subject(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="multi-stage-shell"', html)
        self.assertIn('data-phase="live"', html)
        self.assertIn('data-primary-subject="remote"', html)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because Tab2 still uses the old `multi-stage-grid` structure and has no phase/primary-subject shell metadata.

- [ ] **Step 3: Write minimal implementation**

Update the Tab2 section in `static/index.html` so the old two-equal-panel layout becomes a single stage shell with explicit primary and secondary wrappers:

```html
        <section class="panel" id="panel-multi">
          <div id="multi-stage-shell" class="multi-stage-shell" data-phase="live" data-primary-subject="remote">
            <section class="clay-card multi-room-card">
              ...
            </section>

            <section class="multi-dual-stage">
              <div id="multi-primary-stage" class="stage-panel clay-card stage-panel-primary">
                ...
              </div>

              <button id="multi-swap-stage" class="stage-panel clay-card stage-panel-secondary" type="button" aria-label="Swap stages">
                ...
              </button>
            </section>
          </div>
        </section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the new DOM tests and all existing tests remain green.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html
git commit -m "test: lock tab2 dual-stage dom contract"
```

## Task 2: Add Tab2 State Fields and a Single UI Update Entry Point

**Files:**
- Modify: `test_app.py`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_script_defines_phase_and_primary_subject_state(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('tab2Phase: "live"', script)
        self.assertIn('tab2PrimarySubject: "remote"', script)
        self.assertIn("function setTab2Phase(", script)
        self.assertIn("function setTab2PrimarySubject(", script)
        self.assertIn("function updateTab2UI()", script)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because `state.multi` does not yet define `tab2Phase` or `tab2PrimarySubject`, and there is no centralized update function.

- [ ] **Step 3: Write minimal implementation**

Add the new state fields and UI helpers near the existing Tab2 helpers in `static/app.js`:

```js
  multi: {
    roomId: "",
    role: "",
    userId: "",
    remoteUserId: "",
    tab2Phase: "live",
    tab2PrimarySubject: "remote",
    ...
  },
```

```js
function setTab2Phase(phase) {
  state.multi.tab2Phase = phase;
  updateTab2UI();
}

function setTab2PrimarySubject(subject) {
  state.multi.tab2PrimarySubject = subject;
  updateTab2UI();
}

function updateTab2UI() {
  const shell = els.multiStageShell;
  if (!shell) return;
  shell.dataset.phase = state.multi.tab2Phase;
  shell.dataset.primarySubject = state.multi.tab2PrimarySubject;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the new state helper test and all earlier tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/app.js
git commit -m "feat: add tab2 phase and primary subject state"
```

## Task 3: Wire Primary/Secondary Stage Assignment and Tap-To-Swap

**Files:**
- Modify: `test_app.py`
- Modify: `static/app.js`
- Modify: `static/index.html`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_swap_is_explicit_and_phase_locked(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("function canSwapTab2Stages()", script)
        self.assertIn('["live", "result"]', script)
        self.assertIn("function swapTab2Stages()", script)
        self.assertIn("els.multiSwapStage.addEventListener", script)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because Tab2 does not yet have phase-gated stage swapping.

- [ ] **Step 3: Write minimal implementation**

Add DOM hooks:

```js
  multiStageShell: document.querySelector("#multi-stage-shell"),
  multiPrimaryStage: document.querySelector("#multi-primary-stage"),
  multiSecondaryStage: document.querySelector("#multi-secondary-stage"),
  multiSwapStage: document.querySelector("#multi-swap-stage"),
```

Then add the swap helpers:

```js
function canSwapTab2Stages() {
  return ["live", "result"].includes(state.multi.tab2Phase);
}

function swapTab2Stages() {
  if (!canSwapTab2Stages()) return;
  const next = state.multi.tab2PrimarySubject === "remote" ? "local" : "remote";
  setTab2PrimarySubject(next);
}
```

Bind the event:

```js
  els.multiSwapStage.addEventListener("click", () => {
    swapTab2Stages();
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the swap-lock test and all previous tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/app.js static/index.html
git commit -m "feat: add tab2 tap-to-swap stage behavior"
```

## Task 4: Convert Tab2 Controls to Phase-Driven Visibility

**Files:**
- Modify: `test_app.py`
- Modify: `static/index.html`
- Modify: `static/app.js`
- Modify: `static/styles.css`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_action_groups_exist_for_state_driven_visibility(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('data-tab2-actions="live"', html)
        self.assertIn('data-tab2-actions="captured"', html)
        self.assertIn('data-tab2-actions="drawing"', html)
        self.assertIn('data-tab2-actions="result"', html)

    def test_tab2_styles_define_phase_visibility_rules(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn('.multi-stage-shell[data-phase="live"]', styles)
        self.assertIn('[data-tab2-actions="drawing"]', styles)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because Tab2 still exposes its controls in one always-visible row.

- [ ] **Step 3: Write minimal implementation**

Split the current Tab2 buttons into action groups inside `static/index.html`:

```html
<div class="multi-action-bar">
  <div class="controls controls-compact" data-tab2-actions="live">
    <button id="multi-start-realtime" ...></button>
    <button id="multi-capture-subject" ...></button>
  </div>
  <div class="controls controls-compact" data-tab2-actions="captured">
    <button id="multi-discard-capture" ...></button>
    <button id="multi-confirm-capture" ...></button>
  </div>
  <div class="controls controls-compact" data-tab2-actions="drawing">
    <button id="multi-clear-sketch" ...></button>
    <button id="multi-generate-sticker" ...></button>
  </div>
  <div class="controls controls-compact" data-tab2-actions="result">
    <button id="multi-redo-flow" ...></button>
    <button id="multi-send-sticker" ...></button>
  </div>
</div>
```

Add CSS visibility rules:

```css
.multi-action-bar [data-tab2-actions] {
  display: none;
}

.multi-stage-shell[data-phase="live"] [data-tab2-actions="live"],
.multi-stage-shell[data-phase="captured"] [data-tab2-actions="captured"],
.multi-stage-shell[data-phase="drawing"] [data-tab2-actions="drawing"],
.multi-stage-shell[data-phase="result"] [data-tab2-actions="result"] {
  display: flex;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the Tab2 action-group tests and all existing tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html static/app.js static/styles.css
git commit -m "feat: make tab2 controls phase driven"
```

## Task 5: Rebind Existing Remote Flow to the New Tab2 Phase Machine

**Files:**
- Modify: `test_app.py`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_remote_flow_reuses_phase_machine_transitions(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('setTab2Phase("captured")', script)
        self.assertIn('setTab2Phase("drawing")', script)
        self.assertIn('setTab2Phase("generating")', script)
        self.assertIn('setTab2Phase("result")', script)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because the current remote flow still only updates ad hoc room messages and raw element visibility.

- [ ] **Step 3: Write minimal implementation**

Update the existing functions in `static/app.js`:

- When remote frame is successfully fetched for creation, call:

```js
showRemoteFrame(response.frame);
setTab2Phase("captured");
```

- When the user confirms the frozen frame:

```js
setTab2Phase("drawing");
```

- Before remote sticker generation starts:

```js
setTab2Phase("generating");
```

- After postprocess and preview state are ready:

```js
setTab2Phase("result");
```

- When restarting:

```js
clearMultiRemoteSketch(true);
state.multi.remoteSticker = null;
setTab2Phase("live");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the transition test and all other tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/app.js
git commit -m "feat: bind tab2 remote flow to phase machine"
```

## Task 6: Make the Dual-Stage Layout Responsive on Phone and Desktop

**Files:**
- Modify: `test_app.py`
- Modify: `static/styles.css`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_tab2_styles_include_small_and_large_screen_dual_stage_rules(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".stage-panel-primary", styles)
        self.assertIn(".stage-panel-secondary", styles)
        self.assertIn("@media (min-width: 900px)", styles)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because Tab2 does not yet have primary/secondary stage-specific responsive rules.

- [ ] **Step 3: Write minimal implementation**

Add CSS that makes the secondary stage a picture-in-picture tile on small screens and an anchored side tile on large screens:

```css
.multi-dual-stage {
  position: relative;
  min-height: 62vh;
}

.stage-panel-primary {
  min-height: 62vh;
}

.stage-panel-secondary {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: min(32vw, 152px);
  aspect-ratio: 9 / 16;
  z-index: 4;
}

@media (min-width: 900px) {
  .multi-dual-stage {
    min-height: 72vh;
    padding-right: 220px;
  }

  .stage-panel-secondary {
    right: 24px;
    top: 24px;
    bottom: auto;
    width: 184px;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the responsive layout test and all earlier tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/styles.css
git commit -m "style: add responsive tab2 primary and secondary stages"
```

## Task 7: Final Integration Verification and Cache Bust

**Files:**
- Modify: `static/index.html`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

No new unit test is required here. This task is a verification and delivery task that should not change behavior beyond asset versioning.

- [ ] **Step 2: Run verification commands**

Run:

```bash
python3 test_app.py
node --check static/app.js
curl -sS http://127.0.0.1:8000/
```

Expected:

- `OK` from `python3 test_app.py`
- no output from `node --check static/app.js`
- served HTML includes the new Tab2 shell and the latest asset version suffix

- [ ] **Step 3: Bump asset version**

Update `static/index.html`:

```html
<link rel="stylesheet" href="/styles.css?v=20260523h" />
...
<script src="/app.js?v=20260523h" type="module"></script>
```

- [ ] **Step 4: Re-run verification**

Run:

```bash
python3 test_app.py
curl -sS http://127.0.0.1:8000/
```

Expected:

- tests remain green
- HTML references `20260523h`

- [ ] **Step 5: Commit**

```bash
git add static/index.html test_app.py static/styles.css static/app.js
git commit -m "feat: ship tab2 dual-stage interaction redesign"
```
