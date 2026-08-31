const state = {
  fixedPrompt: "服务端固定 Prompt 已更新为双图输入版本：图1用于理解，图2用于生成。",
  createPhase: "camera",
  canvas: null,
  sketchStrokes: [],
  currentStroke: null,
  brushColor: "#ff6242",
  currentSticker: null,
  assetTab: "activity",
  staticMode: false,
  cameraStream: null,
  faceLandmarkerVideo: null,
  faceLandmarkerImage: null,
  trackingLoopStarted: false,
  lastTrackedVideoTime: -1,
  lastFaceResult: null,
  initialFaceResult: null,
  binding: null,
  lockedGenerationInputs: null,
  multi: {
    setupStep: "entry",
    roomId: "",
    role: "",
    userId: "",
    remoteUserId: "",
    tab2Phase: "live",
    tab2PrimarySubject: "remote",
    socket: null,
    socketConnected: false,
    pollTimer: null,
    latestRemoteFrame: null,
    peerConnection: null,
    remoteStream: null,
    isMakingOffer: false,
    remoteSketchStrokes: [],
    currentRemoteStroke: null,
    remoteSticker: null,
    remoteViewMode: "video",
    remoteBinding: null,
    remoteInitialFaceResult: null,
    incomingSticker: null,
    incomingBinding: null,
    incomingInitialFaceResult: null,
    lastRemoteTrackedVideoTime: -1,
  },
};

const FACE_TRACKER_BUNDLE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";
const FACE_TRACKER_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_TRACKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const els = {
  tabs: [...document.querySelectorAll(".tab-button")],
  panels: {
    create: document.querySelector("#panel-create"),
    multi: document.querySelector("#panel-multi"),
    assets: document.querySelector("#panel-assets"),
  },
  fixedPrompt: document.querySelector("#fixed-prompt"),
  generationOverlay: document.querySelector("#generation-overlay"),
  mobileCreateShell: document.querySelector(".mobile-create-shell"),
  mobilePhaseChip: document.querySelector("#mobile-phase-chip"),
  mobileHint: document.querySelector("#mobile-hint"),
  stageScrim: document.querySelector("#stage-scrim"),
  restartCapture: document.querySelector("#restart-capture"),
  startSketch: document.querySelector("#start-sketch"),
  redoCreation: document.querySelector("#redo-creation"),
  capturePhoto: document.querySelector("#capture-photo"),
  brushToolbar: document.querySelector("#brush-toolbar"),
  brushHue: document.querySelector("#brush-hue"),
  brushColorPreview: document.querySelector("#brush-color-preview"),
  baseImage: document.querySelector("#base-image"),
  cameraFeed: document.querySelector("#camera-feed"),
  previewFeed: document.querySelector("#preview-feed"),
  previewStage: document.querySelector("#preview-stage") || document.querySelector("#camera-stage"),
  stage: document.querySelector("#camera-stage"),
  sketchLayer: document.querySelector("#sketch-layer"),
  stickerPreview: document.querySelector("#sticker-preview"),
  statusText: document.querySelector("#status-text"),
  inputImageList: document.querySelector("#input-image-list"),
  stickerMeta: document.querySelector("#sticker-meta"),
  candidateList: document.querySelector("#candidate-list"),
  generateButton: document.querySelector("#generate-sticker"),
  clearSketch: document.querySelector("#clear-sketch"),
  saveSticker: document.querySelector("#save-sticker"),
  saveTemplate: document.querySelector("#save-template"),
  saveCapture: document.querySelector("#save-capture"),
  assetTopTabs: document.querySelector("#asset-top-tabs"),
  assetTabButtons: [...document.querySelectorAll("[data-asset-tab]")],
  assetPanels: [...document.querySelectorAll("[data-asset-panel]")],
  discoverList: document.querySelector("#discover-list"),
  mineTemplates: document.querySelector("#mine-templates"),
  mineAssets: document.querySelector("#mine-assets"),
  anchorButtons: document.querySelector("#anchor-buttons"),
  trackingStatus: document.querySelector("#tracking-status"),
  toggleStaticMode: document.querySelector("#toggle-static-mode"),
  multiDisplayName: document.querySelector("#multi-display-name"),
  multiRoomId: document.querySelector("#multi-room-id"),
  multiSetupCard: document.querySelector("#multi-setup-card"),
  multiSetupEntry: document.querySelector("#multi-setup-entry"),
  multiSetupJoin: document.querySelector("#multi-setup-join"),
  multiWorkspaceShell: document.querySelector("#multi-workspace-shell"),
  multiStageShell: document.querySelector("#multi-stage-shell"),
  multiPrimaryStage: document.querySelector("#multi-primary-stage"),
  multiPrimarySlot: document.querySelector("#multi-primary-slot"),
  multiSecondaryStage: document.querySelector("#multi-secondary-stage"),
  multiSwapStage: document.querySelector("#multi-swap-stage"),
  multiCreateRoom: document.querySelector("#multi-create-room"),
  multiJoinRoom: document.querySelector("#multi-join-room"),
  multiEntryCreate: document.querySelector("#multi-entry-create"),
  multiEntryJoin: document.querySelector("#multi-entry-join"),
  multiJoinSubmit: document.querySelector("#multi-join-submit"),
  multiCopyRoom: document.querySelector("#multi-copy-room"),
  multiStartCamera: document.querySelector("#multi-start-camera"),
  multiStartRealtime: document.querySelector("#multi-start-realtime"),
  multiSendFrame: document.querySelector("#multi-send-frame"),
  multiRefreshFrame: document.querySelector("#multi-refresh-frame"),
  multiBackToVideo: document.querySelector("#multi-back-to-video"),
  multiConfirmCapture: document.querySelector("#multi-confirm-capture"),
  multiClearSketch: document.querySelector("#multi-clear-sketch"),
  multiGenerateSticker: document.querySelector("#multi-generate-sticker"),
  multiRedoFlow: document.querySelector("#multi-redo-flow"),
  multiSendSticker: document.querySelector("#multi-send-sticker"),
  multiLocalStage: document.querySelector("#multi-local-stage"),
  multiRemoteStage: document.querySelector("#multi-remote-stage"),
  multiLocalVideo: document.querySelector("#multi-local-video"),
  multiLocalStickerPreview: document.querySelector("#multi-local-sticker-preview"),
  multiRemoteVideo: document.querySelector("#multi-remote-video"),
  multiRemoteFrame: document.querySelector("#multi-remote-frame"),
  multiRemoteStickerPreview: document.querySelector("#multi-remote-sticker-preview"),
  multiRemoteSketchLayer: document.querySelector("#multi-remote-sketch-layer"),
  multiRemoteCandidateList: document.querySelector("#multi-remote-candidate-list"),
  multiConnectionState: document.querySelector("#multi-connection-state"),
  multiSessionName: document.querySelector("#multi-session-name"),
  multiSessionRoom: document.querySelector("#multi-session-room"),
  multiRoomLabel: document.querySelector("#multi-room-label"),
  multiRoleLabel: document.querySelector("#multi-role-label"),
  multiRemoteLabel: document.querySelector("#multi-remote-label"),
  multiActionGroups: [...document.querySelectorAll("[data-tab2-actions]")],
};

const ctx = els.sketchLayer.getContext("2d");
const multiRemoteCtx = els.multiRemoteSketchLayer.getContext("2d");

const CREATE_PHASE_META = {
  camera: { chip: "◎", hint: "对准镜头，拍下这一刻" },
  captured: { chip: "◌", hint: "这帧不错的话，就开始画草稿" },
  drawing: { chip: "✎", hint: "在画面上涂几笔，交给贴纸引擎" },
  generating: { chip: "✦", hint: "贴纸生成中，稍等一下" },
  result: { chip: "◇", hint: "已经挂上去，动一动看看效果" },
};

const MOCK_ACTIVITY_HERO = {
  title: "夏日多巴胺贴纸大赛",
  subtitle: "围绕“夏日多巴胺”主题，创作 3-6 张聊天贴纸，表达夏日情绪、梗感与分享欲。",
  detail: "优质作品将进入平台灵感库，并获得首页曝光。",
  topic: "本周主题",
  tags: ["官方赛题", "贴纸创作", "线上参与", "主题赛"],
  period: "投稿时间 05/25 - 06/02",
  joined: "2,486 人参与",
  submitted: "632 份投稿",
  reward: "TOP 10 获得推荐流量 + 创作者徽章",
  accentA: "#ff4d9b",
  accentB: "#31e7ff",
};

const MOCK_HOT_CONTESTS = [
  {
    title: "职场嘴替贴纸赛",
    badge: "话题赛",
    status: "进行中",
    joined: "1,286 人参与",
    description: "围绕打工日常，做一组高频聊天贴纸。",
    accentA: "#9f7aea",
    accentB: "#4fd1c5",
    bubble: "WORK",
  },
  {
    title: "周末发疯文学贴纸赛",
    badge: "灵感挑战",
    status: "投稿中",
    joined: "824 份投稿",
    description: "把情绪、梗图和夸张表达做成可发送贴纸。",
    accentA: "#f472b6",
    accentB: "#f59e0b",
    bubble: "LOL",
  },
  {
    title: "宠物内心 OS 贴纸赛",
    badge: "萌宠主题",
    status: "即将截止",
    joined: "356 人参与",
    description: "从宠物视角出发，创作会说话的表情贴纸。",
    accentA: "#60a5fa",
    accentB: "#22d3ee",
    bubble: "MEOW",
  },
];

const MOCK_CREATIVE_TEMPLATES = [
  { name: "海浪墨镜", description: "夏日闪片", accent: "#38bdf8", badge: "Wave" },
  { name: "西瓜发卡", description: "清爽果味", accent: "#f87171", badge: "Juicy" },
  { name: "贝壳耳挂", description: "海边随拍", accent: "#fbbf24", badge: "Shell" },
  { name: "椰树光斑", description: "日落滤镜", accent: "#34d399", badge: "Palm" },
  { name: "果冻爱心", description: "软糖质感", accent: "#f472b6", badge: "Love" },
  { name: "荧光星轨", description: "夜拍点亮", accent: "#a78bfa", badge: "Glow" },
];

const MOCK_MY_ASSETS = [
  { title: "海盐星点", description: "我收藏的贴纸", accent: "#60a5fa", badge: "Saved" },
  { title: "桃桃腮红", description: "我的常用款", accent: "#fb7185", badge: "Daily" },
  { title: "闪银泪钻", description: "派对挂件", accent: "#cbd5e1", badge: "Shine" },
  { title: "云朵鼻贴", description: "软萌气泡", accent: "#93c5fd", badge: "Cloud" },
  { title: "电波耳夹", description: "夜场风格", accent: "#22d3ee", badge: "Beat" },
  { title: "草莓心贴", description: "自拍热区", accent: "#f43f5e", badge: "Berry" },
];

