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

const stepGap = 56;
const stepsVisible = 9;
const columns = 7;
const horizontalPadding = 24;
const characterOffset = 3;
let baseY = 560;
const fallDuration = 520;
const goalSteps = 30;
const successDelay = 900;
const frameWidth = 107;
const frameHeight = 138;
const stepImages = [
  "assets/stair_pink.png",
  "assets/stair-green.png",
  "assets/stair-orange.png",
];

let steps = [];
let score = 0;
let currentDir = "right";
let busy = false;
let columnX = [];
let stepsCreated = 0;
let goalStep = null;
let frameEl = null;
let gameFinished = false;

function computeColumns() {
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const trackWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--track-width"));
  const available = Math.max(0, trackWidth - horizontalPadding * 2 - stepWidth);
  const gap = columns > 1 ? available / (columns - 1) : 0;
  columnX = Array.from({ length: columns }, (_, index) => horizontalPadding + index * gap);
  stepsEl.style.width = `${trackWidth}px`;
}

function computeBaseY() {
  const gameRect = gameEl.getBoundingClientRect();
  return gameRect.height * 0.7;
}

function updateTrack(step) {
  if (!step) return;
  const gameRect = gameEl.getBoundingClientRect();
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const centerX = step.x + stepWidth / 2;
  const desiredCenter = gameRect.width / 2;
  const translate = desiredCenter - centerX;
  stepsEl.style.transform = `translateX(${translate}px)`;
  characterEl.style.left = `${desiredCenter + characterOffset}px`;
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
    if (!frameEl) {
      frameEl = document.createElement("img");
      frameEl.className = "goal-frame";
      frameEl.src = "assets/frame.png";
      stepsEl.appendChild(frameEl);
    }
    updateFramePosition(step);
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
  frameEl = null;
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

function positionCharacter(step) {
  if (!step) return;
  const stepHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-height"));
  const charHeight = characterEl.getBoundingClientRect().height || 70;
  const top = step.y - charHeight + 10;
  characterEl.style.top = `${top}px`;
  updateTrack(step);
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

function updateFramePosition(step) {
  if (!frameEl || !step) return;
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const left = step.x + stepWidth / 2 - frameWidth / 2;
  const top = step.y - frameHeight - 35;
  frameEl.style.left = `${left}px`;
  frameEl.style.top = `${top}px`;
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
  if (goalStep) {
    updateFramePosition(goalStep);
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

  const requiredDir = nextStep.colIndex > currentStep.colIndex ? "right" : "left";
  const isCorrect = intendedDir === requiredDir;

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
  shiftSteps();
  positionCharacter(steps[0]);

  score = nextScore;
  scoreEl.textContent = score;

  if (score === goalSteps) {
    gameFinished = true;
    if (goalStep) {
      updateFramePosition(goalStep);
    }
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

window.addEventListener("resize", () => {
  baseY = computeBaseY();
  computeColumns();
  positionCharacter(steps[0]);
});
