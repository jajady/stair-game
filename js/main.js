const gameEl = document.querySelector(".game");
const stepsEl = document.getElementById("steps");
const characterEl = document.getElementById("character");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const overlayEl = document.getElementById("overlay");
const overlayGameoverEl = document.getElementById("overlay-gameover");
const overlayGameoverTitleEl = document.getElementById(
  "overlay-gameover-title",
);
const overlayStatLabel1El = document.getElementById("overlay-stat-label-1");
const overlayStatValue1El = document.getElementById("overlay-stat-value-1");
const overlayStatLabel2El = document.getElementById("overlay-stat-label-2");
const overlayStatValue2El = document.getElementById("overlay-stat-value-2");
const overlayStatLabel3El = document.getElementById("overlay-stat-label-3");
const overlayStatValue3El = document.getElementById("overlay-stat-value-3");
const overlayRankingListEl = document.getElementById("overlay-ranking-list");
const turnBtn = document.getElementById("turnBtn");
const forwardBtn = document.getElementById("forwardBtn");
const startBtn = document.getElementById("start-btn");
const failModal = document.getElementById("fail-modal");
const failRetryBtn = document.getElementById("fail-retry-btn");
const failScoreValueEl = document.getElementById("fail-score-value");
const curtainLeft = document.getElementById("curtain-left");
const curtainRight = document.getElementById("curtain-right");
const exitBtn = document.getElementById("exit-btn");
const exitModal = document.getElementById("exit-modal");
const exitConfirm = document.getElementById("exit-confirm");
const exitCancel = document.getElementById("exit-cancel");
const characterDefaultSrc = characterEl ? characterEl.src : "";
const characterSpinSrc = "assets/spin_fast40.gif";

let stepGap = 56;
const stepsVisible = 9;
const columns = 7;
const horizontalPadding = 24;
const characterOffset = 3;
let baseY = 560;
const fallDuration = 520;
const goalSteps = 50;
const curtainOpenDelay = 300;
const curtainOpenDuration = 1000;
const confettiBurstDelay = curtainOpenDelay + curtainOpenDuration * 0.1;
const confettiDuration = 600;
const decorDuration = null;
const foundBubbleDelay = Math.max(0, confettiDuration - 120);
const confettiCount = 5;
const successDelay = curtainOpenDelay + curtainOpenDuration + 3000;
const normalCharacterHeight = 70;
const spinCharacterHeight = 236;
const frameOffsetFromStep = 120;
const frameHeight = 200;
const finalPhaseSteps = 1;
const frameTopFromScreen = 148;
const stepImages = [
  "assets/stair/stair-pink.png",
  "assets/stair/stair-green.png",
  "assets/stair/stair-orange.png",
];

let steps = [];
let score = 0;
let currentDir = "right";
let busy = false;
let columnX = [];
let stepsCreated = 0;
let goalStep = null;
let frameWrapEl = null;
let confettiWrapEl = null;
let decorWrapEl = null;
let foundBubbleEl = null;
let spinCharacterEl = null;
let gameFinished = false;
let gameStarted = false;
let favoriteImageUrl = null;
let favoriteTitleText = "";
let timerRafId = null;
let timerStartAt = 0;
let elapsedMs = 0;
let isTimerRunning = false;
let latestApiGameTimeMs = null;
let latestApiGameRank = null;
let latestApiTopList = [];
let latestOverlaySummary = null;