function buildActivityPreview(color = "#fb7185") {
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260"><defs><linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="${color}" offset="0%"/><stop stop-color="#0f172a" offset="100%"/></linearGradient></defs><rect width="320" height="260" rx="28" fill="url(#g)"/><circle cx="82" cy="80" r="48" fill="#ffffff22"/><circle cx="238" cy="176" r="64" fill="#ffffff18"/><rect x="60" y="156" width="126" height="22" rx="11" fill="#ffffffcf"/><rect x="60" y="190" width="86" height="16" rx="8" fill="#ffffff6e"/></svg>`
  )}`;
}

function buildActivityHeroArtwork({ accentA = "#ff4d9b", accentB = "#31e7ff" } = {}) {
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520"><defs><linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="#14061f" offset="0%"/><stop stop-color="#041725" offset="100%"/></linearGradient><linearGradient id="g1" x1="0%" x2="100%"><stop stop-color="${accentA}" offset="0%"/><stop stop-color="${accentB}" offset="100%"/></linearGradient></defs><rect width="760" height="520" rx="44" fill="url(#bg)"/><circle cx="548" cy="122" r="82" fill="#ffd54f"/><circle cx="516" cy="110" r="18" fill="#0b1020"/><circle cx="580" cy="110" r="18" fill="#0b1020"/><path d="M520 152c16 22 56 22 72 0" stroke="#0b1020" stroke-width="10" stroke-linecap="round"/><rect x="474" y="232" width="164" height="98" rx="24" fill="#ffffff" opacity="0.88"/><rect x="488" y="248" width="136" height="16" rx="8" fill="#101828"/><rect x="488" y="275" width="110" height="14" rx="7" fill="#101828" opacity="0.6"/><rect x="488" y="300" width="92" height="12" rx="6" fill="url(#g1)"/><rect x="380" y="294" width="168" height="108" rx="28" fill="#120d26" stroke="#ffffff" stroke-opacity="0.08"/><text x="462" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#7cf7ff">100%</text><rect x="416" y="370" width="90" height="16" rx="8" fill="#ffffff" opacity="0.88"/><rect x="596" y="350" width="122" height="94" rx="26" fill="#1b3740" stroke="#ffffff" stroke-opacity="0.12"/><rect x="614" y="372" width="84" height="16" rx="8" fill="#ffffff" opacity="0.88"/><rect x="614" y="400" width="58" height="14" rx="7" fill="#ffffff" opacity="0.7"/><circle cx="152" cy="86" r="3" fill="#ffffff"/><circle cx="206" cy="54" r="5" fill="#ffffff"/><circle cx="662" cy="96" r="4" fill="#ffffff"/><circle cx="348" cy="130" r="6" fill="#ff6ba9"/><circle cx="704" cy="178" r="7" fill="#7cf7ff"/><rect x="436" y="92" width="104" height="18" rx="9" transform="rotate(-18 436 92)" fill="#0b1020"/></svg>`
  )}`;
}

function buildContestPreview({ accentA = "#9f7aea", accentB = "#4fd1c5", bubble = "WOW" } = {}) {
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="260"><defs><linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="#201132" offset="0%"/><stop stop-color="#081526" offset="100%"/></linearGradient><linearGradient id="g" x1="0%" x2="100%"><stop stop-color="${accentA}" offset="0%"/><stop stop-color="${accentB}" offset="100%"/></linearGradient></defs><rect width="540" height="260" rx="30" fill="url(#bg)"/><circle cx="132" cy="126" r="82" fill="${accentA}26"/><circle cx="364" cy="124" r="96" fill="${accentB}22"/><rect x="42" y="48" width="160" height="120" rx="22" fill="#ffffff14"/><rect x="228" y="38" width="136" height="136" rx="68" fill="url(#g)"/><rect x="392" y="64" width="94" height="94" rx="24" fill="#ffffff16"/><rect x="64" y="186" width="176" height="18" rx="9" fill="#ffffffd4"/><rect x="64" y="214" width="106" height="14" rx="7" fill="#ffffff80"/><rect x="356" y="182" width="128" height="42" rx="21" fill="#0f172a" stroke="#ffffff" stroke-opacity="0.12"/><text x="420" y="209" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff">${bubble}</text></svg>`
  )}`;
}

function buildStickerPreview({ accent = "#38bdf8", badge = "Glow" }) {
  return `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><defs><linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="#111827" offset="0%"/><stop stop-color="#05070d" offset="100%"/></linearGradient><linearGradient id="glow" x1="0%" x2="100%" y1="0%" y2="100%"><stop stop-color="${accent}" offset="0%"/><stop stop-color="#ffffff" offset="100%"/></linearGradient></defs><rect width="320" height="320" rx="30" fill="url(#bg)"/><circle cx="112" cy="118" r="52" fill="${accent}33"/><circle cx="198" cy="180" r="66" fill="${accent}1f"/><path d="M96 188c18-42 44-62 78-62 26 0 48 11 66 34-10 42-38 67-84 73-26 3-46-11-60-45Z" fill="url(#glow)"/><rect x="32" y="34" width="86" height="30" rx="15" fill="#ffffff18"/><text x="75" y="54" font-size="14" text-anchor="middle" fill="#ffffff" font-family="DM Sans, sans-serif">${badge}</text></svg>`
  )}`;
}

function createTextElement(tagName, className, text) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderActivityPanel(discover) {
  const heroSource = discover[0]
    ? {
        ...MOCK_ACTIVITY_HERO,
        title: `${discover[0].name}${discover[0].name.includes("大赛") ? "" : "贴纸大赛"}`,
        subtitle: discover[0].description || MOCK_ACTIVITY_HERO.subtitle,
        accentA: discover[0].preview_color || MOCK_ACTIVITY_HERO.accentA,
      }
    : MOCK_ACTIVITY_HERO;
  const hotSources = discover.length > 1
    ? [
        ...discover.slice(1, 4).map((item, index) => ({
          ...MOCK_HOT_CONTESTS[index % MOCK_HOT_CONTESTS.length],
          title: item.name,
          description: item.description || MOCK_HOT_CONTESTS[index % MOCK_HOT_CONTESTS.length].description,
          accentA: item.preview_color || MOCK_HOT_CONTESTS[index % MOCK_HOT_CONTESTS.length].accentA,
        })),
        ...MOCK_HOT_CONTESTS,
      ].slice(0, 3)
    : MOCK_HOT_CONTESTS;

  els.discoverList.innerHTML = "";
  const hero = document.createElement("article");
  hero.className = "activity-hero";

  const heroCopy = createTextElement("div", "activity-hero-copy");
  heroCopy.appendChild(createTextElement("span", "activity-topic-pill", heroSource.topic));
  heroCopy.appendChild(createTextElement("h2", "activity-hero-title", heroSource.title));

  const heroTags = createTextElement("div", "activity-chip-row");
  heroSource.tags.forEach((tag) => heroTags.appendChild(createTextElement("span", "activity-chip", tag)));
  heroCopy.appendChild(heroTags);

  const heroMeta = createTextElement("div", "activity-meta-row");
  [heroSource.period, heroSource.joined, heroSource.submitted].forEach((text) => {
    heroMeta.appendChild(createTextElement("span", "activity-meta-item", text));
  });
  heroCopy.appendChild(heroMeta);
  heroCopy.appendChild(createTextElement("p", "activity-hero-text", heroSource.subtitle));
  heroCopy.appendChild(createTextElement("p", "activity-hero-text subtle", heroSource.detail));
  heroCopy.appendChild(createTextElement("div", "activity-reward-pill", heroSource.reward));

  const heroArt = createTextElement("div", "activity-hero-art");
  const heroPreview = document.createElement("img");
  heroPreview.className = "activity-hero-preview";
  heroPreview.src = buildActivityHeroArtwork(heroSource);
  heroPreview.alt = heroSource.title;
  heroArt.appendChild(heroPreview);

  const heroFavorite = createTextElement("button", "activity-favorite-button", "♥");
  heroFavorite.type = "button";
  heroArt.appendChild(heroFavorite);

  const heroCta = createTextElement("button", "activity-cta-button", "立即参赛");
  heroCta.type = "button";
  heroCta.addEventListener("click", () => {
    switchTab("create");
    setStatus(`已从活动 "${heroSource.title}" 进入创作页。`);
  });
  heroArt.appendChild(heroCta);

  hero.appendChild(heroCopy);
  hero.appendChild(heroArt);
  els.discoverList.appendChild(hero);

  const sectionHead = createTextElement("div", "activity-section-head");
  sectionHead.appendChild(createTextElement("h3", "activity-section-title", "热门赛题"));
  sectionHead.appendChild(createTextElement("button", "activity-more-button", "查看更多"));
  els.discoverList.appendChild(sectionHead);

  const hotGrid = createTextElement("div", "activity-hot-grid");
  hotSources.forEach((item) => {
    const card = createTextElement("article", "activity-hot-card");
    const preview = document.createElement("img");
    preview.className = "activity-hot-preview";
    preview.src = buildContestPreview(item);
    preview.alt = item.title;
    card.appendChild(preview);

    const fav = createTextElement("span", "activity-hot-fav", "★");
    card.appendChild(fav);
    card.appendChild(createTextElement("h4", "activity-hot-title", item.title));

    const row = createTextElement("div", "activity-hot-chip-row");
    row.appendChild(createTextElement("span", "activity-hot-chip", item.badge));
    row.appendChild(createTextElement("span", "activity-hot-chip status", item.status));
    card.appendChild(row);

    card.appendChild(createTextElement("div", "activity-hot-meta", item.joined));
    card.appendChild(createTextElement("p", "activity-hot-desc", item.description));
    card.appendChild(createTextElement("span", "activity-hot-arrow", "›"));
    hotGrid.appendChild(card);
  });
  els.discoverList.appendChild(hotGrid);
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function setTrackingStatus(message) {
  els.trackingStatus.textContent = message;
}

function setGenerationOverlay(visible) {
  els.generationOverlay.classList.toggle("active", visible);
  els.generationOverlay.setAttribute("aria-hidden", String(!visible));
}

function updateCreateActionBarLayout() {
  const actionBar = document.querySelector(".mobile-action-bar");
  if (!actionBar) return;
  const visibleButtons = [...actionBar.querySelectorAll(".mobile-pill-button")].filter(
    (button) => window.getComputedStyle(button).display !== "none"
  );
  actionBar.dataset.visibleCount = String(visibleButtons.length);
}

function setCreatePhase(phase) {
  state.createPhase = phase;
  const meta = CREATE_PHASE_META[phase] || CREATE_PHASE_META.camera;
  els.mobileCreateShell.dataset.phase = phase;
  els.mobilePhaseChip.textContent = meta.chip;
  els.mobileHint.textContent = meta.hint;

  const isCamera = phase === "camera" || phase === "result";
  const isCaptured = phase === "captured" || phase === "drawing" || phase === "generating";
  const isDrawing = phase === "drawing";
  const isGenerating = phase === "generating";

  els.cameraFeed.style.display = isCamera ? "block" : "none";
  els.baseImage.style.display = isCaptured ? "block" : "none";
  els.sketchLayer.style.display = isDrawing ? "block" : "none";
  els.stickerPreview.style.display = phase === "result" && state.currentSticker ? "block" : "none";
  els.brushToolbar.style.display = isDrawing ? "grid" : "none";
  if (els.stageScrim) {
    els.stageScrim.style.opacity = isGenerating ? "0.9" : "1";
  }
  requestAnimationFrame(updateCreateActionBarLayout);
}

function setMultiConnectionState(message) {
  els.multiConnectionState.textContent = message;
}

function updateMultiPanelState() {
  const joined = Boolean(state.multi.roomId && state.multi.userId && state.multi.role);
  if (els.multiSetupCard) {
    els.multiSetupCard.style.display = joined ? "none" : "grid";
  }
  if (els.multiSetupEntry) {
    els.multiSetupEntry.style.display = !joined && state.multi.setupStep === "entry" ? "grid" : "none";
  }
  if (els.multiSetupJoin) {
    els.multiSetupJoin.style.display = !joined && state.multi.setupStep === "join" ? "grid" : "none";
  }
  if (els.multiWorkspaceShell) {
    els.multiWorkspaceShell.style.display = joined ? "grid" : "none";
  }
}

function canSwapTab2Stages() {
  return ["live", "result"].includes(state.multi.tab2Phase);
}

function updateTab2ActionGroupLayout() {
  const activeGroup = els.multiActionGroups.find(
    (group) => group.dataset.tab2Actions === state.multi.tab2Phase && window.getComputedStyle(group).display !== "none"
  );
  if (!activeGroup) return;
  const visibleButtons = [...activeGroup.querySelectorAll("button")].filter(
    (button) => window.getComputedStyle(button).display !== "none"
  );
  activeGroup.dataset.visibleCount = String(visibleButtons.length);
}

function updateTab2StageSlots() {
  if (!els.multiPrimarySlot || !els.multiSecondaryStage) return;
  const primaryStage = state.multi.tab2PrimarySubject === "remote" ? els.multiRemoteStage : els.multiLocalStage;
  const secondaryStage = state.multi.tab2PrimarySubject === "remote" ? els.multiLocalStage : els.multiRemoteStage;
  if (primaryStage && primaryStage.parentElement !== els.multiPrimarySlot) {
    els.multiPrimarySlot.appendChild(primaryStage);
  }
  if (secondaryStage && secondaryStage.parentElement !== els.multiSecondaryStage) {
    els.multiSecondaryStage.appendChild(secondaryStage);
  }
  els.multiPrimaryStage?.setAttribute("data-subject", state.multi.tab2PrimarySubject);
  els.multiSwapStage?.setAttribute(
    "data-subject",
    state.multi.tab2PrimarySubject === "remote" ? "local" : "remote"
  );
}

function updateRemoteStagePresentation() {
  const phase = state.multi.tab2Phase;
  const remoteIsPrimary = state.multi.tab2PrimarySubject === "remote";
  const showRemoteFrame = remoteIsPrimary && ["captured", "drawing", "generating"].includes(phase) && state.multi.latestRemoteFrame;
  const showRemoteSketch = remoteIsPrimary && phase === "drawing" && state.multi.latestRemoteFrame;
  const showRemoteSticker = Boolean(
    state.multi.remoteSticker && ((remoteIsPrimary && phase === "result") || (!remoteIsPrimary && state.multi.remoteViewMode === "video"))
  );

  els.multiRemoteFrame.style.display = showRemoteFrame ? "block" : "none";
  els.multiRemoteVideo.style.display = showRemoteFrame ? "none" : "block";
  els.multiRemoteSketchLayer.style.display = showRemoteSketch ? "block" : "none";
  els.multiRemoteStickerPreview.style.display = showRemoteSticker ? "block" : "none";
}

function updateTab2UI() {
  const shell = els.multiWorkspaceShell;
  if (!shell) return;
  const phase = state.multi.tab2Phase;
  const hasLiveRemote = Boolean(state.multi.remoteStream);
  shell.dataset.phase = state.multi.tab2Phase;
  shell.dataset.primarySubject = state.multi.tab2PrimarySubject;
  updateTab2StageSlots();
  updateRemoteStagePresentation();
  if (els.multiSwapStage) {
    els.multiSwapStage.disabled = !canSwapTab2Stages();
    els.multiSwapStage.setAttribute("aria-disabled", String(!canSwapTab2Stages()));
  }
  if (els.multiRefreshFrame) {
    els.multiRefreshFrame.style.display = phase === "live" && hasLiveRemote && state.multi.tab2PrimarySubject === "remote" ? "" : "none";
  }
  if (els.multiStartRealtime) {
    els.multiStartRealtime.style.display = phase === "live" && !hasLiveRemote ? "" : "none";
  }
  if (els.multiSendSticker) {
    els.multiSendSticker.style.display = state.multi.tab2PrimarySubject === "remote" ? "" : "none";
  }
  els.multiActionGroups.forEach((group) => {
    group.style.display = group.dataset.tab2Actions === phase ? "grid" : "none";
  });
  requestAnimationFrame(updateTab2ActionGroupLayout);
}

function setTab2Phase(phase) {
  state.multi.tab2Phase = phase;
  updateTab2UI();
}

function setTab2PrimarySubject(subject) {
  state.multi.tab2PrimarySubject = subject;
  updateTab2UI();
}

function swapTab2Stages() {
  if (!canSwapTab2Stages()) return;
  const next = state.multi.tab2PrimarySubject === "remote" ? "local" : "remote";
  setTab2PrimarySubject(next);
}

function buildRtcConfig() {
  return {
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  };
}

function closePeerConnection() {
  if (state.multi.peerConnection) {
    state.multi.peerConnection.onicecandidate = null;
    state.multi.peerConnection.ontrack = null;
    state.multi.peerConnection.onnegotiationneeded = null;
    state.multi.peerConnection.onconnectionstatechange = null;
    state.multi.peerConnection.close();
    state.multi.peerConnection = null;
  }
}

function resetMultiSocket() {
  if (!state.multi.socket) return;
  state.multi.socket.onopen = null;
  state.multi.socket.onmessage = null;
  state.multi.socket.onerror = null;
  state.multi.socket.onclose = null;
  state.multi.socket.close();
  state.multi.socket = null;
  state.multi.socketConnected = false;
}

function buildRoomSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "127.0.0.1";
  const port = protocol === "wss:" ? "8766" : "8765";
  const query = new URLSearchParams({
    roomId: state.multi.roomId,
    userId: state.multi.userId,
    role: state.multi.role,
  });
  return `${protocol}//${hostname}:${port}/ws?roomId=${encodeURIComponent(state.multi.roomId)}&userId=${encodeURIComponent(state.multi.userId)}&role=${encodeURIComponent(state.multi.role)}&${query.toString()}`;
}

