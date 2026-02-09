const gameEl = document.querySelector(".game");
const stepsEl = document.getElementById("steps");
const characterEl = document.getElementById("character");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("finalScore");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayMessageEl = document.getElementById("overlayMessage");
const turnBtn = document.getElementById("turnBtn");
const forwardBtn = document.getElementById("forwardBtn");
const restartBtn = document.getElementById("restartBtn");
const curtainLeft = document.getElementById("curtain-left");
const curtainRight = document.getElementById("curtain-right");
const exitBtn = document.getElementById("exit-btn");
const exitModal = document.getElementById("exit-modal");
const exitConfirm = document.getElementById("exit-confirm");
const exitCancel = document.getElementById("exit-cancel");
const characterDefaultSrc = characterEl ? characterEl.src : "";
const characterSpinSrc = "assets/spin_fast40.gif";
let spinPreload = null;
let spinRequestId = 0;

function preloadSpinGif() {
  if (spinPreload) return spinPreload;
  spinPreload = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = characterSpinSrc;
  });
  return spinPreload;
}

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
let gameFinished = false;
let favoriteImageUrl = null;

function applyFavoriteImage(url) {
  if (!url) return;
  favoriteImageUrl = url;
  if (frameWrapEl) {
    const photoEl = frameWrapEl.querySelector(".goal-photo");
    if (photoEl) photoEl.src = url;
  }
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

  const frameRect = frameWrapEl.getBoundingClientRect();
  const gameRect = gameEl.getBoundingClientRect();
  const centerX = frameRect.left - gameRect.left + frameRect.width / 2;
  const centerY = frameRect.top - gameRect.top + frameRect.height / 2;
  const frameLeft = frameRect.left - gameRect.left;
  const frameTop = frameRect.top - gameRect.top;
  const frameWidth = frameRect.width;
  const frameHeight = frameRect.height;

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
  confettiWrapEl.style.left = `${centerX}px`;
  confettiWrapEl.style.top = `${centerY}px`;

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
  decorWrapEl.style.left = `${frameLeft}px`;
  decorWrapEl.style.top = `${frameTop}px`;
  decorWrapEl.style.width = `${frameWidth}px`;
  decorWrapEl.style.height = `${frameHeight}px`;

  decorItems.forEach((item, index) => {
    const deco = document.createElement("img");
    deco.className = "frame-decor-item";
    deco.src = item.src;
    deco.style.left = `${item.x}px`;
    deco.style.top = `${item.y}px`;
    deco.style.setProperty("--scale", `${item.scale}`);
    const baseDuration = 2.2 + index * 0.25;
    deco.style.setProperty("--float-duration", `${baseDuration / 2}s`);
    const distance = 1.5 + (index % 3) * 0.75;
    const signedDistance = (index % 2 === 0 ? 1 : -1) * distance;
    deco.style.setProperty("--float-distance", `${signedDistance}px`);
    decorWrapEl.appendChild(deco);
  });

  gameEl.appendChild(decorWrapEl);

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
  if (foundBubbleEl && foundBubbleEl.parentElement) {
    foundBubbleEl.parentElement.removeChild(foundBubbleEl);
  }
  const currentRequestId = (spinRequestId += 1);
  preloadSpinGif().then((loaded) => {
    if (!loaded || !characterEl) return;
    if (currentRequestId !== spinRequestId) return;
    characterEl.src = characterSpinSrc;
    characterEl.classList.add("is-spin");
  });

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
      titleEl.textContent = "ALLDAY PROJECT";

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
}

function setFacingByScreenPosition() {
  const gameRect = gameEl.getBoundingClientRect();
  const charRect = characterEl.getBoundingClientRect();
  const gameCenter = gameRect.left + gameRect.width / 2;
  const charCenter = charRect.left + charRect.width / 2;
  const shouldFlip = charCenter >= gameCenter;
  characterEl.classList.toggle("flip", shouldFlip);
  currentDir = shouldFlip ? "left" : "right";
}

function positionCharacter(step) {
  if (!step) return;
  const stepHeight = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--step-height",
    ),
  );
  const charHeight = characterEl.getBoundingClientRect().height || 70;
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
  const charHeight = characterEl.getBoundingClientRect().height || 70;
  const top = stepRect.top - gameRect.top - charHeight + 10;
  const left =
    stepRect.left - gameRect.left + stepRect.width / 2 + characterOffset;
  characterEl.style.top = `${top}px`;
  characterEl.style.left = `${left}px`;
  updateGoalFramePosition();
  updateCurtainPosition();
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

function move(action) {
  if (busy || overlayEl.classList.contains("show") || gameFinished) return;
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
    setTimeout(() => {
      overlayTitleEl.textContent = "Game Over";
      overlayMessageEl.textContent = "";
      overlayEl.classList.add("show");
      finalScoreEl.textContent = score;
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
      overlayTitleEl.textContent = "Mission Success";
      overlayMessageEl.textContent = "미션 성공!";
      overlayEl.classList.add("show");
      finalScoreEl.textContent = score;
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
  overlayEl.classList.remove("show");
  overlayTitleEl.textContent = "Game Over";
  overlayMessageEl.textContent = "";
  gameFinished = false;
  spinRequestId += 1;
  if (characterEl && characterDefaultSrc) {
    characterEl.src = characterDefaultSrc;
    characterEl.classList.remove("is-spin");
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
restartBtn.addEventListener("click", resetGame);

resetGame();

window.addEventListener("message", (event) => {
  if (event?.data?.type !== "MINIGAME_INIT") return;
  applyFavoriteImage(event?.data?.favoriteImage);
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
  positionCharacter(steps[0]);
});