function formatElapsedTime(ms) {
  const safeMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const hundredths = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function formatElapsedSeconds(ms) {
  const safeMs = Math.max(0, Math.floor(ms));
  return (Math.floor(safeMs / 10) / 100).toFixed(2);
}

function formatAdaptiveRankingTime(ms) {
  const safeMs = Math.max(0, Math.floor(ms));
  if (safeMs >= 60000) {
    return formatElapsedTime(safeMs);
  }
  return formatElapsedSeconds(safeMs);
}

function updateTimerDisplay(ms) {
  if (!timerEl) return;
  timerEl.textContent = formatElapsedTime(ms);
}

function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function normalizeApiTimeToMs(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  if (parsed >= 1000) return Math.round(parsed);
  return Math.round(parsed * 1000);
}

function formatRankByRule(gameTimeMs, gameRank) {
  if (!Number.isFinite(gameTimeMs)) return "없음";
  if (gameRank === null || gameRank === undefined || gameRank === "") {
    return "5위 밖";
  }
  const parsedRank = Number(gameRank);
  if (!Number.isFinite(parsedRank)) return "없음";
  return `${parsedRank}위`;
}

function isTopFiveRankText(text) {
  return (
    text === "1ST" ||
    text === "2ND" ||
    text === "3RD" ||
    text === "4TH" ||
    text === "5TH"
  );
}

function setOverlayStatRows(row1, row2, row3) {
  if (overlayStatLabel1El) overlayStatLabel1El.textContent = row1.label;
  if (overlayStatValue1El) {
    overlayStatValue1El.textContent = row1.value;
    overlayStatValue1El.classList.toggle("rank-out", Boolean(row1.isOut));
  }

  if (overlayStatLabel2El) overlayStatLabel2El.textContent = row2.label;
  if (overlayStatValue2El) {
    overlayStatValue2El.textContent = row2.value;
    overlayStatValue2El.classList.toggle("rank-out", Boolean(row2.isOut));
  }

  if (overlayStatLabel3El) overlayStatLabel3El.textContent = row3.label;
  if (overlayStatValue3El) {
    overlayStatValue3El.textContent = row3.value;
    overlayStatValue3El.classList.toggle("rank-out", Boolean(row3.isOut));
  }
}

function renderRankingList() {
  if (!overlayRankingListEl) return;

  overlayRankingListEl.textContent = "";
  latestApiTopList.slice(0, 5).forEach((item, index) => {
    const li = document.createElement("li");
    const rankEl = document.createElement("span");
    const nicknameEl = document.createElement("span");
    const timeEl = document.createElement("span");

    const rankLabel = `${index + 1}${["ST", "ND", "RD"][index] || "TH"}`;
    if (index < 3) {
      const medal = document.createElement("img");
      medal.src = `../jump-kiwing/assets/game_medal${index + 1}.png`;
      medal.alt = "";
      medal.className = "rank-medal";
      rankEl.appendChild(medal);
    }
    rankEl.appendChild(document.createTextNode(rankLabel));

    nicknameEl.className = "ranking-nickname";
    nicknameEl.textContent = item?.nickname ?? "";

    const gameTimeMs = normalizeApiTimeToMs(item?.gameTime);
    timeEl.textContent = Number.isFinite(gameTimeMs)
      ? formatAdaptiveRankingTime(gameTimeMs)
      : "--";

    li.appendChild(rankEl);
    li.appendChild(nicknameEl);
    li.appendChild(timeEl);
    overlayRankingListEl.appendChild(li);
  });
}

function getClearBestText() {
  if (!Number.isFinite(latestApiGameTimeMs)) return "없음";
  return formatAdaptiveRankingTime(latestApiGameTimeMs);
}

function getRankText() {
  return formatRankByRule(latestApiGameTimeMs, latestApiGameRank);
}

function refreshOverlayStats() {
  if (!latestOverlaySummary) return;

  const { isClear, finalScore, finalElapsedMs } = latestOverlaySummary;
  const clearBestText = getClearBestText();
  const rankText = getRankText();

  if (isClear) {
    setOverlayStatRows(
      { label: "TIME", value: formatAdaptiveRankingTime(finalElapsedMs) },
      {
        label: "BEST RECORD",
        value: clearBestText,
        isOut: clearBestText === "없음",
      },
      { label: "RANK", value: rankText, isOut: !isTopFiveRankText(rankText) },
    );
    return;
  }

  const hasClearBest = clearBestText !== "없음";
  setOverlayStatRows(
    { label: "SCORE", value: formatScore(finalScore) },
    { label: "BEST RECORD", value: clearBestText, isOut: !hasClearBest },
    {
      label: "RANK",
      value: hasClearBest ? rankText : "없음",
      isOut: !hasClearBest || !isTopFiveRankText(rankText),
    },
  );
}

function getElapsedMs() {
  if (!isTimerRunning) return elapsedMs;
  return elapsedMs + (performance.now() - timerStartAt);
}

function timerTick() {
  updateTimerDisplay(getElapsedMs());
  timerRafId = requestAnimationFrame(timerTick);
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerStartAt = performance.now();
  timerRafId = requestAnimationFrame(timerTick);
}

function stopTimer() {
  if (!isTimerRunning) {
    updateTimerDisplay(elapsedMs);
    return elapsedMs;
  }
  elapsedMs += performance.now() - timerStartAt;
  isTimerRunning = false;
  if (timerRafId !== null) {
    cancelAnimationFrame(timerRafId);
    timerRafId = null;
  }
  updateTimerDisplay(elapsedMs);
  return elapsedMs;
}

function resetTimer() {
  if (timerRafId !== null) {
    cancelAnimationFrame(timerRafId);
    timerRafId = null;
  }
  timerStartAt = 0;
  elapsedMs = 0;
  isTimerRunning = false;
  updateTimerDisplay(0);
}

function applyFavoriteMeta({ image, name }) {
  if (typeof image === "string" && image.trim()) {
    favoriteImageUrl = image;
  }
  if (typeof name === "string" && name.trim()) {
    favoriteTitleText = name.trim();
  }
  if (!frameWrapEl) return;

  const photoEl = frameWrapEl.querySelector(".goal-photo");
  if (photoEl && favoriteImageUrl) {
    photoEl.src = favoriteImageUrl;
  }

  const titleEl = frameWrapEl.querySelector(".goal-frame-title");
  if (titleEl) {
    titleEl.textContent = favoriteTitleText || "ALLDAY PROJECT";
  }
}

function ensureSpinCharacterLayer() {
  if (spinCharacterEl || !gameEl || !characterEl) return;

  spinCharacterEl = document.createElement("img");
  spinCharacterEl.id = "character-spin";
  spinCharacterEl.className = "character is-spin character-spin-layer";
  spinCharacterEl.src = characterSpinSrc;
  spinCharacterEl.alt = "";
  spinCharacterEl.setAttribute("aria-hidden", "true");

  gameEl.appendChild(spinCharacterEl);
}

function isSpinVisible() {
  return Boolean(spinCharacterEl?.classList.contains("is-visible"));
}

function setCurtainsOpen(isOpen) {
  [curtainLeft, curtainRight].forEach((curtain) => {
    if (!curtain) return;
    curtain.classList.toggle("is-open", isOpen);
  });
}

function setCurtainsVisible(isVisible) {
  [curtainLeft, curtainRight].forEach((curtain) => {
    if (!curtain) return;
    curtain.classList.toggle("is-visible", isVisible);
  });
  if (isVisible) {
    updateCurtainPosition();
  }
}

function spawnConfettiBurst() {
  if (!frameWrapEl) return;
  if (confettiWrapEl && confettiWrapEl.parentElement) {
    confettiWrapEl.parentElement.removeChild(confettiWrapEl);
  }
  if (decorWrapEl && decorWrapEl.parentElement) {
    decorWrapEl.parentElement.removeChild(decorWrapEl);
  }

  const gameRect = gameEl.getBoundingClientRect();
  const frameWrapRect = frameWrapEl.getBoundingClientRect();
  const centerX = frameWrapRect.left - gameRect.left + frameWrapRect.width / 2;
  const centerY = frameWrapRect.top - gameRect.top + frameWrapRect.height / 2;

  const frameImgEl = frameWrapEl.querySelector(".goal-frame-img");
  const frameLeft = frameImgEl ? frameImgEl.offsetLeft : 0;
  const frameTop = frameImgEl ? frameImgEl.offsetTop : 0;
  const frameWidth = frameImgEl
    ? frameImgEl.offsetWidth
    : frameWrapEl.offsetWidth;
  const frameHeight = frameImgEl
    ? frameImgEl.offsetHeight
    : frameWrapEl.offsetHeight;

  const confettiOffsets = [
    { dx: -140, dy: 120, rot: 0, scale: 1.0 },
    { dx: -120, dy: -140, rot: 45, scale: 0.5 },
    { dx: 150, dy: -90, rot: 180, scale: 0.7 },
    { dx: 140, dy: 120, rot: 225, scale: 0.4 },
    { dx: 90, dy: 150, rot: 270, scale: 0.8 },
  ];

  const confettiImages = [
    "assets/confeti/magenta_confeti.png",
    "assets/confeti/purple_confeti.png",
  ];

  confettiWrapEl = document.createElement("div");
  confettiWrapEl.className = "confetti-burst";
  confettiWrapEl.style.left = `${Math.round(centerX)}px`;
  confettiWrapEl.style.top = `${Math.round(centerY)}px`;

  for (let i = 0; i < confettiCount; i += 1) {
    const piece = document.createElement("img");
    piece.className = "confetti-piece";
    piece.src = confettiImages[i % confettiImages.length];
    const offset = confettiOffsets[i % confettiOffsets.length];
    piece.style.setProperty("--dx", `${offset.dx}px`);
    piece.style.setProperty("--dy", `${offset.dy}px`);
    piece.style.setProperty("--rot", `${offset.rot}deg`);
    piece.style.setProperty("--scale", `${offset.scale}`);
    confettiWrapEl.appendChild(piece);
  }

  gameEl.appendChild(confettiWrapEl);

  const decorItems = [
    {
      src: "assets/hearts/blue_heart.png",
      x: frameWidth * 0.12 + 40,
      y: frameHeight * 0.08,
      scale: 0.75,
    },
    {
      src: "assets/hearts/green_heart.png",
      x: frameWidth * 0.14,
      y: frameHeight * 0.22 - 20,
      scale: 0.38,
    },
    {
      src: "assets/hearts/green_heart.png",
      x: frameWidth * 0.86,
      y: frameHeight * 0.18,
      scale: 0.45,
    },
    {
      src: "assets/kiwi.png",
      x: frameWidth * 0.2,
      y: frameHeight * 0.88 - 10,
      scale: 0.46,
    },
    {
      src: "assets/hearts/green_heart.png",
      x: frameWidth * 0.92 + 10,
      y: frameHeight * 0.72,
      scale: 0.5,
    },
    {
      src: "assets/hearts/blue_heart.png",
      x: frameWidth * 0.62,
      y: frameHeight * 0.96,
      scale: 0.3,
    },
    {
      src: "assets/twinkle.png",
      x: frameWidth * 0.64,
      y: frameHeight * 0.04,
      scale: 0.36,
    },
    {
      src: "assets/twinkle.png",
      x: frameWidth * 0.04,
      y: frameHeight * 0.62,
      scale: 0.64,
    },
    {
      src: "assets/twinkle.png",
      x: frameWidth * 0.96,
      y: frameHeight * 0.38,
      scale: 0.48,
    },
  ];

  decorWrapEl = document.createElement("div");
  decorWrapEl.className = "frame-decor";
  decorWrapEl.style.left = `${Math.round(frameLeft)}px`;
  decorWrapEl.style.top = `${Math.round(frameTop)}px`;
  decorWrapEl.style.width = `${Math.round(frameWidth)}px`;
  decorWrapEl.style.height = `${Math.round(frameHeight)}px`;

  decorItems.forEach((item, index) => {
    const deco = document.createElement("img");
    deco.className = "frame-decor-item";
    deco.src = item.src;
    deco.style.left = `${Math.round(item.x)}px`;
    deco.style.top = `${Math.round(item.y)}px`;
    deco.style.setProperty("--scale", `${item.scale}`);
    const baseDuration = 2.2 + index * 0.25;
    deco.style.setProperty("--float-duration", `${baseDuration / 2}s`);
    const distance = 1.5 + (index % 3) * 0.75;
    const signedDistance = (index % 2 === 0 ? 1 : -1) * distance;
    deco.style.setProperty("--float-distance", `${signedDistance}px`);
    decorWrapEl.appendChild(deco);
  });

  frameWrapEl.appendChild(decorWrapEl);

  setTimeout(() => {
    showFoundBubble();
  }, foundBubbleDelay);

  setTimeout(() => {
    if (confettiWrapEl && confettiWrapEl.parentElement) {
      confettiWrapEl.parentElement.removeChild(confettiWrapEl);
    }
    confettiWrapEl = null;
  }, confettiDuration);

  if (decorDuration !== null) {
    setTimeout(() => {
      if (decorWrapEl && decorWrapEl.parentElement) {
        decorWrapEl.parentElement.removeChild(decorWrapEl);
      }
      decorWrapEl = null;
    }, decorDuration);
  }
}

function showFoundBubble() {
  if (!characterEl) return;
  ensureSpinCharacterLayer();
  if (foundBubbleEl && foundBubbleEl.parentElement) {
    foundBubbleEl.parentElement.removeChild(foundBubbleEl);
  }

  const gameRect = gameEl.getBoundingClientRect();
  const charRect = characterEl.getBoundingClientRect();
  const gameCenter = gameRect.left + gameRect.width / 2;
  const charCenter = charRect.left + charRect.width / 2;
  const isRightSide = charCenter >= gameCenter;

  foundBubbleEl = document.createElement("img");
  foundBubbleEl.className = `found-bubble ${
    isRightSide ? "found-bubble--left" : "found-bubble--right"
  }`;
  foundBubbleEl.src = isRightSide
    ? "assets/found_txt_right.png"
    : "assets/found_txt_left.png";

  const top = charRect.top - gameRect.top + 10;
  foundBubbleEl.style.top = `${top}px`;
  if (isRightSide) {
    const left = charRect.left - gameRect.left - 6;
    foundBubbleEl.style.left = `${left}px`;
  } else {
    const left = charRect.right - gameRect.left + 6;
    foundBubbleEl.style.left = `${left}px`;
  }

  gameEl.appendChild(foundBubbleEl);
  requestAnimationFrame(() => {
    if (foundBubbleEl) {
      foundBubbleEl.classList.add("is-visible");
    }
  });

  if (spinCharacterEl && steps[0]) {
    spinCharacterEl.classList.toggle(
      "flip",
      characterEl.classList.contains("flip"),
    );
    positionSpinCharacterOnStep(steps[0]);
    spinCharacterEl.classList.add("is-visible");
    characterEl.classList.add("character-main-hidden");
  }
}

function computeColumns() {
  stepGap = readCssNumber("--step-gap", stepGap);
  const stepWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--step-width"),
  );
  const trackWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--track-width",
    ),
  );
  const available = Math.max(0, trackWidth - horizontalPadding * 2 - stepWidth);
  const gap = columns > 1 ? available / (columns - 1) : 0;
  columnX = Array.from(
    { length: columns },
    (_, index) => horizontalPadding + index * gap,
  );
  stepsEl.style.width = `${trackWidth}px`;
}