async function sendRoomSocketMessage(type, payload, toUserId = state.multi.remoteUserId) {
  if (state.multi.socketConnected && state.multi.socket?.readyState === WebSocket.OPEN) {
    state.multi.socket.send(
      JSON.stringify({
        type,
        roomId: state.multi.roomId,
        fromUserId: state.multi.userId,
        toUserId,
        payload,
      })
    );
    return true;
  }
  return false;
}

async function sendSignal(type, payload) {
  if (!state.multi.roomId || !state.multi.userId || !state.multi.remoteUserId) return;
  if (await sendRoomSocketMessage(type, payload)) return;
  await api("/api/room/signal", "POST", {
    roomId: state.multi.roomId,
    fromUserId: state.multi.userId,
    toUserId: state.multi.remoteUserId,
    type,
    payload,
  });
}

async function ensurePeerConnection() {
  if (state.multi.peerConnection) return state.multi.peerConnection;
  const pc = new RTCPeerConnection(buildRtcConfig());
  state.multi.peerConnection = pc;

  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => {
      const exists = pc.getSenders().some((sender) => sender.track === track);
      if (!exists) pc.addTrack(track, state.cameraStream);
    });
  }

  pc.onicecandidate = async (event) => {
    if (!event.candidate) return;
    try {
      await sendSignal("ice", event.candidate.toJSON());
    } catch (error) {
      setMultiConnectionState(`ICE 发送失败：${error.message}`);
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    state.multi.remoteStream = stream;
    els.multiRemoteVideo.srcObject = stream;
    if (state.multi.remoteViewMode !== "frame") {
      els.multiRemoteVideo.style.display = "block";
      els.multiRemoteFrame.style.display = "none";
      els.multiRemoteSketchLayer.style.display = "none";
    }
    setMultiConnectionState("已连线");
  };

  pc.onconnectionstatechange = () => {
    const stateText = pc.connectionState || "连接中";
    if (stateText === "connected") {
      setMultiConnectionState("已连线");
    } else if (stateText === "connecting") {
      setMultiConnectionState("连线中");
    } else if (stateText === "failed") {
      setMultiConnectionState("连线失败");
    }
  };

  pc.onnegotiationneeded = async () => {
    if (!state.multi.remoteUserId || state.multi.isMakingOffer) return;
    try {
      state.multi.isMakingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", pc.localDescription.toJSON());
      setMultiConnectionState("已发连线");
    } catch (error) {
      setMultiConnectionState(`发起连接失败：${error.message}`);
    } finally {
      state.multi.isMakingOffer = false;
    }
  };

  return pc;
}

async function handleIncomingSignal(signal) {
  const pc = await ensurePeerConnection();
  if (signal.type === "offer") {
    await pc.setRemoteDescription(signal.payload);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal("answer", pc.localDescription.toJSON());
    setMultiConnectionState("已回应");
    return;
  }
  if (signal.type === "answer") {
    await pc.setRemoteDescription(signal.payload);
    setMultiConnectionState("已接通");
    return;
  }
  if (signal.type === "ice" && signal.payload) {
    try {
      await pc.addIceCandidate(signal.payload);
    } catch (error) {
      setMultiConnectionState(`ICE 应用失败：${error.message}`);
    }
  }
}

function handleSocketMessage(message) {
  if (!message?.type) return;
  if (message.payload?.peerUserId && !state.multi.remoteUserId) {
    state.multi.remoteUserId = message.payload.peerUserId;
  }
  switch (message.type) {
    case "room_ready":
      state.multi.socketConnected = true;
      updateMultiRoomUI();
      setMultiConnectionState(message.payload?.peerPresent ? "可开始" : "已入房");
      break;
    case "peer_joined":
      state.multi.remoteUserId = message.fromUserId || state.multi.remoteUserId;
      updateMultiRoomUI();
      setMultiConnectionState("对方已进");
      break;
    case "peer_left":
      if (message.fromUserId === state.multi.remoteUserId) {
        state.multi.remoteUserId = "";
      }
      closePeerConnection();
      state.multi.remoteStream = null;
      els.multiRemoteVideo.srcObject = null;
      showRemoteFrame(null);
      updateMultiRoomUI();
      setMultiConnectionState("对方离开");
      break;
    case "offer":
    case "answer":
    case "ice":
      handleIncomingSignal({ type: message.type, payload: message.payload }).catch((error) => {
        setMultiConnectionState(`实时消息处理失败：${error.message}`);
      });
      break;
    case "frame_uploaded":
      state.multi.remoteUserId = message.fromUserId || state.multi.remoteUserId;
      setMultiConnectionState("有新画面");
      break;
    case "sticker_sent":
      applyIncomingSticker(message.payload).catch((error) => {
        setMultiConnectionState(`贴图接收失败：${error.message}`);
      });
      break;
    case "error":
      setMultiConnectionState(message.payload?.message || "实时通道出错");
      break;
    default:
      break;
  }
}

function connectRoomSocket() {
  if (!state.multi.roomId || !state.multi.userId || !state.multi.role) return;
  resetMultiSocket();
  const socket = new WebSocket(buildRoomSocketUrl());
  state.multi.socket = socket;
  socket.onopen = () => {
    state.multi.socketConnected = true;
    setMultiConnectionState("已入房");
  };
  socket.onmessage = (event) => {
    try {
      handleSocketMessage(JSON.parse(event.data));
    } catch (error) {
      setMultiConnectionState(`实时消息解析失败：${error.message}`);
    }
  };
  socket.onerror = () => {
    state.multi.socketConnected = false;
    setMultiConnectionState("通道异常");
    startRoomPolling();
  };
  socket.onclose = () => {
    const shouldFallback = Boolean(state.multi.roomId && state.multi.userId);
    state.multi.socketConnected = false;
    state.multi.socket = null;
    if (shouldFallback) {
      setMultiConnectionState("通道断开");
      startRoomPolling();
    }
  };
}

function updateBrushPreview() {
  els.brushColorPreview.style.background = state.brushColor;
}

function switchTab(tab) {
  els.tabs.forEach((tabEl) => tabEl.classList.toggle("active", tabEl.dataset.tab === tab));
  Object.entries(els.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === tab));
}

function setAssetTab(tab) {
  state.assetTab = tab;
  els.assetTabButtons.forEach((button) => {
    const isActive = button.dataset.assetTab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  els.assetPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.assetPanel === tab);
  });
}

