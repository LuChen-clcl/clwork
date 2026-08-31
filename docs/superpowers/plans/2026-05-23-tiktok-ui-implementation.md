# TikTok-Style Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework TapShow into a dark, TikTok-style, mobile-first editing UI with icon-led navigation and minimal visible text while preserving the current feature flow and backend contracts.

**Architecture:** Keep the current frontend file structure and behavior model, but replace the visual system, navigation markup, and control chrome in controlled slices. Treat `static/app.js` as the interaction/state source of truth, `static/index.html` as the DOM contract, and `static/styles.css` as the visual system and layout engine. Preserve existing IDs and API calls unless a matching JavaScript update ships in the same task.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript module, Python `unittest` for regression checks, built-in HTTP server.

---

## File Map

- Modify: `static/index.html`
  - Replace visible text-heavy nav and controls with icon-led markup.
  - Add ARIA labels to icon-only controls.
  - Keep JS hook IDs stable where possible.
- Modify: `static/styles.css`
  - Replace claymorphism variables and component styles with dark TikTok-style tokens.
  - Restyle bottom nav, Tab1 stage, Tab2 panes, and Tab3 asset grid.
  - Control text visibility and icon-first states.
- Modify: `static/app.js`
  - Update tab markup handling for icon-only navigation.
  - Reduce visible text rendering in Tab1/Tab2/Tab3 where safe.
  - Keep state machine and API usage intact.
- Modify: `test_app.py`
  - Add regression tests for icon-only navigation, ARIA labels, and key DOM hooks.

## Task 1: Lock the Current DOM and Navigation Contract

**Files:**
- Modify: `test_app.py`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing tests**

```python
    def test_bottom_tabs_render_without_visible_chinese_labels(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('data-tab="create"', html)
        self.assertIn('data-tab="multi"', html)
        self.assertIn('data-tab="assets"', html)
        self.assertNotIn("Tab1 单人创作", html)
        self.assertNotIn("Tab2 双人/多人互动", html)
        self.assertNotIn("Tab3 资产库", html)

    def test_icon_only_tabs_keep_accessible_labels(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('aria-label="Capture"', html)
        self.assertIn('aria-label="Connect"', html)
        self.assertIn('aria-label="Library"', html)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because the current HTML still contains visible Chinese tab labels and lacks the final ARIA labels for the icon-only tab bar.

- [ ] **Step 3: Write minimal implementation**

Update the bottom tab section in `static/index.html` so the buttons become icon-only controls with ARIA labels and no visible Chinese text:

```html
      <nav class="bottom-tabs" aria-label="Primary">
        <button class="tab-button active" data-tab="create" type="button" aria-label="Capture">
          <span class="tab-icon tab-icon-camera" aria-hidden="true">
            <span class="tab-camera-body"></span>
            <span class="tab-camera-lens"></span>
          </span>
        </button>
        <button class="tab-button" data-tab="multi" type="button" aria-label="Connect">
          <span class="tab-icon tab-icon-social" aria-hidden="true">
            <span class="tab-social-head head-a"></span>
            <span class="tab-social-head head-b"></span>
            <span class="tab-social-link"></span>
          </span>
        </button>
        <button class="tab-button" data-tab="assets" type="button" aria-label="Library">
          <span class="tab-icon tab-icon-library" aria-hidden="true">
            <span class="tab-library-top"></span>
            <span class="tab-library-box"></span>
          </span>
        </button>
      </nav>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the new tab tests while all existing tests remain green.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html
git commit -m "test: lock icon-only tab navigation contract"
```

## Task 2: Replace Global Theme Tokens and Surface Styles

**Files:**
- Modify: `static/styles.css`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a regression test that checks the new dark visual tokens exist:

```python
    def test_styles_use_dark_tiktok_theme_tokens(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("--bg: #0a0a0f;", styles)
        self.assertIn("--accent-hot: #fe2c55;", styles)
        self.assertIn("--accent-cool: #25f4ee;", styles)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because the current stylesheet still uses the pastel claymorphism tokens.

- [ ] **Step 3: Write minimal implementation**

Replace the root design tokens in `static/styles.css` with a dark set and update the body/surface primitives:

```css
:root {
  --bg: #0a0a0f;
  --bg-elevated: #12121a;
  --panel: rgba(18, 18, 26, 0.82);
  --panel-strong: rgba(24, 24, 34, 0.94);
  --line: rgba(255, 255, 255, 0.08);
  --text: #f5f7fb;
  --muted: rgba(245, 247, 251, 0.58);
  --accent-hot: #fe2c55;
  --accent-cool: #25f4ee;
  --glow-hot: 0 0 22px rgba(254, 44, 85, 0.28);
  --glow-cool: 0 0 22px rgba(37, 244, 238, 0.24);
  --panel-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
}

body {
  color: var(--text);
  background:
    radial-gradient(circle at top left, rgba(254, 44, 85, 0.12), transparent 24%),
    radial-gradient(circle at bottom right, rgba(37, 244, 238, 0.12), transparent 26%),
    linear-gradient(180deg, #050507 0%, #0a0a0f 100%);
}

.clay-card,
.clay-surface {
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(18px);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the token test and all prior tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/styles.css
git commit -m "style: replace clay theme with dark tiktok tokens"
```

## Task 3: Implement the Icon-Only Bottom Navigation

**Files:**
- Modify: `static/index.html`
- Modify: `static/styles.css`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a test that checks the icon-specific tab classes exist:

```python
    def test_tab_bar_contains_icon_markup(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn("tab-icon-camera", html)
        self.assertIn("tab-icon-social", html)
        self.assertIn("tab-icon-library", html)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because the specific icon markup has not yet been added.

- [ ] **Step 3: Write minimal implementation**

Add bottom-nav styling that produces icon-only tabs with a hot/cool active glow:

```css
.bottom-tabs {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px 16px 18px;
  background: linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(10, 10, 15, 0.94) 28%);
}