function computeBaseY() {
  const gameRect = gameEl.getBoundingClientRect();
  return gameRect.height * 0.7;
}

function readCssNumber(variable, fallback) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function isShortScreen() {
  const gameRect = gameEl.getBoundingClientRect();
  return gameRect.height <= 750;
}

function updateTrack(step) {
  if (!step) return;
  const gameRect = gameEl.getBoundingClientRect();
  const stepWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--step-width"),
  );
  const centerX = step.x + stepWidth / 2;
  const desiredCenter = gameRect.width / 2;
  const translate = desiredCenter - centerX;
  stepsEl.style.transform = `translateX(${translate}px)`;
  characterEl.style.left = `${desiredCenter + characterOffset}px`;
}

function updateGoalFramePosition() {
  if (!frameWrapEl) return;
  frameWrapEl.style.top = `${frameTopFromScreen}px`;
}

function updateCurtainPosition() {
  if (!curtainLeft || !curtainRight || !goalStep) return;
  const stepRect = goalStep.el.getBoundingClientRect();
  const gameRect = gameEl.getBoundingClientRect();
  const top = stepRect.top - gameRect.top - 40;
  curtainLeft.style.setProperty("--curtain-offset", `${top}px`);
  curtainRight.style.setProperty("--curtain-offset", `${top}px`);
}