function resizeCanvasToImage() {
  const rect = els.stage.getBoundingClientRect();
  els.sketchLayer.width = rect.width;
  els.sketchLayer.height = rect.height;
  redrawSketch();
  repositionSticker();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCoverLayout(containerEl, sourceWidth, sourceHeight) {
  const rect = containerEl.getBoundingClientRect();
  const safeWidth = Math.max(1, sourceWidth || rect.width || 1);
  const safeHeight = Math.max(1, sourceHeight || rect.height || 1);
  const scale = Math.max(rect.width / safeWidth, rect.height / safeHeight);
  const renderWidth = safeWidth * scale;
  const renderHeight = safeHeight * scale;
  return {
    rect,
    scale,
    renderWidth,
    renderHeight,
    offsetX: (rect.width - renderWidth) / 2,
    offsetY: (rect.height - renderHeight) / 2,
    sourceWidth: safeWidth,
    sourceHeight: safeHeight,
  };
}

function stagePointToImagePoint(point, containerEl = els.stage, sourceWidth = state.canvas?.width, sourceHeight = state.canvas?.height) {
  const layout = getCoverLayout(containerEl, sourceWidth, sourceHeight);
  return {
    x: clamp((point.x - layout.offsetX) / layout.scale, 0, layout.sourceWidth),
    y: clamp((point.y - layout.offsetY) / layout.scale, 0, layout.sourceHeight),
  };
}

function imagePointToStagePoint(point, containerEl, sourceWidth, sourceHeight, options = {}) {
  const layout = getCoverLayout(containerEl, sourceWidth, sourceHeight);
  const projectedX = options.mirrorX ? layout.sourceWidth - point.x : point.x;
  const projectedY = options.mirrorY ? layout.sourceHeight - point.y : point.y;
  return {
    x: projectedX * layout.scale + layout.offsetX,
    y: projectedY * layout.scale + layout.offsetY,
    scale: layout.scale,
  };
}

function getPreviewSourceDimensions() {
  return {
    width: els.cameraFeed.videoWidth || els.previewFeed.videoWidth || state.canvas?.width || 1,
    height: els.cameraFeed.videoHeight || els.previewFeed.videoHeight || state.canvas?.height || 1,
  };
}

function drawSketchStrokesToContext(targetCtx, targetWidth, targetHeight) {
  if (!state.sketchStrokes.length) return;
  const layout = getCoverLayout(els.stage, targetWidth, targetHeight);
  targetCtx.lineWidth = Math.max(4, 6 / layout.scale);
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  state.sketchStrokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    targetCtx.strokeStyle = stroke.color;
    targetCtx.beginPath();
    stroke.points.forEach((point, index) => {
      const mapped = stagePointToImagePoint(point, els.stage, targetWidth, targetHeight);
      if (index === 0) targetCtx.moveTo(mapped.x, mapped.y);
      else targetCtx.lineTo(mapped.x, mapped.y);
    });
    targetCtx.stroke();
  });
}

function redrawSketch() {
  ctx.clearRect(0, 0, els.sketchLayer.width, els.sketchLayer.height);
  if (!state.sketchStrokes.length) return;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  state.sketchStrokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    ctx.strokeStyle = stroke.color;
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  });
}

function resizeMultiRemoteSketchLayer() {
  const rect = els.multiRemoteStage.getBoundingClientRect();
  els.multiRemoteSketchLayer.width = rect.width;
  els.multiRemoteSketchLayer.height = rect.height;
  redrawMultiRemoteSketch();
}

function getMultiRemotePointerPoint(event) {
  const rect = els.multiRemoteSketchLayer.getBoundingClientRect();
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

function redrawMultiRemoteSketch() {
  multiRemoteCtx.clearRect(0, 0, els.multiRemoteSketchLayer.width, els.multiRemoteSketchLayer.height);
  if (!state.multi.remoteSketchStrokes.length) return;
  multiRemoteCtx.lineWidth = 6;
  multiRemoteCtx.lineCap = "round";
  multiRemoteCtx.lineJoin = "round";
  state.multi.remoteSketchStrokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    multiRemoteCtx.strokeStyle = stroke.color;
    multiRemoteCtx.beginPath();
    stroke.points.forEach((point, index) => {
      if (index === 0) multiRemoteCtx.moveTo(point.x, point.y);
      else multiRemoteCtx.lineTo(point.x, point.y);
    });
    multiRemoteCtx.stroke();
  });
}

function clearMultiRemoteSketch(keepCandidates = false) {
  state.multi.remoteSketchStrokes = [];
  state.multi.currentRemoteStroke = null;
  redrawMultiRemoteSketch();
  if (!keepCandidates) {
    state.multi.remoteSticker = null;
    renderMultiRemoteCandidateList();
  }
}

function getAllSketchPoints() {
  return state.sketchStrokes.flatMap((stroke) => stroke.points);
}

function renderBindingBadge() {
  els.anchorButtons.innerHTML = "";
  const badge = document.createElement("button");
  badge.disabled = true;
  badge.className = "auto-bound active";
  if (!state.binding) {
    badge.textContent = "等待草图绑定";
  } else {
    badge.textContent = `草图绑定点 #${state.binding.landmarkIndex}`;
  }
  els.anchorButtons.appendChild(badge);
}

function updateMeta() {
  els.stickerMeta.innerHTML = "";
  if (!state.currentSticker) {
    els.stickerMeta.innerHTML = '<div class="meta-chip">还没有生成贴图</div>';
    return;
  }
  const rows = [
    `草图绑定点：${state.binding ? `landmark #${state.binding.landmarkIndex}` : "未绑定"}`,
    `草图中心：${state.binding ? `${state.binding.center.x.toFixed(3)}, ${state.binding.center.y.toFixed(3)}` : "-"}`,
    `贴图尺寸：${state.currentSticker.width || "-"} × ${state.currentSticker.height || "-"}`,
    `模式：${state.staticMode ? "静态摆放" : "草图点位实时跟踪"}`,
  ];
  rows.forEach((text) => {
    const div = document.createElement("div");
    div.className = "meta-chip";
    div.textContent = text;
    els.stickerMeta.appendChild(div);
  });
}

function renderCandidateList() {
  els.candidateList.innerHTML = "";
  if (!state.currentSticker?.image_data_urls?.length) {
    const empty = document.createElement("div");
    empty.className = "tile";
    empty.innerHTML = "<h3>还没有候选贴图</h3><p>生成后会在这里显示三张候选图。</p>";
    els.candidateList.appendChild(empty);
    return;
  }

  state.currentSticker.image_data_urls.forEach((candidateUrl, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    if (candidateUrl === state.currentSticker.image_data_url) {
      tile.classList.add("selected");
    }
    tile.innerHTML = `
      <img src="${candidateUrl}" alt="候选贴图 ${index + 1}" />
      <h3>候选 ${index + 1}</h3>
      <p>${candidateUrl === state.currentSticker.image_data_url ? "当前预览中" : "点击切换到这张"}</p>
    `;
    tile.addEventListener("click", () => {
      state.currentSticker.image_data_url = candidateUrl;
      els.stickerPreview.src = candidateUrl;
      renderCandidateList();
      repositionSticker();
      setStatus(`已切换到候选贴图 ${index + 1}`);
    });
    els.candidateList.appendChild(tile);
  });
}

function renderInputImages(referenceImageDataUrl = null, sketchImageDataUrl = null) {
  els.inputImageList.innerHTML = "";
  if (!referenceImageDataUrl && !sketchImageDataUrl) {
    const empty = document.createElement("div");
    empty.className = "tile";
    empty.innerHTML = "<p>生成后会在这里显示实际发给模型的参考图和草图图像。</p>";
    els.inputImageList.appendChild(empty);
    return;
  }
  if (referenceImageDataUrl) {
    els.inputImageList.appendChild(
      makeTile({
        title: "参考图输入",
        description: "底图加草图一起送模，帮助模型理解人物和挂载位置",
        preview: referenceImageDataUrl,
      })
    );
  }
  if (sketchImageDataUrl) {
    els.inputImageList.appendChild(
      makeTile({
        title: "草图输入",
        description: "保留草图约束，控制贴纸主体和形状",
        preview: sketchImageDataUrl,
      })
    );
  }
}

function renderMultiRemoteCandidateList() {
  els.multiRemoteCandidateList.innerHTML = "";
  if (!state.multi.remoteSticker?.image_data_urls?.length) {
    return;
  }

  state.multi.remoteSticker.image_data_urls.forEach((candidateUrl, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    if (candidateUrl === state.multi.remoteSticker.image_data_url) {
      tile.classList.add("selected");
    }
    tile.innerHTML = `
      <img src="${candidateUrl}" alt="给对方的候选贴图 ${index + 1}" />
      <h3>候选 ${index + 1}</h3>
      <p>${candidateUrl === state.multi.remoteSticker.image_data_url ? "当前选中，下一步可发给对方" : "点击切换当前候选"}</p>
    `;
    tile.addEventListener("click", () => {
      state.multi.remoteSticker.image_data_url = candidateUrl;
      renderMultiRemoteCandidateList();
      setMultiConnectionState(`已切换到给对方的候选贴图 ${index + 1}`);
    });
    els.multiRemoteCandidateList.appendChild(tile);
  });
}

function syncPreviewFeed() {
  if (!state.cameraStream) return;
  prepareCameraFeedForStream();
  els.cameraFeed.srcObject = state.cameraStream;
  els.previewFeed.srcObject = state.cameraStream;
  els.cameraFeed.play?.().catch(() => {});
  els.previewFeed.play?.().catch(() => {});
  if (els.multiLocalVideo) {
    els.multiLocalVideo.srcObject = state.cameraStream;
  }
}

function prepareCameraFeedForStream() {
  els.cameraFeed.dataset.ready = "false";
  const markReady = () => {
    if (els.cameraFeed.readyState >= 2 && els.cameraFeed.videoWidth && els.cameraFeed.videoHeight) {
      els.cameraFeed.dataset.ready = "true";
    }
  };
  els.cameraFeed.addEventListener("loadedmetadata", markReady, { once: true });
  els.cameraFeed.addEventListener("loadeddata", markReady, { once: true });
  els.cameraFeed.addEventListener("canplay", markReady, { once: true });
  els.cameraFeed.addEventListener("playing", markReady, { once: true });
  requestAnimationFrame(markReady);
}

async function ensureFaceTrackers() {
  if (state.faceLandmarkerVideo && state.faceLandmarkerImage) return;
  setTrackingStatus("初始化关键点跟踪...");
  const vision = await import(FACE_TRACKER_BUNDLE_URL);
  const filesetResolver = await vision.FilesetResolver.forVisionTasks(FACE_TRACKER_WASM_URL);

  state.faceLandmarkerVideo = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: FACE_TRACKER_MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  state.faceLandmarkerImage = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: FACE_TRACKER_MODEL_URL, delegate: "GPU" },
    runningMode: "IMAGE",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  setTrackingStatus("关键点跟踪已就绪");
}

async function api(path, method = "GET", payload) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return response.json();
}

function loadImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeSketchPoints() {
  if (!state.canvas) return [];
  return getAllSketchPoints().map((point) => {
    const imagePoint = stagePointToImagePoint(point, els.stage, state.canvas.width, state.canvas.height);
    return {
      x: imagePoint.x / state.canvas.width,
      y: imagePoint.y / state.canvas.height,
    };
  });
}

function getSketchBounds(points = normalizeSketchPoints()) {
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(0.04, maxX - minX),
    height: Math.max(0.04, maxY - minY),
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
  };
}

function averagePoints(landmarks, indices) {
  const total = indices.reduce(
    (acc, index) => {
      const point = landmarks[index];
      return { x: acc.x + point.x, y: acc.y + point.y, z: acc.z + point.z };
    },
    { x: 0, y: 0, z: 0 }
  );
  return { x: total.x / indices.length, y: total.y / indices.length, z: total.z / indices.length };
}

function getFaceBasis(landmarks) {
  const leftEye = averagePoints(landmarks, [33, 133, 159, 145]);
  const rightEye = averagePoints(landmarks, [362, 263, 386, 374]);
  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const eyeDistance = Math.max(0.08, Math.hypot(eyeDx, eyeDy));
  const angle = Math.atan2(eyeDy, eyeDx);
  return { leftEye, rightEye, eyeDistance, angle };
}

