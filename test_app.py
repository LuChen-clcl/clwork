import base64
import tempfile
import unittest
from unittest import mock
from pathlib import Path
import re
import json
import ssl
from http.client import IncompleteRead
from urllib import error

import app
from bg_remove import remove_background_from_data_url
from PIL import Image


class TapShowHelpersTest(unittest.TestCase):
    def test_bbox_defaults_without_points(self):
        bbox = app.bbox_from_points([], 1000, 800)
        self.assertGreater(bbox["width"], 0)
        self.assertGreater(bbox["height"], 0)

    def test_generate_sticker_asset_uses_fixed_prompt(self):
        canvas = app.CanvasContext(
            id="canvas-1",
            image_data_url="data:image/png;base64,AAA=",
            width=1000,
            height=800,
            created_at="now",
            sketch_points=[],
        )
        sticker = app.generate_sticker_asset(canvas, [{"x": 120, "y": 80}, {"x": 190, "y": 130}])
        self.assertEqual(sticker["fixed_prompt"], app.FIXED_PROMPT_TEMPLATE)
        self.assertTrue(sticker["image_data_url"].startswith("data:image/svg+xml;base64,"))

    def test_postprocess_adds_mount(self):
        processed = app.postprocess_sticker(
            {
                "image_data_url": "data:image/svg+xml;base64,AAA=",
                "bounding_box": {"x": 0, "y": 0, "width": 120, "height": 80},
                "recommended_anchor": "head_top",
                "tags": [],
            }
        )
        self.assertEqual(processed["mount"]["anchor"], "head_top")
        self.assertEqual(processed["content_type"], "image/png")

    def test_postprocess_downloads_remote_images_before_background_removal(self):
        sticker = {
            "image_data_url": "https://example.com/generated.png",
            "image_data_urls": ["https://example.com/generated.png"],
            "bounding_box": {"x": 0, "y": 0, "width": 120, "height": 80},
            "recommended_anchor": "face",
            "tags": [],
        }
        with mock.patch("app.download_image_as_data_url", return_value="data:image/png;base64,Zm9v") as download_mock:
            with mock.patch("app.remove_background_from_data_url", return_value="data:image/png;base64,YmFy") as remove_mock:
                processed = app.postprocess_sticker(sticker)
        download_mock.assert_called_once_with("https://example.com/generated.png")
        remove_mock.assert_called_once_with("data:image/png;base64,Zm9v")
        self.assertEqual(processed["image_data_url"], "data:image/png;base64,YmFy")

    def test_json_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "items.json"
            payload = [{"id": "a"}]
            app.write_json(path, payload)
            self.assertEqual(app.read_json(path), payload)

    def test_normalize_b64_image(self):
        value = app.normalize_b64_image("Zm9v")
        self.assertTrue(value.startswith("data:image/png;base64,"))

    def test_call_ark_image_generation_retries_without_ssl_verification_on_cert_failure(self):
        seen_contexts = []

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                return json.dumps({"data": [{"b64_json": "Zm9v"}]}).encode("utf-8")

        cert_error = error.URLError(ssl.SSLCertVerificationError("CERTIFICATE_VERIFY_FAILED"))

        def fake_urlopen(_req, timeout=180, context=None):
            seen_contexts.append(context)
            if context is None:
                raise cert_error
            return FakeResponse()

        with mock.patch("app.load_model_config", return_value={"api_key": "k", "model": "m", "base_urls": ["https://example.com"]}):
            with mock.patch("app.request.urlopen", side_effect=fake_urlopen):
                result = app.call_ark_image_generation(["data:image/png;base64,AAA="], 1)

        self.assertEqual(result["model"], "m")
        self.assertEqual(len(seen_contexts), 2)
        self.assertIsNone(seen_contexts[0])
        self.assertIsInstance(seen_contexts[1], ssl.SSLContext)

    def test_open_ark_request_parses_partial_body_from_incomplete_read(self):
        payload = json.dumps({"data": [{"b64_json": "Zm9v"}]}).encode("utf-8")

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def read(self):
                raise IncompleteRead(payload, 12)

        with mock.patch("app.request.urlopen", return_value=FakeResponse()):
            data = app.open_ark_request(mock.Mock(), timeout=1)

        self.assertEqual(data["data"][0]["b64_json"], "Zm9v")

    def test_call_ark_image_generation_uses_url_response_format_and_downloads_urls(self):
        seen_payloads = []

        def fake_open_ark_request(req, timeout=180):
            seen_payloads.append(json.loads(req.data.decode("utf-8")))
            return {"data": [{"url": "https://example.com/generated.png"}]}

        with mock.patch("app.load_model_config", return_value={"api_key": "k", "model": "m", "base_urls": ["https://example.com"]}):
            with mock.patch("app.open_ark_request", side_effect=fake_open_ark_request):
                with mock.patch("app.download_image_as_data_url", return_value="data:image/png;base64,Zm9v"):
                    result = app.call_ark_image_generation(["data:image/png;base64,AAA="], 3)

        self.assertEqual(seen_payloads[0]["response_format"], "url")
        self.assertEqual(result["image_data_url"], "data:image/png;base64,Zm9v")

    def test_remove_background_from_data_url(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.png"
            image = Image.new("RGBA", (4, 4), (255, 255, 255, 255))
            image.putpixel((1, 1), (255, 0, 0, 255))
            image.save(path)
            sample = app.normalize_b64_image(base64.b64encode(path.read_bytes()).decode("ascii"))
        result = remove_background_from_data_url(sample)
        self.assertTrue(result.startswith("data:image/png;base64,"))

    def test_mobile_sticker_preview_has_layer_above_stage_scrim(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        match = re.search(r"#sticker-preview\s*\{([^}]*)\}", styles, re.S)
        self.assertIsNotNone(match)
        self.assertIn("z-index", match.group(1))

    def test_mobile_result_candidate_panel_is_visible_in_create_shell(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="mobile-result-candidates"', html)
        self.assertRegex(
            html,
            r'<section id="mobile-result-candidates"[\s\S]*?<div id="candidate-list" class="mini-tile-list"></div>',
        )

    def test_mobile_result_candidate_panel_has_result_phase_visibility_rules(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".mobile-result-candidates", styles)
        self.assertIn('.mobile-create-shell[data-phase="result"] #mobile-result-candidates', styles)

    def test_tracking_loop_uses_visible_camera_feed_for_mobile_tab1(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        match = re.search(r"function startTrackingLoop\(\) \{(.*?)const remoteVideo =", script, re.S)
        self.assertIsNotNone(match)
        self.assertIn("const video = els.cameraFeed;", match.group(1))

    def test_mobile_camera_feed_uses_contain_to_avoid_zoomed_preview(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        match = re.search(r"#camera-feed\s*\{([^}]*)\}", styles, re.S)
        self.assertIsNotNone(match)
        self.assertIn("object-fit: contain", match.group(1))

    def test_mobile_camera_feed_waits_for_video_metadata_before_showing(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn('els.cameraFeed.dataset.ready = "false";', script)
        self.assertIn('els.cameraFeed.dataset.ready = "true";', script)
        self.assertIn('addEventListener("loadedmetadata"', script)
        self.assertIn('addEventListener("canplay"', script)
        self.assertIn('addEventListener("playing"', script)
        self.assertIn("els.cameraFeed.readyState >= 2", script)
        self.assertIn('#camera-feed[data-ready="false"]', styles)
        self.assertIn("opacity: 0;", styles)

    def test_mobile_camera_feed_is_mirrored_for_selfie_preview(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        match = re.search(r"#camera-feed\s*\{([^}]*)\}", styles, re.S)
        self.assertIsNotNone(match)
        self.assertIn("transform: scaleX(-1)", match.group(1))

    def test_single_mode_generation_uses_reference_and_sketch_images(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("const { referenceImageDataUrl, sketchImageDataUrl } = state.lockedGenerationInputs;", script)
        self.assertIn("sourceImages: [referenceImageDataUrl, sketchImageDataUrl]", script)

    def test_sticker_positioning_supports_mirrored_stage_projection(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("function imagePointToStagePoint(point, containerEl, sourceWidth, sourceHeight, options = {})", script)
        self.assertIn("const projectedX = options.mirrorX ? layout.sourceWidth - point.x : point.x;", script)
        self.assertIn("mirrorX: true", script)

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

    def test_tab_bar_contains_icon_markup(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn("tab-icon-camera", html)
        self.assertIn("tab-icon-social", html)
        self.assertIn("tab-icon-library", html)

    def test_styles_use_dark_tiktok_theme_tokens(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn("--bg: #0a0a0f;", styles)
        self.assertIn("--accent-hot: #fe2c55;", styles)
        self.assertIn("--accent-cool: #25f4ee;", styles)

    def test_tab1_primary_actions_are_icon_led(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="capture-photo"', html)
        self.assertIn('aria-label="Capture frame"', html)
        self.assertNotIn(">拍下<", html)
        self.assertNotIn(">开画<", html)
        self.assertNotIn(">生成<", html)

    def test_tab2_control_ids_remain_stable(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        for control_id in [
            "multi-create-room",
            "multi-join-room",
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

    def test_asset_drawer_mount_points_remain_present(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="discover-list"', html)
        self.assertIn('id="mine-templates"', html)
        self.assertIn('id="mine-assets"', html)

    def test_tab3_has_top_filters_for_activity_creative_and_mine(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="asset-top-tabs"', html)
        self.assertIn('data-asset-tab="activity"', html)
        self.assertIn('data-asset-tab="creative"', html)
        self.assertIn('data-asset-tab="mine"', html)
        self.assertIn("活动", html)
        self.assertIn("创意", html)
        self.assertIn("我的", html)

    def test_tab3_script_tracks_active_top_filter(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('assetTab: "activity"', script)
        self.assertIn("function setAssetTab(", script)
        self.assertIn("els.assetTabButtons", script)
        self.assertIn("els.assetPanels", script)

    def test_tab3_mock_data_and_two_column_sticker_grids_exist(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("sticker-grid", html)
        self.assertIn(".sticker-grid", styles)
        self.assertIn("repeat(2, minmax(0, 1fr))", styles)
        self.assertIn("夏日多巴胺贴纸大赛", script)
        self.assertIn("MOCK_CREATIVE_TEMPLATES", script)
        self.assertIn("MOCK_MY_ASSETS", script)

    def test_tab3_styles_reduce_activity_card_height_and_add_content_gap(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".asset-card.active", styles)
        self.assertIn("padding-top: 12px;", styles)
        self.assertIn(".activity-hero-preview", styles)
        self.assertIn(".activity-hot-preview", styles)
        self.assertIn("aspect-ratio: 1.95;", styles)

    def test_tab3_activity_panel_uses_hero_and_hot_contest_layout(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("MOCK_ACTIVITY_HERO", script)
        self.assertIn("MOCK_HOT_CONTESTS", script)
        self.assertIn("夏日多巴胺贴纸大赛", script)
        self.assertIn("热门赛题", script)
        self.assertIn("activity-hero", styles)
        self.assertIn("activity-hot-grid", styles)
        self.assertIn("asset-tab-icon", styles)

    def test_index_uses_versioned_assets_and_aria_labels(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertRegex(html, r"/styles\.css\?v=\d{8}[a-z]")
        self.assertRegex(html, r"/app\.js\?v=\d{8}[a-z]")
        self.assertIn("aria-label=", html)

    def test_mobile_action_bar_supports_dynamic_single_or_row_layout(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('.mobile-action-bar[data-visible-count="1"]', styles)
        self.assertIn("updateCreateActionBarLayout()", script)

    def test_build_ws_message_has_expected_envelope(self):
        message = app.build_ws_message(
            "peer_joined",
            "room-1",
            from_user_id="user-a",
            to_user_id="user-b",
            payload={"displayName": "B"},
        )
        self.assertEqual(message["type"], "peer_joined")
        self.assertEqual(message["roomId"], "room-1")
        self.assertEqual(message["fromUserId"], "user-a")
        self.assertEqual(message["toUserId"], "user-b")
        self.assertEqual(message["payload"], {"displayName": "B"})
        self.assertIn("timestamp", message)

    def test_room_peer_user_id_finds_other_side(self):
        room = {
            "host_user_id": "user-a",
            "guest_user_id": "user-b",
        }
        self.assertEqual(app.room_peer_user_id(room, "user-a"), "user-b")
        self.assertEqual(app.room_peer_user_id(room, "user-b"), "user-a")

    def test_frontend_includes_websocket_room_bridge(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("new WebSocket(", script)
        self.assertIn("/ws?roomId=", script)
        self.assertIn("handleSocketMessage", script)

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

    def test_tab2_script_defines_phase_and_primary_subject_state(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('tab2Phase: "live"', script)
        self.assertIn('tab2PrimarySubject: "remote"', script)
        self.assertIn("function setTab2Phase(", script)
        self.assertIn("function setTab2PrimarySubject(", script)
        self.assertIn("function updateTab2UI()", script)

    def test_tab2_swap_is_explicit_and_phase_locked(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("function canSwapTab2Stages()", script)
        self.assertIn('["live", "result"]', script)
        self.assertIn("function swapTab2Stages()", script)
        self.assertIn("els.multiSwapStage.addEventListener", script)

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

    def test_tab2_remote_flow_reuses_phase_machine_transitions(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn('setTab2Phase("captured")', script)
        self.assertIn('setTab2Phase("drawing")', script)
        self.assertIn('setTab2Phase("generating")', script)
        self.assertIn('setTab2Phase("result")', script)

    def test_tab2_styles_include_small_and_large_screen_dual_stage_rules(self):
        styles = (Path(app.ROOT) / "static" / "styles.css").read_text(encoding="utf-8")
        self.assertIn(".stage-panel-primary", styles)
        self.assertIn(".stage-panel-secondary", styles)
        self.assertIn("@media (min-width: 900px)", styles)

    def test_tab2_action_buttons_include_short_visible_labels(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        for label in ["连线", "定格", "返回", "确定", "重画", "施法", "再创", "发送"]:
            self.assertIn(label, html)

    def test_tab2_live_phase_uses_connection_gated_actions(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("const hasLiveRemote = Boolean(state.multi.remoteStream);", script)
        self.assertIn('els.multiStartRealtime.style.display = phase === "live" && !hasLiveRemote ? "" : "none";', script)
        self.assertIn('els.multiRefreshFrame.style.display = phase === "live" && hasLiveRemote && state.multi.tab2PrimarySubject === "remote" ? "" : "none";', script)

    def test_tab2_has_setup_and_workspace_sections(self):
        html = (Path(app.ROOT) / "static" / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="multi-setup-card"', html)
        self.assertIn('id="multi-setup-entry"', html)
        self.assertIn('id="multi-setup-join"', html)
        self.assertIn('id="multi-entry-create"', html)
        self.assertIn('id="multi-entry-join"', html)
        self.assertIn('id="multi-join-submit"', html)
        self.assertIn('id="multi-workspace-shell"', html)
        self.assertIn('id="multi-session-name"', html)
        self.assertIn('id="multi-session-room"', html)

    def test_tab2_script_updates_setup_vs_workspace_visibility(self):
        script = (Path(app.ROOT) / "static" / "app.js").read_text(encoding="utf-8")
        self.assertIn("function updateMultiPanelState()", script)
        self.assertIn('setupStep: "entry"', script)
        self.assertIn("els.multiSetupEntry", script)
        self.assertIn("els.multiSetupJoin", script)
        self.assertIn("els.multiSetupCard", script)
        self.assertIn("els.multiWorkspaceShell", script)


if __name__ == "__main__":
    unittest.main()