function createStep(colIndex, y) {
  const el = document.createElement("div");
  el.className = "step";
  const imgIndex = Math.floor(Math.random() * stepImages.length);
  el.style.backgroundImage = `url("${stepImages[imgIndex]}")`;
  const x = columnX[colIndex] ?? horizontalPadding;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  stepsEl.appendChild(el);
  const stepNumber = stepsCreated;
  const isGoal = stepNumber === goalSteps;
  const step = { el, x, y, colIndex, isGoal };
  if (isGoal) {
    goalStep = step;
    if (!frameWrapEl) {
      frameWrapEl = document.createElement("div");
      frameWrapEl.className = "goal-frame-wrap is-hidden";

      const frameImg = document.createElement("img");
      frameImg.className = "goal-frame-img";
      frameImg.src = "assets/photo_frame.png";

      const photoImg = document.createElement("img");
      photoImg.className = "goal-photo";
      photoImg.src = favoriteImageUrl || "assets/favorite.png";

      const titleEl = document.createElement("div");
      titleEl.className = "goal-frame-title";
      titleEl.textContent = favoriteTitleText || "ALLDAY PROJECT";

      frameWrapEl.appendChild(photoImg);
      frameWrapEl.appendChild(frameImg);
      frameWrapEl.appendChild(titleEl);
      gameEl.appendChild(frameWrapEl);
      updateGoalFramePosition();
    }
    setCurtainsVisible(true);
    setCurtainsOpen(false);
  }
  stepsCreated += 1;
  return step;
}