function detectBindingFromBounds(landmarks, bounds) {
  if (!bounds || !landmarks?.length) return null;
  const { eyeDistance } = getFaceBasis(landmarks);
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  landmarks.forEach((point, index) => {
    const distance = Math.hypot(point.x - bounds.center.x, point.y - bounds.center.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const nearestPoint = landmarks[nearestIndex];
  return {
    landmarkIndex: nearestIndex,
    center: bounds.center,
    offset: {
      x: bounds.center.x - nearestPoint.x,
      y: bounds.center.y - nearestPoint.y,
    },
    size: {
      width: bounds.width,
      height: bounds.height,
    },
    baseEyeDistance: eyeDistance,
  };
}

function detectNearestLandmarkBinding() {
  return detectBindingFromBounds(state.initialFaceResult, getSketchBounds());
}

function rotateVector(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

async function initCanvasWithDataUrl(dataUrl, width, height) {
  const { canvas } = await api("/api/canvas/init", "POST", {
    imageDataUrl: dataUrl,
    width,
    height,
  });
  state.canvas = canvas;
  state.sketchStrokes = [];
  state.currentStroke = null;
  state.currentSticker = null;
  state.lastFaceResult = null;
  state.initialFaceResult = null;
  state.binding = null;
  state.lockedGenerationInputs = null;
  els.baseImage.src = dataUrl;
  els.stickerPreview.style.display = "none";
  els.generateButton.disabled = false;
  els.saveSticker.disabled = true;
  els.saveTemplate.disabled = true;
  els.saveCapture.disabled = true;
  renderBindingBadge();
  resizeCanvasToImage();
  updateMeta();
  renderInputImages();
  renderCandidateList();
  setCreatePhase("captured");
}

async function initCanvasFromFile(file) {
  const dataUrl = await loadImageAsDataUrl(file);
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  await initCanvasWithDataUrl(dataUrl, image.naturalWidth, image.naturalHeight);
  setStatus("底图已载入。现在在图上画草图，然后点击生成贴图。");
}

async function startCamera() {
  if (state.cameraStream) return;
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) {
    const insecureContext =
      !window.isSecureContext &&
      !["localhost", "127.0.0.1"].includes(window.location.hostname);
    const reason = insecureContext
      ? "当前通过局域网 HTTP 访问，浏览器会禁用摄像头。请改用 localhost、HTTPS，或在浏览器里临时放开不安全来源的摄像头权限。"
      : "当前浏览器环境不支持 mediaDevices.getUserMedia。";
    if (els.multiStartCamera) {
      els.multiStartCamera.textContent = "重新打开摄像头";
    }
    setStatus(`摄像头开启失败：${reason}`);
    setMultiConnectionState(`摄像头开启失败：${reason}`);
    throw new Error(reason);
  }

  try {
    await ensureFaceTrackers();
    state.cameraStream = await mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    syncPreviewFeed();
    els.cameraFeed.style.display = "block";
    startTrackingLoop();
    els.capturePhoto.disabled = false;
    // Icon-only control in Tab2 keeps its label via aria only.
    if (state.multi.roomId && state.multi.remoteUserId) {
      const pc = await ensurePeerConnection();
      state.cameraStream.getTracks().forEach((track) => {
        const exists = pc.getSenders().some((sender) => sender.track === track);
        if (!exists) pc.addTrack(track, state.cameraStream);
      });
    }
    if (!state.canvas && !state.currentSticker) {
      setCreatePhase("camera");
    }
    setStatus("摄像头已开启。点击“拍下”进入创作。");
  } catch (error) {
    if (els.multiStartCamera) {
      els.multiStartCamera.textContent = "重新打开摄像头";
    }
    setStatus(`摄像头开启失败：${error.message}`);
    setMultiConnectionState(`摄像头开启失败：${error.message}`);
    throw error;
  }
}

function updateMultiRoomUI(room = null) {
  if (els.multiSessionName) {
    els.multiSessionName.textContent = els.multiDisplayName.value.trim() || "匿名";
  }
  if (els.multiSessionRoom) {
    els.multiSessionRoom.textContent = state.multi.roomId || "未建";
  }
  els.multiRoomLabel.textContent = state.multi.roomId || "未建";
  els.multiRoleLabel.textContent = state.multi.role === "host" ? "主" : state.multi.role === "guest" ? "客" : "未入";
  els.multiRemoteLabel.textContent = room?.guest_name || room?.host_name
    ? (state.multi.role === "host" ? (room?.guest_name || "等待") : (room?.host_name || "等待"))
    : "未入";
  updateMultiPanelState();
  updateTab2UI();
}

async function createRoom() {
  const response = await api("/api/room/create", "POST", { displayName: els.multiDisplayName.value.trim() || "创作者A" });
  state.multi.roomId = response.room.id;
  state.multi.userId = response.userId;
  state.multi.role = response.role;
  state.multi.setupStep = "room";
  els.multiRoomId.value = response.room.id;
  setMultiConnectionState("已建房");
  setTab2Phase("live");
  setTab2PrimarySubject("remote");
  updateMultiRoomUI(response.room);
  stopRoomPolling();
  connectRoomSocket();
  try {
    await startCamera();
  } catch (_) {
    // startCamera already updates visible status text
  }
}

async function joinRoom() {
  const roomId = els.multiRoomId.value.trim();
  if (!roomId) throw new Error("请先输入房间号");
  const response = await api("/api/room/join", "POST", {
    roomId,
    displayName: els.multiDisplayName.value.trim() || "创作者B",
  });
  state.multi.roomId = response.room.id;
  state.multi.userId = response.userId;
  state.multi.role = response.role;
  state.multi.setupStep = "room";
  setMultiConnectionState("已入房");
  setTab2Phase("live");
  setTab2PrimarySubject("remote");
  updateMultiRoomUI(response.room);
  stopRoomPolling();
  connectRoomSocket();
  try {
    await startCamera();
  } catch (_) {
    // startCamera already updates visible status text
  }
}

function stopRoomPolling() {
  if (state.multi.pollTimer) {
    window.clearInterval(state.multi.pollTimer);
    state.multi.pollTimer = null;
  }
}

function showRemoteFrame(frame) {
  state.multi.latestRemoteFrame = frame;
  state.multi.remoteViewMode = frame ? "frame" : "video";
  if (!frame) {
    els.multiRemoteFrame.removeAttribute("src");
    if (state.multi.remoteStream) {
      els.multiRemoteVideo.play().catch(() => {});
    }
    clearMultiRemoteSketch();
    updateTab2UI();
    return;
  }
  els.multiRemoteFrame.src = frame.imageDataUrl;
  els.multiRemoteVideo.pause?.();
  clearMultiRemoteSketch();
  queueMicrotask(() => resizeMultiRemoteSketchLayer());
  updateTab2UI();
}

function backToRemoteVideo() {
  state.multi.remoteViewMode = "video";
  clearMultiRemoteSketch(true);
  if (state.multi.remoteStream) {
    els.multiRemoteVideo.play().catch(() => {});
  }
  if (state.multi.remoteSticker && state.multi.tab2PrimarySubject === "remote") {
    repositionMultiRemoteSticker();
  }
  setMultiConnectionState("已回到实时视频");
  updateTab2UI();
}

async function pollRoomState() {
  if (!state.multi.roomId || !state.multi.userId) return;
  const response = await api(`/api/room/poll?roomId=${encodeURIComponent(state.multi.roomId)}&userId=${encodeURIComponent(state.multi.userId)}`);
  state.multi.remoteUserId = response.remoteUserId || "";
  updateMultiRoomUI(response.room);
  if (response.remoteFrame) {
    if (response.remoteFrame.frameId !== state.multi.latestRemoteFrame?.frameId) {
      setMultiConnectionState("有新画面");
    }
  } else {
    setMultiConnectionState("暂无画面");
  }
  if (response.signals?.length) {
    for (const signal of response.signals) {
      await handleIncomingSignal(signal);
    }
  }
  if (response.incomingStickers?.length) {
    await applyIncomingSticker(response.incomingStickers.at(-1));
  }
}

function startRoomPolling() {
  stopRoomPolling();
  pollRoomState().catch((error) => setMultiConnectionState(`房间轮询失败：${error.message}`));
  state.multi.pollTimer = window.setInterval(() => {
    pollRoomState().catch((error) => setMultiConnectionState(`房间轮询失败：${error.message}`));
  }, 3000);
}

function confirmTab2Capture() {
  if (!state.multi.latestRemoteFrame || state.multi.tab2PrimarySubject !== "remote") return;
  setTab2Phase("drawing");
  setMultiConnectionState("开始画");
}

function redoTab2Flow() {
  clearMultiRemoteSketch();
  state.multi.latestRemoteFrame = null;
  state.multi.remoteBinding = null;
  state.multi.remoteInitialFaceResult = null;
  state.multi.remoteSticker = null;
  els.multiRemoteStickerPreview.removeAttribute("src");
  backToRemoteVideo();
  setTab2Phase("live");
  setMultiConnectionState("回到实时");
}

async function captureCurrentVideoFrame(videoEl) {
  if (!videoEl.videoWidth || !videoEl.videoHeight) {
    throw new Error("当前视频还没有可用画面");
  }
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return {
    imageDataUrl: canvas.toDataURL("image/jpeg", 0.92),
    width: canvas.width,
    height: canvas.height,
  };
}

function getBoundsFromPoints(points) {
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(0.04, maxX - minX),
    height: Math.max(0.04, maxY - minY),
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
  };
}

function getRemoteSketchBounds() {
  if (!state.multi.latestRemoteFrame) return null;
  const points = state.multi.remoteSketchStrokes.flatMap((stroke) =>
    stroke.points.map((point) => {
      const mapped = stagePointToImagePoint(
        point,
        els.multiRemoteStage,
        state.multi.latestRemoteFrame.width,
        state.multi.latestRemoteFrame.height
      );
      return {
        x: mapped.x / state.multi.latestRemoteFrame.width,
        y: mapped.y / state.multi.latestRemoteFrame.height,
      };
    })
  );
  return getBoundsFromPoints(points);
}

function drawMultiRemoteSketchToContext(targetCtx, targetWidth, targetHeight) {
  if (!state.multi.remoteSketchStrokes.length) return;
  const layout = getCoverLayout(els.multiRemoteStage, targetWidth, targetHeight);
  targetCtx.lineWidth = Math.max(4, 6 / layout.scale);
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  state.multi.remoteSketchStrokes.forEach((stroke) => {
    if (!stroke.points.length) return;
    targetCtx.strokeStyle = stroke.color;
    targetCtx.beginPath();
    stroke.points.forEach((point, index) => {
      const mapped = stagePointToImagePoint(point, els.multiRemoteStage, targetWidth, targetHeight);
      if (index === 0) targetCtx.moveTo(mapped.x, mapped.y);
      else targetCtx.lineTo(mapped.x, mapped.y);
    });
    targetCtx.stroke();
  });
}

async function buildMultiRemoteSketchOnlyImage() {
  const frameImage = new Image();
  frameImage.src = state.multi.latestRemoteFrame.imageDataUrl;
  await frameImage.decode();
  const sketchCanvas = document.createElement("canvas");
  sketchCanvas.width = frameImage.naturalWidth;
  sketchCanvas.height = frameImage.naturalHeight;
  const sketchCtx = sketchCanvas.getContext("2d");
  drawMultiRemoteSketchToContext(sketchCtx, sketchCanvas.width, sketchCanvas.height);
  return sketchCanvas.toDataURL("image/png");
}

async function buildMultiRemoteReferenceImage() {
  const frameImage = new Image();
  frameImage.src = state.multi.latestRemoteFrame.imageDataUrl;
  await frameImage.decode();
  const composedCanvas = document.createElement("canvas");
  composedCanvas.width = frameImage.naturalWidth;
  composedCanvas.height = frameImage.naturalHeight;
  const composedCtx = composedCanvas.getContext("2d");
  composedCtx.drawImage(frameImage, 0, 0, composedCanvas.width, composedCanvas.height);
  drawMultiRemoteSketchToContext(composedCtx, composedCanvas.width, composedCanvas.height);
  return composedCanvas.toDataURL("image/png");
}

async function generateRemoteSticker() {
  if (!state.multi.latestRemoteFrame) throw new Error("请先拉取对方当前画面");
  if (!state.multi.remoteSketchStrokes.length) throw new Error("请先在对方画面上画草图");
  setTab2Phase("generating");
  setMultiConnectionState("施法中");
  const [referenceImageDataUrl, sketchImageDataUrl] = await Promise.all([
    buildMultiRemoteReferenceImage(),
    buildMultiRemoteSketchOnlyImage(),
  ]);
  const generated = await api("/api/stickers/generate", "POST", {
    sourceImages: [referenceImageDataUrl, sketchImageDataUrl],
  });
  const postprocessed = await api("/api/stickers/postprocess", "POST", { sticker: generated.sticker });
  const remoteFaceResult = await detectFaceLandmarksOnDataUrl(state.multi.latestRemoteFrame.imageDataUrl);
  const remoteBinding = detectBindingFromBounds(remoteFaceResult, getRemoteSketchBounds());
  if (!remoteFaceResult || !remoteBinding) {
    throw new Error("未能从对方冻结帧中识别到可挂载的人脸位置");
  }
  state.multi.remoteSticker = postprocessed.sticker;
  state.multi.remoteSticker.image_data_urls = await Promise.all(
    (state.multi.remoteSticker.image_data_urls || [state.multi.remoteSticker.image_data_url]).map((candidateUrl) =>
      normalizeStickerTransparency(candidateUrl)
    )
  );
  state.multi.remoteSticker.image_data_url = state.multi.remoteSticker.image_data_urls[0];
  state.multi.remoteBinding = remoteBinding;
  state.multi.remoteInitialFaceResult = remoteFaceResult;
  renderMultiRemoteCandidateList();
  setTab2Phase("result");
  setMultiConnectionState(`候选 ${state.multi.remoteSticker.image_data_urls.length}`);
}

async function sendCurrentFrameToRoom() {
  if (!state.multi.roomId || !state.multi.userId) throw new Error("请先创建或加入房间");
  if (!state.cameraStream) await startCamera();
  const frame = await captureCurrentVideoFrame(els.multiLocalVideo);
  await api("/api/room/frame/upload", "POST", {
    roomId: state.multi.roomId,
    userId: state.multi.userId,
    ...frame,
  });
  setMultiConnectionState("已发画面");
}

async function startRealtimeVideo() {
  if (!state.multi.roomId || !state.multi.remoteUserId) throw new Error("请先让对方加入房间");
  if (!state.cameraStream) await startCamera();
  await ensurePeerConnection();
  setMultiConnectionState("连线中");
}

async function refreshRemoteFrame() {
  if (!state.multi.roomId || !state.multi.remoteUserId) throw new Error("对方还未加入或尚未发送画面");
  let frame = null;
  if (els.multiRemoteVideo.readyState >= 2 && els.multiRemoteVideo.videoWidth && els.multiRemoteVideo.videoHeight) {
    frame = {
      frameId: `frame-live-${Date.now()}`,
      ...(await captureCurrentVideoFrame(els.multiRemoteVideo)),
    };
  } else {
    const response = await api(`/api/room/frame/latest?roomId=${encodeURIComponent(state.multi.roomId)}&targetUserId=${encodeURIComponent(state.multi.remoteUserId)}`);
    frame = response.frame;
  }
  showRemoteFrame(frame);
  setTab2Phase("captured");
  setMultiConnectionState("已定格");
}

async function captureFromCamera() {
  if (!state.cameraStream) await startCamera();
  const video = els.cameraFeed;
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("摄像头画面还没准备好");
  }
  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  captureCanvas.getContext("2d").drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  const dataUrl = captureCanvas.toDataURL("image/png");
  await initCanvasWithDataUrl(dataUrl, captureCanvas.width, captureCanvas.height);
  setStatus("这一帧已经定格。确认后就开始画草稿。");
}

async function saveSketch() {
  if (!state.canvas) return;
  const points = normalizeSketchPoints().map((point) => ({
    x: Math.round(point.x * state.canvas.width),
    y: Math.round(point.y * state.canvas.height),
  }));
  state.canvas = (await api("/api/canvas/sketch", "POST", { canvasId: state.canvas.id, points })).canvas;
}

async function detectInitialFaceOnBaseImage() {
  await ensureFaceTrackers();
  if (!els.baseImage.complete) await els.baseImage.decode();
  const result = state.faceLandmarkerImage.detect(els.baseImage);
  state.initialFaceResult = result?.faceLandmarks?.[0] || null;
}

async function detectFaceLandmarksOnDataUrl(dataUrl) {
  await ensureFaceTrackers();
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const result = state.faceLandmarkerImage.detect(image);
  return result?.faceLandmarks?.[0] || null;
}

async function generateSticker() {
  if (!state.canvas) return;
  setCreatePhase("generating");
  await saveSketch();
  await detectInitialFaceOnBaseImage();
  state.binding = detectNearestLandmarkBinding();
  renderBindingBadge();
  if (state.binding) {
    setTrackingStatus(`草图已绑定到 landmark #${state.binding.landmarkIndex}`);
  } else {
    setTrackingStatus("未检测到初始人脸，生成后将按静态位置显示");
  }

  setStatus("正在结合参考图和草图生成贴图，并继续用人脸关键点做实时挂载...");
  if (!state.lockedGenerationInputs) {
    state.lockedGenerationInputs = {
      referenceImageDataUrl: await buildReferenceImage(),
      sketchImageDataUrl: await buildSketchOnlyImage(),
    };
  }
  const { referenceImageDataUrl, sketchImageDataUrl } = state.lockedGenerationInputs;
  renderInputImages(referenceImageDataUrl, sketchImageDataUrl);
  const generated = await api("/api/stickers/generate", "POST", {
    canvasId: state.canvas.id,
    sourceImages: [referenceImageDataUrl, sketchImageDataUrl],
  });
  const postprocessed = await api("/api/stickers/postprocess", "POST", { sticker: generated.sticker });
  state.currentSticker = postprocessed.sticker;
  state.currentSticker.image_data_urls = await Promise.all(
    (state.currentSticker.image_data_urls || [state.currentSticker.image_data_url]).map((candidateUrl) =>
      normalizeStickerTransparency(candidateUrl)
    )
  );
  state.currentSticker.image_data_url = state.currentSticker.image_data_urls[0];
  els.stickerPreview.src = state.currentSticker.image_data_url;
  els.stickerPreview.style.display = "block";
  repositionSticker();
  updateMeta();
  renderCandidateList();
  els.saveSticker.disabled = false;
  els.saveTemplate.disabled = false;
  els.saveCapture.disabled = false;
  setCreatePhase("result");
  setStatus("贴纸已经挂上去了。现在可以直接看实时效果。");
}

async function normalizeStickerTransparency(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const isNearBlack = max < 28;
        const isDarkGray = max < 45 && max - min < 16;
        if (a > 0 && (isNearBlack || isDarkGray)) {
          pixels[index + 3] = 0;
        }
      }
      context.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function buildSketchOnlyImage() {
  const sketchCanvas = document.createElement("canvas");
  sketchCanvas.width = state.canvas.width;
  sketchCanvas.height = state.canvas.height;
  const sketchCtx = sketchCanvas.getContext("2d");
  sketchCtx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  drawSketchStrokesToContext(sketchCtx, sketchCanvas.width, sketchCanvas.height);
  return sketchCanvas.toDataURL("image/png");
}

async function buildReferenceImage() {
  const composedCanvas = document.createElement("canvas");
  composedCanvas.width = state.canvas.width;
  composedCanvas.height = state.canvas.height;
  const composedCtx = composedCanvas.getContext("2d");
  const base = new Image();
  base.src = els.baseImage.src;
  await base.decode();
  composedCtx.drawImage(base, 0, 0, composedCanvas.width, composedCanvas.height);
  drawSketchStrokesToContext(composedCtx, composedCanvas.width, composedCanvas.height);
  return composedCanvas.toDataURL("image/png");
}

function positionStickerFallback() {
  if (!state.currentSticker) return;
  const sticker = els.stickerPreview;
  const bounds = getSketchBounds() || { center: { x: 0.5, y: 0.3 }, width: 0.18, height: 0.18 };
  const previewSource = getPreviewSourceDimensions();
  const centerPoint = imagePointToStagePoint(
    {
      x: bounds.center.x * previewSource.width,
      y: bounds.center.y * previewSource.height,
    },
    els.previewStage,
    previewSource.width,
    previewSource.height,
    { mirrorX: true }
  );
  const stickerWidth = Math.max(72, bounds.width * previewSource.width * centerPoint.scale * 1.5);
  const ratio = (state.currentSticker.height || 1) / Math.max(state.currentSticker.width || 1, 1);
  const stickerHeight = stickerWidth * ratio;
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = "rotate(0deg)";
}

function positionStickerFromBinding(faceLandmarks) {
  if (!state.currentSticker || !state.binding) return;
  const sticker = els.stickerPreview;
  const basis = getFaceBasis(faceLandmarks);
  const initialBasis = getFaceBasis(state.initialFaceResult);
  const scaleRatio = basis.eyeDistance / initialBasis.eyeDistance;
  const angleDelta = basis.angle - initialBasis.angle;
  const trackedLandmark = faceLandmarks[state.binding.landmarkIndex];
  const rotatedOffset = rotateVector(
    {
      x: state.binding.offset.x * scaleRatio,
      y: state.binding.offset.y * scaleRatio,
    },
    angleDelta
  );
  const center = {
    x: trackedLandmark.x + rotatedOffset.x,
    y: trackedLandmark.y + rotatedOffset.y,
  };
  const previewSource = getPreviewSourceDimensions();
  const centerPoint = imagePointToStagePoint(
    {
      x: center.x * previewSource.width,
      y: center.y * previewSource.height,
    },
    els.previewStage,
    previewSource.width,
    previewSource.height,
    { mirrorX: true }
  );
  const stickerWidth = Math.max(72, state.binding.size.width * previewSource.width * centerPoint.scale * scaleRatio * 1.5);
  const ratio = (state.currentSticker.height || 1) / Math.max(state.currentSticker.width || 1, 1);
  const stickerHeight = Math.max(72, stickerWidth * ratio);
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = `rotate(${(-angleDelta * 180 / Math.PI).toFixed(2)}deg)`;
}

function repositionSticker() {
  if (!state.currentSticker) return;
  if (!state.staticMode && state.lastFaceResult && state.binding && state.initialFaceResult) {
    positionStickerFromBinding(state.lastFaceResult);
  } else {
    positionStickerFallback();
  }
}

function positionMultiRemoteStickerFallback() {
  if (!state.multi.remoteSticker || !state.multi.remoteBinding) return;
  const sticker = els.multiRemoteStickerPreview;
  const previewSource = {
    width: els.multiRemoteVideo.videoWidth || state.multi.latestRemoteFrame?.width || 1,
    height: els.multiRemoteVideo.videoHeight || state.multi.latestRemoteFrame?.height || 1,
  };
  const centerPoint = imagePointToStagePoint(
    {
      x: state.multi.remoteBinding.center.x * previewSource.width,
      y: state.multi.remoteBinding.center.y * previewSource.height,
    },
    els.multiRemoteStage,
    previewSource.width,
    previewSource.height
  );
  const stickerWidth = Math.max(72, state.multi.remoteBinding.size.width * previewSource.width * centerPoint.scale * 1.5);
  const ratio = (state.multi.remoteSticker.height || 1) / Math.max(state.multi.remoteSticker.width || 1, 1);
  const stickerHeight = stickerWidth * ratio;
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = "rotate(0deg)";
}

function positionMultiRemoteStickerFromBinding(faceLandmarks) {
  if (!state.multi.remoteSticker || !state.multi.remoteBinding || !state.multi.remoteInitialFaceResult) return;
  const sticker = els.multiRemoteStickerPreview;
  const basis = getFaceBasis(faceLandmarks);
  const initialBasis = getFaceBasis(state.multi.remoteInitialFaceResult);
  const scaleRatio = basis.eyeDistance / initialBasis.eyeDistance;
  const angleDelta = basis.angle - initialBasis.angle;
  const trackedLandmark = faceLandmarks[state.multi.remoteBinding.landmarkIndex];
  const rotatedOffset = rotateVector(
    {
      x: state.multi.remoteBinding.offset.x * scaleRatio,
      y: state.multi.remoteBinding.offset.y * scaleRatio,
    },
    angleDelta
  );
  const center = {
    x: trackedLandmark.x + rotatedOffset.x,
    y: trackedLandmark.y + rotatedOffset.y,
  };
  const previewSource = {
    width: els.multiRemoteVideo.videoWidth || state.multi.latestRemoteFrame?.width || 1,
    height: els.multiRemoteVideo.videoHeight || state.multi.latestRemoteFrame?.height || 1,
  };
  const centerPoint = imagePointToStagePoint(
    {
      x: center.x * previewSource.width,
      y: center.y * previewSource.height,
    },
    els.multiRemoteStage,
    previewSource.width,
    previewSource.height
  );
  const stickerWidth = Math.max(
    72,
    state.multi.remoteBinding.size.width * previewSource.width * centerPoint.scale * scaleRatio * 1.5
  );
  const ratio = (state.multi.remoteSticker.height || 1) / Math.max(state.multi.remoteSticker.width || 1, 1);
  const stickerHeight = Math.max(72, stickerWidth * ratio);
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = `rotate(${(angleDelta * 180 / Math.PI).toFixed(2)}deg)`;
}

function repositionMultiRemoteSticker(faceLandmarks = null) {
  if (!state.multi.remoteSticker) return;
  if (faceLandmarks && state.multi.remoteBinding && state.multi.remoteInitialFaceResult) {
    positionMultiRemoteStickerFromBinding(faceLandmarks);
  } else {
    positionMultiRemoteStickerFallback();
  }
}

function positionMultiIncomingStickerFallback() {
  if (!state.multi.incomingSticker || !state.multi.incomingBinding) return;
  const sticker = els.multiLocalStickerPreview;
  const previewSource = {
    width: els.multiLocalVideo.videoWidth || els.previewFeed.videoWidth || 1,
    height: els.multiLocalVideo.videoHeight || els.previewFeed.videoHeight || 1,
  };
  const centerPoint = imagePointToStagePoint(
    {
      x: state.multi.incomingBinding.center.x * previewSource.width,
      y: state.multi.incomingBinding.center.y * previewSource.height,
    },
    els.multiLocalStage,
    previewSource.width,
    previewSource.height
  );
  const stickerWidth = Math.max(72, state.multi.incomingBinding.size.width * previewSource.width * centerPoint.scale * 1.5);
  const ratio = (state.multi.incomingSticker.height || 1) / Math.max(state.multi.incomingSticker.width || 1, 1);
  const stickerHeight = stickerWidth * ratio;
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = "rotate(0deg)";
}

function positionMultiIncomingStickerFromBinding(faceLandmarks) {
  if (!state.multi.incomingSticker || !state.multi.incomingBinding || !state.multi.incomingInitialFaceResult) return;
  const sticker = els.multiLocalStickerPreview;
  const basis = getFaceBasis(faceLandmarks);
  const initialBasis = getFaceBasis(state.multi.incomingInitialFaceResult);
  const scaleRatio = basis.eyeDistance / initialBasis.eyeDistance;
  const angleDelta = basis.angle - initialBasis.angle;
  const trackedLandmark = faceLandmarks[state.multi.incomingBinding.landmarkIndex];
  const rotatedOffset = rotateVector(
    {
      x: state.multi.incomingBinding.offset.x * scaleRatio,
      y: state.multi.incomingBinding.offset.y * scaleRatio,
    },
    angleDelta
  );
  const center = {
    x: trackedLandmark.x + rotatedOffset.x,
    y: trackedLandmark.y + rotatedOffset.y,
  };
  const previewSource = {
    width: els.multiLocalVideo.videoWidth || els.previewFeed.videoWidth || 1,
    height: els.multiLocalVideo.videoHeight || els.previewFeed.videoHeight || 1,
  };
  const centerPoint = imagePointToStagePoint(
    {
      x: center.x * previewSource.width,
      y: center.y * previewSource.height,
    },
    els.multiLocalStage,
    previewSource.width,
    previewSource.height
  );
  const stickerWidth = Math.max(
    72,
    state.multi.incomingBinding.size.width * previewSource.width * centerPoint.scale * scaleRatio * 1.5
  );
  const ratio = (state.multi.incomingSticker.height || 1) / Math.max(state.multi.incomingSticker.width || 1, 1);
  const stickerHeight = Math.max(72, stickerWidth * ratio);
  const verticalLift = stickerHeight * 0.14;
  sticker.style.width = `${stickerWidth}px`;
  sticker.style.height = "auto";
  sticker.style.left = `${centerPoint.x - stickerWidth / 2}px`;
  sticker.style.top = `${centerPoint.y - stickerHeight / 2 - verticalLift}px`;
  sticker.style.transform = `rotate(${(angleDelta * 180 / Math.PI).toFixed(2)}deg)`;
}

function repositionMultiIncomingSticker() {
  if (!state.multi.incomingSticker) return;
  if (state.lastFaceResult && state.multi.incomingBinding && state.multi.incomingInitialFaceResult) {
    positionMultiIncomingStickerFromBinding(state.lastFaceResult);
  } else {
    positionMultiIncomingStickerFallback();
  }
}

async function sendSelectedRemoteSticker() {
  if (!state.multi.roomId || !state.multi.userId || !state.multi.remoteUserId) throw new Error("请先让对方加入房间");
  if (!state.multi.remoteSticker || !state.multi.remoteBinding || !state.multi.remoteInitialFaceResult) {
    throw new Error("请先给对方生成候选贴图");
  }
  const stickerPayload = {
    sticker: state.multi.remoteSticker,
    binding: state.multi.remoteBinding,
    initialFaceResult: state.multi.remoteInitialFaceResult,
  };
  const sentViaSocket = await sendRoomSocketMessage("sticker_sent", stickerPayload);
  if (!sentViaSocket) {
    await api("/api/room/sticker/send", "POST", {
      roomId: state.multi.roomId,
      fromUserId: state.multi.userId,
      toUserId: state.multi.remoteUserId,
      ...stickerPayload,
    });
  }
  els.multiRemoteStickerPreview.src = state.multi.remoteSticker.image_data_url;
  els.multiRemoteStickerPreview.style.display = "block";
  backToRemoteVideo();
  repositionMultiRemoteSticker();
  setTab2Phase("result");
  setMultiConnectionState("已发送");
}

async function applyIncomingSticker(message) {
  if (!message?.sticker || !message?.binding || !message?.initialFaceResult) return;
  state.multi.incomingSticker = message.sticker;
  state.multi.incomingBinding = message.binding;
  state.multi.incomingInitialFaceResult = message.initialFaceResult;
  els.multiLocalStickerPreview.src = state.multi.incomingSticker.image_data_url;
  els.multiLocalStickerPreview.style.display = "block";
  repositionMultiIncomingSticker();
  setMultiConnectionState("已收贴");
}

function startTrackingLoop() {
  if (state.trackingLoopStarted) return;
  state.trackingLoopStarted = true;
  const loop = () => {
    if (!state.faceLandmarkerVideo || !state.cameraStream) {
      requestAnimationFrame(loop);
      return;
    }
    const video = els.cameraFeed;
    if (video.readyState >= 2 && video.currentTime !== state.lastTrackedVideoTime) {
      try {
        const result = state.faceLandmarkerVideo.detectForVideo(video, performance.now());
        if (result?.faceLandmarks?.length) {
          state.lastFaceResult = result.faceLandmarks[0];
          if (!state.staticMode && state.currentSticker && state.binding) {
            positionStickerFromBinding(state.lastFaceResult);
            setTrackingStatus(`实时跟踪草图点位：landmark #${state.binding.landmarkIndex}`);
          } else {
            setTrackingStatus("??????");
          }
          if (state.multi.incomingSticker) {
            repositionMultiIncomingSticker();
          }
        } else if (!state.staticMode && state.currentSticker) {
          positionStickerFallback();
          setTrackingStatus("??????????????");
        } else if (state.multi.incomingSticker) {
          positionMultiIncomingStickerFallback();
        }
      } catch (error) {
        setTrackingStatus(`?????${error.message}`);
      }
      state.lastTrackedVideoTime = video.currentTime;
    }

    const remoteVideo = els.multiRemoteVideo;
    if (
      state.multi.remoteSticker &&
      state.multi.remoteViewMode === "video" &&
      remoteVideo.readyState >= 2 &&
      remoteVideo.currentTime !== state.multi.lastRemoteTrackedVideoTime
    ) {
      try {
        const remoteResult = state.faceLandmarkerVideo.detectForVideo(remoteVideo, performance.now() + 1);
        if (remoteResult?.faceLandmarks?.length) {
          repositionMultiRemoteSticker(remoteResult.faceLandmarks[0]);
        } else {
          positionMultiRemoteStickerFallback();
        }
      } catch (_) {
        positionMultiRemoteStickerFallback();
      }
      state.multi.lastRemoteTrackedVideoTime = remoteVideo.currentTime;
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function clearSketch() {
  state.sketchStrokes = [];
  state.currentStroke = null;
  state.lockedGenerationInputs = null;
  redrawSketch();
  renderInputImages();
  setStatus("草稿已经清空，可以重新画。");
}

function enterSketchMode() {
  if (!state.canvas) return;
  state.currentSticker = null;
  state.binding = null;
  state.initialFaceResult = null;
  els.stickerPreview.removeAttribute("src");
  els.stickerPreview.style.display = "none";
  els.saveSticker.disabled = true;
  els.saveCapture.disabled = true;
  setCreatePhase("drawing");
  resizeCanvasToImage();
  setStatus("在画面上涂几笔，完成后直接生成贴纸。");
}

async function restartCreativeFlow() {
  state.canvas = null;
  state.sketchStrokes = [];
  state.currentStroke = null;
  state.currentSticker = null;
  state.initialFaceResult = null;
  state.binding = null;
  state.lockedGenerationInputs = null;
  els.baseImage.removeAttribute("src");
  els.stickerPreview.removeAttribute("src");
  els.stickerPreview.style.display = "none";
  els.saveSticker.disabled = true;
  els.saveCapture.disabled = true;
  els.generateButton.disabled = true;
  clearSketch();
  if (!state.cameraStream) {
    await startCamera();
  } else {
    setCreatePhase("camera");
  }
  setStatus("重新回到相机，可以再拍一张。");
}

function makeTile({ title, description, preview, actionText, onClick, className = "" }) {
  const tile = document.createElement("div");
  tile.className = ["tile", className].filter(Boolean).join(" ");
  if (preview) {
    const img = document.createElement("img");
    img.src = preview;
    img.alt = title;
    tile.appendChild(img);
  }
  const h3 = document.createElement("h3");
  h3.textContent = title;
  tile.appendChild(h3);
  const p = document.createElement("p");
  p.textContent = description;
  tile.appendChild(p);
  if (actionText) {
    const button = document.createElement("button");
    button.textContent = actionText;
    button.style.marginTop = "10px";
    button.addEventListener("click", onClick);
    tile.appendChild(button);
  }
  return tile;
}

async function loadAssets() {
  const [{ templates: discover }, { templates: mineTemplates }, { assets }] = await Promise.all([
    api("/api/templates/discover"),
    api("/api/templates/mine"),
    api("/api/assets/mine"),
  ]);

  renderActivityPanel(discover);

  els.mineTemplates.innerHTML = "";
  const creativeItems = mineTemplates.length ? mineTemplates.slice().reverse() : MOCK_CREATIVE_TEMPLATES;
  creativeItems.forEach((item) => {
    els.mineTemplates.appendChild(
      makeTile({
        title: item.name,
        description: item.anchor || item.description || "创意贴纸",
        preview: item.preview_url || buildStickerPreview(item),
        className: "sticker-tile",
      })
    );
  });

  els.mineAssets.innerHTML = "";
  const myItems = assets.length ? assets.slice().reverse() : MOCK_MY_ASSETS;
  myItems.forEach((item) => {
    els.mineAssets.appendChild(
      makeTile({
        title: item.title || (item.kind === "capture" ? "拍摄成品" : "已保存贴图"),
        description: item.description || (item.kind === "capture" ? item.capture_type || "image" : item.recommended_anchor || "sticker"),
        preview: item.url || item.image_url || buildStickerPreview(item),
        className: "sticker-tile",
      })
    );
  });
}

async function saveSticker() {
  if (!state.currentSticker || !state.canvas) return;
  await api("/api/assets/save-sticker", "POST", { canvasId: state.canvas.id, sticker: state.currentSticker });
  setStatus("贴图已保存到资产库。");
  await loadAssets();
}

async function saveTemplate() {
  if (!state.currentSticker) return;
  await api("/api/templates/save", "POST", {
    name: `模板 ${new Date().toLocaleTimeString()}`,
    sticker: state.currentSticker,
  });
  setStatus("模板已保存到“我的”。");
  await loadAssets();
}

async function saveCapture() {
  if (!state.canvas) return;
  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = state.canvas.width;
  captureCanvas.height = state.canvas.height;
  const captureCtx = captureCanvas.getContext("2d");
  const video = els.previewFeed;
  if (video.videoWidth && video.videoHeight) {
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  } else {
    const base = new Image();
    base.src = els.baseImage.src;
    await base.decode();
    captureCtx.drawImage(base, 0, 0, captureCanvas.width, captureCanvas.height);
  }
  if (state.currentSticker) {
    const sticker = new Image();
    sticker.src = state.currentSticker.image_data_url;
    await sticker.decode();
    const stageRect = els.previewStage.getBoundingClientRect();
    const stickerWidth = parseFloat(els.stickerPreview.style.width);
    const stickerHeight = stickerWidth * (state.currentSticker.height / state.currentSticker.width);
    const x = (parseFloat(els.stickerPreview.style.left) / stageRect.width) * captureCanvas.width;
    const y = (parseFloat(els.stickerPreview.style.top) / stageRect.height) * captureCanvas.height;
    const w = (stickerWidth / stageRect.width) * captureCanvas.width;
    const h = (stickerHeight / stageRect.height) * captureCanvas.height;
    captureCtx.save();
    const rotateDeg = els.stickerPreview.style.transform.match(/-?\d+(\.\d+)?/);
    const angle = rotateDeg ? (parseFloat(rotateDeg[0]) * Math.PI) / 180 : 0;
    captureCtx.translate(x + w / 2, y + h / 2);
    captureCtx.rotate(angle);
    captureCtx.drawImage(sticker, -w / 2, -h / 2, w, h);
    captureCtx.restore();
  }
  await api("/api/captures/save", "POST", {
    captureDataUrl: captureCanvas.toDataURL("image/png"),
    captureType: "image",
  });
  setStatus("照片成品已保存。");
  await loadAssets();
}

function getPointerPoint(event) {
  const rect = els.sketchLayer.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function bindSketchInput() {
  let drawing = false;
  const start = (event) => {
    if (!state.canvas || state.createPhase !== "drawing") return;
    drawing = true;
    state.currentStroke = { color: state.brushColor, points: [getPointerPoint(event)] };
    state.sketchStrokes.push(state.currentStroke);
    redrawSketch();
  };
  const move = (event) => {
    if (!drawing || !state.currentStroke) return;
    state.currentStroke.points.push(getPointerPoint(event));
    redrawSketch();
  };
  const end = () => {
    if (!drawing) return;
    drawing = false;
    state.currentStroke = null;
    if (state.sketchStrokes.length) {
      setStatus("草图已更新。生成时会按草图真实位置自动绑定跟踪点。");
    }
  };
  els.sketchLayer.addEventListener("pointerdown", start);
  els.sketchLayer.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
}

function bindMultiRemoteSketchInput() {
  let drawing = false;
  const start = (event) => {
    if (!state.multi.latestRemoteFrame || state.multi.tab2Phase !== "drawing" || state.multi.tab2PrimarySubject !== "remote") return;
    drawing = true;
    state.multi.currentRemoteStroke = { color: state.brushColor, points: [getMultiRemotePointerPoint(event)] };
    state.multi.remoteSketchStrokes.push(state.multi.currentRemoteStroke);
    redrawMultiRemoteSketch();
  };
  const move = (event) => {
    if (!drawing || !state.multi.currentRemoteStroke) return;
    state.multi.currentRemoteStroke.points.push(getMultiRemotePointerPoint(event));
    redrawMultiRemoteSketch();
  };
  const end = () => {
    if (!drawing) return;
    drawing = false;
    state.multi.currentRemoteStroke = null;
    if (state.multi.remoteSketchStrokes.length) {
      setMultiConnectionState("可施法");
    }
  };
  els.multiRemoteSketchLayer.addEventListener("pointerdown", start);
  els.multiRemoteSketchLayer.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("resize", resizeMultiRemoteSketchLayer);
}

function bindEvents() {
  els.tabs.forEach((tabEl) => tabEl.addEventListener("click", () => switchTab(tabEl.dataset.tab)));
  els.assetTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAssetTab(button.dataset.assetTab);
    });
  });
  els.capturePhoto.addEventListener("click", async () => {
    try {
      await captureFromCamera();
    } catch (error) {
      setStatus(`拍照失败：${error.message}`);
    }
  });
  els.restartCapture.addEventListener("click", async () => {
    try {
      await restartCreativeFlow();
    } catch (error) {
      setStatus(`重拍失败：${error.message}`);
    }
  });
  els.startSketch.addEventListener("click", () => {
    enterSketchMode();
  });
  els.clearSketch.addEventListener("click", clearSketch);
  els.generateButton.addEventListener("click", async () => {
    setGenerationOverlay(true);
    try {
      await generateSticker();
    } catch (error) {
      setStatus(`生成失败：${error.message}`);
    } finally {
      setGenerationOverlay(false);
    }
  });
  els.redoCreation.addEventListener("click", async () => {
    try {
      await restartCreativeFlow();
    } catch (error) {
      setStatus(`重新创作失败：${error.message}`);
    }
  });
  els.saveSticker.addEventListener("click", async () => {
    try {
      await saveSticker();
    } catch (error) {
      setStatus(`保存贴图失败：${error.message}`);
    }
  });
  els.saveTemplate.addEventListener("click", async () => {
    try {
      await saveTemplate();
    } catch (error) {
      setStatus(`保存模板失败：${error.message}`);
    }
  });
  els.saveCapture.addEventListener("click", async () => {
    try {
      await saveCapture();
    } catch (error) {
      setStatus(`保存成品失败：${error.message}`);
    }
  });
  els.toggleStaticMode.addEventListener("click", () => {
    state.staticMode = !state.staticMode;
    els.toggleStaticMode.textContent = state.staticMode ? "回到跟踪模式" : "静态摆放";
    if (state.staticMode) {
      positionStickerFallback();
      setTrackingStatus("已切到静态摆放");
    } else {
      repositionSticker();
      setTrackingStatus(state.binding ? `实时跟踪草图点位：landmark #${state.binding.landmarkIndex}` : "实时跟踪已恢复");
    }
    updateMeta();
  });
  els.brushHue.addEventListener("input", () => {
    state.brushColor = `hsl(${els.brushHue.value} 90% 58%)`;
    updateBrushPreview();
  });
  els.multiCreateRoom.addEventListener("click", async () => {
    try {
      await createRoom();
    } catch (error) {
      setMultiConnectionState(`创建失败：${error.message}`);
    }
  });
  els.multiJoinRoom.addEventListener("click", async () => {
    try {
      await joinRoom();
    } catch (error) {
      setMultiConnectionState(`加入失败：${error.message}`);
    }
  });
  els.multiEntryCreate?.addEventListener("click", async () => {
    try {
      await createRoom();
    } catch (error) {
      setMultiConnectionState(`创建失败：${error.message}`);
    }
  });
  els.multiEntryJoin?.addEventListener("click", () => {
    state.multi.setupStep = "join";
    updateMultiPanelState();
  });
  els.multiJoinSubmit?.addEventListener("click", async () => {
    try {
      await joinRoom();
    } catch (error) {
      setMultiConnectionState(`加入失败：${error.message}`);
    }
  });
  els.multiCopyRoom?.addEventListener("click", async () => {
    if (!els.multiRoomId.value.trim()) return;
    try {
      await navigator.clipboard.writeText(els.multiRoomId.value.trim());
      setMultiConnectionState("已复制");
    } catch (error) {
      setMultiConnectionState(`复制失败：${error.message}`);
    }
  });
  els.multiStartCamera.addEventListener("click", async () => {
    try {
      await startCamera();
      setMultiConnectionState("相机已开");
    } catch (error) {
      setMultiConnectionState(`摄像头失败：${error.message}`);
    }
  });
  els.multiStartRealtime.addEventListener("click", async () => {
    try {
      await startRealtimeVideo();
    } catch (error) {
      setMultiConnectionState(`实时连接失败：${error.message}`);
    }
  });
  els.multiSendFrame.addEventListener("click", async () => {
    try {
      await sendCurrentFrameToRoom();
    } catch (error) {
      setMultiConnectionState(`发送失败：${error.message}`);
    }
  });
  els.multiRefreshFrame.addEventListener("click", async () => {
    try {
      await refreshRemoteFrame();
    } catch (error) {
      setMultiConnectionState(`拉取失败：${error.message}`);
    }
  });
  els.multiBackToVideo.addEventListener("click", () => {
    backToRemoteVideo();
    setTab2Phase("live");
  });
  els.multiConfirmCapture.addEventListener("click", () => {
    confirmTab2Capture();
  });
  els.multiClearSketch.addEventListener("click", () => {
    clearMultiRemoteSketch();
    setMultiConnectionState("已清空");
  });
  els.multiGenerateSticker.addEventListener("click", async () => {
    setGenerationOverlay(true);
    try {
      await generateRemoteSticker();
    } catch (error) {
      setMultiConnectionState(`给对方生成失败：${error.message}`);
    } finally {
      setGenerationOverlay(false);
    }
  });
  els.multiSendSticker.addEventListener("click", async () => {
    try {
      await sendSelectedRemoteSticker();
    } catch (error) {
      setMultiConnectionState(`发送给对方失败：${error.message}`);
    }
  });
  els.multiRedoFlow.addEventListener("click", () => {
    redoTab2Flow();
  });
  els.multiSwapStage.addEventListener("click", () => {
    swapTab2Stages();
  });
  window.addEventListener("resize", () => {
    resizeCanvasToImage();
    resizeMultiRemoteSketchLayer();
    repositionMultiIncomingSticker();
  });
}

async function init() {
  els.fixedPrompt.textContent = state.fixedPrompt;
  setCreatePhase("camera");
  setAssetTab(state.assetTab);
  updateBrushPreview();
  renderBindingBadge();
  renderInputImages();
  renderCandidateList();
  renderMultiRemoteCandidateList();
  updateTab2UI();
  updateMultiRoomUI();
  bindSketchInput();
  bindMultiRemoteSketchInput();
  bindEvents();
  updateMeta();
  setTrackingStatus("跟踪器未初始化");
  await loadAssets();
  try {
    await startCamera();
  } catch (error) {
    setStatus(`自动打开摄像头失败：${error.message}`);
  }
}

init();
