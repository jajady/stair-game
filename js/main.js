const stepsEl = document.getElementById("steps");
const characterEl = document.getElementById("character");
const scoreEl = document.getElementById("score");
const finalScoreEl = document.getElementById("finalScore");
const overlayEl = document.getElementById("overlay");
const turnBtn = document.getElementById("turnBtn");
const forwardBtn = document.getElementById("forwardBtn");
const restartBtn = document.getElementById("restartBtn");

const stepGap = 72;
const stepsVisible = 9;
const columns = 7;
const horizontalPadding = 24;
const characterOffset = 3;
const baseY = 480;

let steps = [];
let score = 0;
let currentDir = "right";
let busy = false;
let columnX = [];

function computeColumns() {
  const gameRect = document.querySelector(".game").getBoundingClientRect();
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const available = Math.max(0, gameRect.width - horizontalPadding * 2 - stepWidth);
  const gap = columns > 1 ? available / (columns - 1) : 0;
  columnX = Array.from({ length: columns }, (_, index) => horizontalPadding + index * gap);
}

function createStep(colIndex, y) {
  const el = document.createElement("div");
  el.className = "step";
  const x = columnX[colIndex] ?? horizontalPadding;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  stepsEl.appendChild(el);
  return { el, x, y, colIndex };
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
  computeColumns();
  let y = baseY;
  let colIndex = Math.floor(Math.random() * columns);
  for (let i = 0; i < stepsVisible; i += 1) {
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
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const charHeight = characterEl.getBoundingClientRect().height || 70;
  const centerX = step.x + stepWidth / 2;
  const top = step.y - charHeight + stepHeight - 6;
  characterEl.style.left = `${centerX + characterOffset}px`;
  characterEl.style.top = `${top}px`;
}

function animateJump() {
  characterEl.classList.remove("jump");
  void characterEl.offsetWidth;
  characterEl.classList.add("jump");
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
  const newStep = createStep(newIndex, topY - stepGap);
  steps.push(newStep);
}

function move(action) {
  if (busy || overlayEl.classList.contains("show")) return;
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
    overlayEl.classList.add("show");
    finalScoreEl.textContent = score;
    busy = false;
    return;
  }

  setDirection(requiredDir);
  animateJump();
  score += 1;
  scoreEl.textContent = score;
  shiftSteps();
  positionCharacter(steps[0]);

  setTimeout(() => {
    busy = false;
  }, 220);
}

function resetGame() {
  score = 0;
  scoreEl.textContent = score;
  overlayEl.classList.remove("show");
  setDirection("right");
  resetSteps();
  positionCharacter(steps[0]);
}

turnBtn.addEventListener("click", () => move("turn"));
forwardBtn.addEventListener("click", () => move("forward"));
restartBtn.addEventListener("click", resetGame);

resetGame();