function getNextColumnIndex(currentIndex) {
  const dir = Math.random() > 0.5 ? 1 : -1;
  let nextIndex = currentIndex + dir;
  if (nextIndex < 0 || nextIndex >= columns) {
    nextIndex = currentIndex - dir;
  }
  return Math.max(0, Math.min(columns - 1, nextIndex));
}

function resetSteps() {
  stepsEl.innerHTML = "";
  steps = [];
  goalStep = null;
  if (frameWrapEl && frameWrapEl.parentElement) {
    frameWrapEl.parentElement.removeChild(frameWrapEl);
  }
  frameWrapEl = null;
  stepsCreated = 0;
  computeColumns();
  baseY = computeBaseY();
  let y = baseY;
  let colIndex = Math.floor(Math.random() * columns);
  for (let i = 0; i < stepsVisible && stepsCreated <= goalSteps; i += 1) {
    steps.push(createStep(colIndex, y));
    y -= stepGap;
    colIndex = getNextColumnIndex(colIndex);
  }
  setDirection("right");
}

function setDirection(dir) {
  currentDir = dir;
  characterEl.classList.toggle("flip", currentDir === "left");
  if (isSpinVisible()) {
    spinCharacterEl?.classList.toggle("flip", currentDir === "left");
  }
}

function setFacingByScreenPosition() {
  const gameRect = gameEl.getBoundingClientRect();
  const charRect = characterEl.getBoundingClientRect();
  const gameCenter = gameRect.left + gameRect.width / 2;
  const charCenter = charRect.left + charRect.width / 2;
  const shouldFlip = charCenter >= gameCenter;
  characterEl.classList.toggle("flip", shouldFlip);
  if (isSpinVisible()) {
    spinCharacterEl?.classList.toggle("flip", shouldFlip);
  }
  currentDir = shouldFlip ? "left" : "right";
}