.tab-button {
  min-height: 64px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: none;
}

.tab-button.active {
  background:
    linear-gradient(135deg, rgba(254, 44, 85, 0.18), rgba(37, 244, 238, 0.14)),
    rgba(255, 255, 255, 0.05);
  box-shadow: var(--glow-hot), var(--glow-cool);
}

.tab-icon {
  position: relative;
  width: 28px;
  height: 28px;
  display: inline-block;
}
```

Then add the camera/social/library icon shape rules under the same section.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the icon-markup test and all earlier tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html static/styles.css
git commit -m "feat: add icon-only bottom tab bar"
```

## Task 4: Convert Tab1 Controls to Text-Minimized Short-Video Tools

**Files:**
- Modify: `static/index.html`
- Modify: `static/styles.css`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add tests that verify the visible Tab1 action labels are removed and ARIA labels remain:

```python
    def test_tab1_primary_actions_are_icon_led(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="capture-photo"', html)
        self.assertIn('aria-label="Capture frame"', html)
        self.assertNotIn(">拍下<", html)
        self.assertNotIn(">开画<", html)
        self.assertNotIn(">生成<", html)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL because Tab1 still contains visible action labels.

- [ ] **Step 3: Write minimal implementation**

Update Tab1 buttons in `static/index.html` to icon-only markup:

```html
<button id="capture-photo" class="mobile-pill-button mobile-primary" type="button" aria-label="Capture frame" disabled>
  <span class="tool-icon tool-icon-shutter" aria-hidden="true"></span>
</button>
```

Repeat for:

- `restart-capture` with `aria-label="Retake frame"`
- `start-sketch` with `aria-label="Start sketch"`
- `clear-sketch` with `aria-label="Clear sketch"`
- `generate-sticker` with `aria-label="Generate sticker"`
- `save-capture` with `aria-label="Save result image"`
- `save-sticker` with `aria-label="Save sticker"`
- `redo-creation` with `aria-label="Restart creation"`

Then style them in `static/styles.css` with compact dark capsules and glow-only active states. Do not remove the IDs.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the icon-led action test and all existing tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html static/styles.css
git commit -m "feat: convert tab1 controls to icon-only tools"
```

## Task 5: Restyle Tab1 Stage, Brush Control, and Generation UI

**Files:**
- Modify: `static/styles.css`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a test for the Tab1 stage classes that support the dark editing layout:

```python
    def test_mobile_stage_styles_include_dark_editor_shell(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".mobile-camera-stage", styles)
        self.assertIn(".mobile-brush-toolbar", styles)
        self.assertIn(".generation-overlay", styles)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 test_app.py`

Expected: FAIL if those sections are missing after any refactor, or stay green if only visual changes are needed and the next step is purely CSS replacement. If it stays green, proceed and use this as a guardrail test.

- [ ] **Step 3: Write minimal implementation**

Refine the Tab1 presentation:

```css
.mobile-camera-stage {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.48)),
    linear-gradient(180deg, #0f1016 0%, #09090d 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mobile-brush-toolbar {
  background: rgba(17, 17, 24, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.generation-spell {
  background: rgba(15, 16, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

In `static/app.js`, minimize visible hint text in `setCreatePhase()` and rely on symbols plus ARIA, while still keeping internal state updates intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS with no regression to existing Tab1 behavior tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/styles.css static/app.js
git commit -m "style: restyle tab1 stage as dark short-video editor"
```

## Task 6: Restyle Tab2 as a Collaboration Control Deck

**Files:**
- Modify: `static/index.html`
- Modify: `static/styles.css`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a test that ensures Tab2 keeps its current control IDs while allowing icon-led markup:

```python
    def test_tab2_control_ids_remain_stable(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        for control_id in [
            "multi-create-room",
            "multi-join-room",
            "multi-copy-room",
            "multi-start-camera",
            "multi-start-realtime",
            "multi-send-frame",
            "multi-refresh-frame",
            "multi-back-to-video",
            "multi-clear-sketch",
            "multi-generate-sticker",
            "multi-send-sticker",
        ]:
            self.assertIn(f'id="{control_id}"', html)
```

- [ ] **Step 2: Run test to verify it fails or guards the refactor**

Run: `python3 test_app.py`

Expected: PASS today. Use it as a protection test before rewriting Tab2 markup.

- [ ] **Step 3: Write minimal implementation**

Update Tab2 buttons to icon-first controls with ARIA labels and minimal or no visible text. Restyle the room card into a compact session header and the video panes into dark monitor windows. Keep room ID input text visible. Preserve all current element IDs and event bindings.

Key CSS directions:

```css
.multi-room-card {
  background: rgba(15, 15, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.multi-state-pill {
  background: rgba(254, 44, 85, 0.12);
  color: var(--text);
  box-shadow: var(--glow-hot);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the ID stability test and all existing tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/index.html static/styles.css static/app.js
git commit -m "style: convert tab2 into dark collaboration deck"
```

## Task 7: Restyle Tab3 into a Dense Asset Drawer

**Files:**
- Modify: `static/styles.css`
- Modify: `static/app.js`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a test that protects the three asset list containers:

```python
    def test_asset_drawer_mount_points_remain_present(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="discover-list"', html)
        self.assertIn('id="mine-templates"', html)
        self.assertIn('id="mine-assets"', html)
```

- [ ] **Step 2: Run test to verify it fails or guards the refactor**

Run: `python3 test_app.py`

Expected: PASS today. Use it to guard the restyle.

- [ ] **Step 3: Write minimal implementation**

In `static/styles.css`, compress Tab3 into a denser dark grid:

```css
.asset-grid {
  grid-template-columns: 1fr;
  gap: 14px;
}

.tile {
  background: rgba(18, 18, 26, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.tile p {
  display: none;
}
```

In `static/app.js`, reduce asset card text generation where safe, favoring thumbnails and short titles only.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for the mount-point test and all existing tests.

- [ ] **Step 5: Commit**

```bash
git add test_app.py static/styles.css static/app.js
git commit -m "style: compress tab3 into dark asset drawer"
```

## Task 8: Final Accessibility, Cache Busting, and Regression Sweep

**Files:**
- Modify: `static/index.html`
- Modify: `test_app.py`
- Test: `test_app.py`

- [ ] **Step 1: Write the failing test**

Add a final test that checks cache-busting URLs and ARIA labels exist together:

```python
    def test_index_uses_versioned_assets_and_aria_labels(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertRegex(html, r"/styles\\.css\\?v=\\d{8}[a-z]")
        self.assertRegex(html, r"/app\\.js\\?v=\\d{8}[a-z]")
        self.assertIn("aria-label=", html)
```

- [ ] **Step 2: Run test to verify it fails or guards the release**

Run: `python3 test_app.py`

Expected: PASS only after the final version bump and ARIA work are complete.

- [ ] **Step 3: Write minimal implementation**

Update `static/index.html` to the final production cache-busting version string for both CSS and JS after all UI changes land, and confirm every icon-only control has an ARIA label.

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 test_app.py`

Expected: PASS for all tests.

- [ ] **Step 5: Run manual verification**

Run:

```bash
python3 app.py
```

Manual checks:

- Open `http://127.0.0.1:8000`
- Verify bottom nav is icon-only
- Verify Tab1 controls are icon-led and dark themed
- Verify sticker generation still mounts and tracks
- Verify Tab2 controls still operate
- Verify Tab3 still loads assets

Expected: UI matches the dark TikTok-style spec and core flows still function.

- [ ] **Step 6: Commit**

```bash
git add test_app.py static/index.html static/styles.css static/app.js
git commit -m "feat: complete tiktok-style frontend redesign"
```

## Self-Review

- Spec coverage:
  - Global dark theme: Tasks 2, 3, 5.
  - Icon-only tabs: Tasks 1 and 3.
  - Text-minimized Tab1: Tasks 4 and 5.
  - Dark Tab2 collaboration deck: Task 6.
  - Dark Tab3 asset drawer: Task 7.
  - Accessibility and release hardening: Task 8.
- Placeholder scan:
  - No `TODO`, `TBD`, or content-free “add tests later” steps remain.
  - Every task includes exact files, commands, and concrete expected outcomes.
- Type and ID consistency:
  - Existing DOM IDs are preserved in every task that touches interactive controls.
  - Test steps reference the same filenames and command path (`python3 test_app.py`) consistently.
