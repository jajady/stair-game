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
const leftX = 60;
const rightX = 200;
const characterOffset = 3;
const baseY = 480;

let steps = [];
let score = 0;
let currentDir = "right";
let busy = false;

function createStep(dir, y) {
  const el = document.createElement("div");
  el.className = "step";
  const x = dir === "right" ? rightX : leftX;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  stepsEl.appendChild(el);
  return { el, x, y, dir };
}

function resetSteps() {
  stepsEl.innerHTML = "";
  steps = [];
  let y = baseY;
  let dir = "right";
  for (let i = 0; i < stepsVisible; i += 1) {
    steps.push(createStep(dir, y));
    y -= stepGap;
    dir = Math.random() > 0.5 ? "right" : "left";
  }
  setDirection(steps[0]?.dir || "right");
}

function setDirection(dir) {
  currentDir = dir;
  characterEl.classList.toggle("flip", currentDir === "left");
  const stepX = dir === "right" ? rightX : leftX;
  const stepWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-width"));
  const centerX = stepX + stepWidth / 2;
  characterEl.style.left = `${centerX + characterOffset}px`;
}

function positionCharacter(step) {
  if (!step) return;
  const stepHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--step-height"));
  const charHeight = characterEl.getBoundingClientRect().height || 70;
  const top = step.y - charHeight + stepHeight - 6;
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
  const newDir = Math.random() > 0.5 ? "right" : "left";
  const newStep = createStep(newDir, topY - stepGap);
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

  let intendedDir = currentDir;
  if (action === "turn") {
    intendedDir = currentDir === "right" ? "left" : "right";
  }

  const requiredDir = nextStep.dir;
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