function getCharacterHeight() {
  return isSpinVisible() ? spinCharacterHeight : normalCharacterHeight;
}

function positionCharacter(step) {
  if (!step) return;
  const charHeight = getCharacterHeight();
  const top = step.y - charHeight + 10;
  characterEl.style.top = `${top}px`;
  updateTrack(step);
  updateGoalFramePosition();
  updateCurtainPosition();
}

function positionCharacterOnStep(step) {
  if (!step) return;
  const stepRect = step.el.getBoundingClientRect();
  const gameRect = gameEl.getBoundingClientRect();
  const charHeight = getCharacterHeight();
  const top = stepRect.top - gameRect.top - charHeight + 10;
  const left =
    stepRect.left - gameRect.left + stepRect.width / 2 + characterOffset;
  characterEl.style.top = `${top}px`;
  characterEl.style.left = `${left}px`;
  updateGoalFramePosition();
  updateCurtainPosition();
}

function positionSpinCharacterOnStep(step) {
  if (!step || !spinCharacterEl) return;
  const stepRect = step.el.getBoundingClientRect();
  const gameRect = gameEl.getBoundingClientRect();
  const top = stepRect.top - gameRect.top - spinCharacterHeight + 10;
  const left =
    stepRect.left - gameRect.left + stepRect.width / 2 + characterOffset;

  spinCharacterEl.style.top = `${top}px`;
  spinCharacterEl.style.left = `${left}px`;
}

function animateJump() {
  characterEl.classList.remove("jump");
  characterEl.classList.remove("fall-left");
  characterEl.classList.remove("fall-right");
  void characterEl.offsetWidth;
  characterEl.classList.add("jump");
}

function animateFall(direction) {
  characterEl.classList.remove("jump");
  characterEl.classList.remove("fall-left");
  characterEl.classList.remove("fall-right");
  void characterEl.offsetWidth;
  characterEl.classList.add(direction === "left" ? "fall-left" : "fall-right");
}

function shiftSteps() {
  steps.forEach((step) => {
    step.y += stepGap;
    step.el.style.top = `${step.y}px`;
  });

  const first = steps[0];
  if (first.y >= baseY + stepGap) {
    steps.shift();
    stepsEl.removeChild(first.el);
  }

  const topY = Math.min(...steps.map((step) => step.y));
  const lastIndex = steps[steps.length - 1].colIndex;
  const newIndex = getNextColumnIndex(lastIndex);
  if (stepsCreated <= goalSteps) {
    const newStep = createStep(newIndex, topY - stepGap);
    steps.push(newStep);
  }
}

function showStartOverlay() {
  if (!overlayEl || !overlayGameoverEl) return;
  overlayEl.classList.remove("is-gameover");
  overlayGameoverEl.classList.add("is-hidden");
  overlayEl.classList.remove("hidden");
  hideFailModal();
}

function showFailModal(finalScore) {
  if (!failModal) return;
  if (failScoreValueEl) {
    failScoreValueEl.textContent = formatScore(finalScore);
  }
  failModal.classList.remove("hidden");
  gameStarted = false;
  gameFinished = true;
}

function hideFailModal() {
  if (!failModal) return;
  failModal.classList.add("hidden");
}

function showGameoverOverlay({ isClear, finalScore, finalElapsedMs }) {
  if (!overlayEl || !overlayGameoverEl) return;

  hideFailModal();
  overlayEl.classList.add("is-gameover");
  overlayGameoverEl.classList.remove("is-hidden");
  overlayEl.classList.remove("hidden");
  gameStarted = false;
  gameFinished = true;

  if (overlayGameoverTitleEl) {
    overlayGameoverTitleEl.textContent = isClear ? "GAME CLEAR" : "GAME OVER";
  }

  latestOverlaySummary = { isClear, finalScore, finalElapsedMs };
  refreshOverlayStats();
  renderRankingList();
}

function notifyGameover(finalScore, finalElapsedMs) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "MINIGAME_GAMEOVER",
        score: finalScore,
        elapsedMs: Math.floor(Math.max(0, finalElapsedMs)),
      },
      "*",
    );
  }
}

function hideOverlay() {
  if (!overlayEl) return;
  overlayEl.classList.add("hidden");
}

function move(action) {
  if (
    busy ||
    !gameStarted ||
    !overlayEl.classList.contains("hidden") ||
    gameFinished
  ) {
    return;
  }
  busy = true;

  const nextStep = steps[1];
  if (!nextStep) {
    busy = false;
    return;
  }

  const currentStep = steps[0];
  let intendedDir = currentDir;
  if (action === "turn") {
    intendedDir = currentDir === "right" ? "left" : "right";
  }

  const requiredDir =
    nextStep.colIndex > currentStep.colIndex ? "right" : "left";
  const isCorrect = intendedDir === requiredDir;
  const lockTrack = score >= goalSteps - finalPhaseSteps && !isShortScreen();

  if (!isCorrect) {
    setDirection(intendedDir);
    animateFall(intendedDir);
    const finalScore = score;
    const finalElapsedMs = stopTimer();
    setTimeout(() => {
      notifyGameover(finalScore, finalElapsedMs);
      showFailModal(finalScore);
      busy = false;
    }, fallDuration);
    return;
  }

  setDirection(requiredDir);
  animateJump();
  const nextScore = score + 1;
  if (lockTrack) {
    steps.shift();
    positionCharacterOnStep(steps[0]);
  } else {
    shiftSteps();
    positionCharacter(steps[0]);
  }

  score = nextScore;
  scoreEl.textContent = score;

  if (score === goalSteps) {
    gameFinished = true;
    const finalScore = score;
    const finalElapsedMs = stopTimer();
    setFacingByScreenPosition();
    setCurtainsVisible(true);
    setCurtainsOpen(false);
    setTimeout(() => {
      setCurtainsOpen(true);
      if (frameWrapEl) {
        frameWrapEl.classList.remove("is-hidden");
      }
    }, curtainOpenDelay);
    setTimeout(() => {
      spawnConfettiBurst();
    }, confettiBurstDelay);
    setTimeout(() => {
      notifyGameover(finalScore, finalElapsedMs);
      showGameoverOverlay({
        isClear: true,
        finalScore,
        finalElapsedMs,
      });
      busy = false;
    }, successDelay);
    return;
  }

  setTimeout(() => {
    busy = false;
  }, 220);
}

function resetGame() {
  score = 0;
  scoreEl.textContent = score;
  resetTimer();
  gameFinished = false;
  hideFailModal();
  if (characterEl && characterDefaultSrc) {
    characterEl.src = characterDefaultSrc;
    characterEl.classList.remove("character-main-hidden");
  }
  if (spinCharacterEl) {
    spinCharacterEl.classList.remove("is-visible");
  }
  setCurtainsVisible(false);
  setCurtainsOpen(false);
  if (confettiWrapEl && confettiWrapEl.parentElement) {
    confettiWrapEl.parentElement.removeChild(confettiWrapEl);
  }
  confettiWrapEl = null;
  if (decorWrapEl && decorWrapEl.parentElement) {
    decorWrapEl.parentElement.removeChild(decorWrapEl);
  }
  decorWrapEl = null;
  if (foundBubbleEl && foundBubbleEl.parentElement) {
    foundBubbleEl.parentElement.removeChild(foundBubbleEl);
  }
  foundBubbleEl = null;
  setDirection("right");
  characterEl.classList.remove("fall-left");
  characterEl.classList.remove("fall-right");
  resetSteps();
  positionCharacter(steps[0]);
}

turnBtn.addEventListener("click", () => move("turn"));
forwardBtn.addEventListener("click", () => move("forward"));

function startGameSession() {
  if (gameFinished) {
    resetGame();
  }
  hideFailModal();
  gameStarted = true;
  startTimer();
  hideOverlay();
}

if (startBtn) {
  startBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    startGameSession();
  });
}

if (failRetryBtn) {
  failRetryBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    startGameSession();
  });
}

resetGame();
ensureSpinCharacterLayer();
showStartOverlay();

window.addEventListener("message", (event) => {
  if (event?.data?.type !== "MINIGAME_INIT") return;
  applyFavoriteMeta({
    image: event?.data?.favoriteImage,
    name: event?.data?.favoriteName,
  });
});

window.addEventListener("message", (event) => {
  if (event?.data?.type !== "MINIGAME_RESULT") return;

  const reward = event?.data?.reward;
  const lastRewardDate = event?.data?.lastRewardDate;
  if (reward !== undefined || lastRewardDate) {
    const completeEls = document.querySelectorAll(".is-complete");
    if (completeEls.length) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isComplete = lastRewardDate === today || Boolean(reward);
      completeEls.forEach((completeEl) => {
        completeEl.textContent = isComplete
          ? "\uC131\uACF5"
          : "\uB3C4\uC804\uC911";
        completeEl.classList.toggle("is-success", isComplete);
        completeEl.classList.toggle("is-progress", !isComplete);
      });
    }
  }

  const data = event?.data?.data;
  const result = Array.isArray(data?.resultList) ? data.resultList[0] : null;
  if (result) {
    const incomingGameTimeMs = normalizeApiTimeToMs(result?.gameTime);
    const hasIncomingGameTime = Number.isFinite(incomingGameTimeMs);
    const hasIncomingGameRank = Object.prototype.hasOwnProperty.call(
      result,
      "gameRank",
    );

    // Keep the latest valid clear record if a follow-up response omits time.
    if (hasIncomingGameTime) {
      latestApiGameTimeMs = incomingGameTimeMs;
    }
    if (
      hasIncomingGameRank &&
      (hasIncomingGameTime || Number.isFinite(latestApiGameTimeMs))
    ) {
      latestApiGameRank = result?.gameRank;
    }

    if (Array.isArray(result?.topList)) {
      latestApiTopList = result.topList;
    }
    if (overlayEl?.classList.contains("is-gameover")) {
      refreshOverlayStats();
    }
    renderRankingList();
  }
});

window.addEventListener("message", (event) => {
  if (event?.data?.type !== "MINIGAME_TOPLIST") return;
  const data = event?.data?.data;
  latestApiTopList = Array.isArray(data?.resultList) ? data.resultList : [];
  renderRankingList();
});

const requestExit = () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "MINIGAME_EXIT" }, "*");
  } else {
    window.history.back();
  }
};

const showExitModal = () => {
  if (!exitModal) return;
  exitModal.classList.remove("hidden");
};

const hideExitModal = () => {
  if (!exitModal) return;
  exitModal.classList.add("hidden");
};

if (exitBtn) {
  exitBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    showExitModal();
  });
}

if (exitConfirm) {
  exitConfirm.addEventListener("click", (event) => {
    event.stopPropagation();
    requestExit();
  });
}

if (exitCancel) {
  exitCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    hideExitModal();
  });
}

if (exitModal) {
  exitModal.addEventListener("click", () => {
    hideExitModal();
  });
}

window.addEventListener("resize", () => {
  baseY = computeBaseY();
  computeColumns();
  if (isSpinVisible()) {
    positionSpinCharacterOnStep(steps[0]);
  } else {
    positionCharacter(steps[0]);
  }
});
