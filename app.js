const state = {
  water: {
    level: Number(localStorage.getItem("game-hub-water-level")) || 1,
    moves: 0,
    selected: null,
    tubes: [],
    activeColors: [],
    history: [],
    message: "",
    animating: null,
    animationType: "",
  },
};

const palette = [
  "#48d6b3",
  "#6ca6ff",
  "#ff6f91",
  "#f4b860",
  "#a883ff",
  "#8bd346",
  "#ff8a3d",
  "#39d3ff",
  "#e65cff",
  "#ffd93d",
  "#00b8a9",
  "#ff4d4d",
  "#7c5cff",
  "#2f80ed",
  "#f2994a",
  "#27ae60",
];

const maxWaterBottles = 40;
const waterProgressKey = "game-hub-water-progress";
const panel = document.querySelector("#gamePanel");

function bestKey(gameId) {
  if (gameId === "water") return `game-hub-best-water-level-${state.water.level}`;
  return `game-hub-best-${gameId}`;
}

function getBest(gameId) {
  return localStorage.getItem(bestKey(gameId));
}

function setBest(gameId, value, lowerIsBetter = false) {
  const current = Number(getBest(gameId));
  if (!current || (lowerIsBetter ? value < current : value > current)) {
    localStorage.setItem(bestKey(gameId), String(value));
  }
}

function renderActiveGame() {
  loadWaterProgress();
  renderWaterSort();
}

function makeToolbar() {
  return `
    <div class="top-icons" aria-label="Game controls">
      <button class="icon-btn" type="button" aria-label="Settings">⚙</button>
      <button class="icon-btn grid-icon" type="button" aria-label="Levels">▦</button>
      <button class="icon-btn no-ad" type="button" aria-label="No ads">AD</button>
      <button class="icon-btn gift" type="button" aria-label="Gift">🎁</button>
      <button class="icon-btn" id="newWater" type="button" aria-label="Restart">↻</button>
    </div>
    <div class="level-title">
      <span>LEVEL</span>
      <input id="waterLevelInput" type="number" min="1" value="${state.water.level}" aria-label="Level" />
      <button class="task-btn" type="button" aria-label="Tasks">☑</button>
    </div>
  `;
}

function saveWaterProgress() {
  localStorage.setItem(
    waterProgressKey,
    JSON.stringify({
      level: state.water.level,
      moves: state.water.moves,
      tubes: state.water.tubes,
      activeColors: state.water.activeColors,
      message: state.water.message,
    }),
  );
  localStorage.setItem("game-hub-water-level", String(state.water.level));
}

function loadWaterProgress() {
  if (state.water.tubes.length) return;

  try {
    const saved = JSON.parse(localStorage.getItem(waterProgressKey) || "null");
    if (!saved || !Array.isArray(saved.tubes) || !Array.isArray(saved.activeColors)) return;

    state.water.level = Math.max(1, Number(saved.level) || 1);
    state.water.moves = Math.max(0, Number(saved.moves) || 0);
    state.water.tubes = saved.tubes;
    state.water.activeColors = saved.activeColors;
    state.water.message = saved.message || `Level ${state.water.level}. Pick a tube to start pouring.`;
    state.water.selected = null;
    state.water.history = [];
    state.water.animating = null;
    state.water.animationType = "";
  } catch {
    localStorage.removeItem(waterProgressKey);
  }
}

function resetWater() {
  const config = getWaterLevelConfig(state.water.level);
  state.water.activeColors = shuffle(makeWaterPalette(config.colorCount));
  state.water.tubes = generateWaterPuzzle(config);
  state.water.moves = 0;
  state.water.selected = null;
  state.water.history = [];
  state.water.message = `Level ${state.water.level}. Pick a tube to start pouring.`;
  state.water.animating = null;
  state.water.animationType = "";
  saveWaterProgress();
}

function makeWaterPalette(count) {
  const generated = [...palette];
  for (let index = generated.length; index < count; index += 1) {
    const hue = Math.round((index * 137.508) % 360);
    generated.push(`hsl(${hue}, 78%, 56%)`);
  }
  return generated.slice(0, count);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function cloneTubes(tubes) {
  return tubes.map((tube) => [...tube]);
}

function getWaterLevelConfig(level) {
  const totalBottles = Math.min(5 + getWaterExtraBottles(level), maxWaterBottles);
  const emptyCount = totalBottles >= 13 ? 4 : totalBottles >= 8 ? 3 : 2;
  const colorCount = totalBottles - emptyCount;
  return {
    colorCount,
    emptyCount,
    capacity: 4,
    nextBottleLevel: getNextWaterBottleLevel(level),
  };
}

function getWaterExtraBottles(level) {
  let extraBottles = 0;
  let nextLevel = 10;
  let gap = 10;

  while (level >= nextLevel && extraBottles < maxWaterBottles - 5) {
    extraBottles += 1;
    gap += 10;
    nextLevel += gap;
  }

  return extraBottles;
}

function getNextWaterBottleLevel(level) {
  let extraBottles = 0;
  let nextLevel = 10;
  let gap = 10;

  while (level >= nextLevel && extraBottles < maxWaterBottles - 5) {
    extraBottles += 1;
    gap += 10;
    nextLevel += gap;
  }

  return extraBottles >= maxWaterBottles - 5 ? null : nextLevel;
}

function generateWaterPuzzle(config) {
  if (config.colorCount > 9) {
    return generateScrambledWaterPuzzle(config);
  }

  const levelColors = state.water.activeColors;
  const tubeCount = config.colorCount + config.emptyCount;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const stack = levelColors
      .flatMap((color) => Array(config.capacity).fill(color))
      .sort(() => Math.random() - 0.5);
    const tubes = Array.from({ length: tubeCount }, (_, index) =>
      index < config.colorCount
        ? stack.slice(index * config.capacity, index * config.capacity + config.capacity)
        : [],
    );

    if (!isSolvedTubes(tubes, config.capacity) && isWaterSolvable(tubes, config.capacity)) return tubes;
  }

  return makeFallbackWaterPuzzle(levelColors, config);
}

function generateScrambledWaterPuzzle(config) {
  const tubes = [
    ...state.water.activeColors.map((color) => Array(config.capacity).fill(color)),
    ...Array.from({ length: config.emptyCount }, () => []),
  ];
  let previousMove = null;
  const scrambleMoves = 120 + config.colorCount * 18;

  for (let step = 0; step < scrambleMoves; step += 1) {
    const legalMoves = getLegalWaterMoves(tubes, config.capacity).filter(([from, to]) => {
      if (!previousMove) return true;
      return !(previousMove[0] === to && previousMove[1] === from);
    });
    if (!legalMoves.length) continue;

    const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    pourTube(tubes[move[0]], tubes[move[1]], config.capacity);
    previousMove = move;
  }

  if (isSolvedTubes(tubes, config.capacity)) {
    return makeFallbackWaterPuzzle(state.water.activeColors, config);
  }

  return tubes;
}

function makeFallbackWaterPuzzle(levelColors, config) {
  const tubes = Array.from({ length: config.colorCount + config.emptyCount }, () => []);
  for (let layer = 0; layer < config.capacity; layer += 1) {
    levelColors.forEach((color, colorIndex) => {
      tubes[(colorIndex + layer) % config.colorCount].push(color);
    });
  }
  return tubes;
}

function isSolvedTubes(tubes, capacity = 4) {
  return tubes.every((tube) => {
    if (!tube.length) return true;
    return tube.length === capacity && tube.every((color) => color === tube[0]);
  });
}

function isWaterSolvable(startTubes, capacity = 4) {
  const seen = new Set();
  const stack = [cloneTubes(startTubes)];
  let checked = 0;
  const maxChecks = startTubes.length > 9 ? 48000 : 26000;

  while (stack.length && checked < maxChecks) {
    const tubes = stack.pop();
    const key = tubes.map((tube) => tube.join(",")).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    checked += 1;

    if (isSolvedTubes(tubes, capacity)) return true;

    getLegalWaterMoves(tubes, capacity).forEach(([fromIndex, toIndex]) => {
      const next = cloneTubes(tubes);
      pourTube(next[fromIndex], next[toIndex], capacity);
      stack.push(next);
    });
  }

  return false;
}

function getLegalWaterMoves(tubes, capacity = 4) {
  const moves = [];
  tubes.forEach((from, fromIndex) => {
    if (!from.length) return;
    const fromTop = from[from.length - 1];
    const fromIsComplete = from.length === capacity && from.every((color) => color === fromTop);
    if (fromIsComplete) return;

    tubes.forEach((to, toIndex) => {
      if (fromIndex === toIndex || to.length >= capacity) return;
      if (!to.length || to[to.length - 1] === fromTop) moves.push([fromIndex, toIndex]);
    });
  });
  return moves;
}

function pourTube(from, to, capacity = 4) {
  const top = from[from.length - 1];
  while (from[from.length - 1] === top && to.length < capacity) {
    to.push(from.pop());
  }
}

function renderWaterSort() {
  if (!state.water.tubes.length) resetWater();
  const best = getBest("water") || "--";
  const config = getWaterLevelConfig(state.water.level);
  const rowConfig = getWaterRowConfig(state.water.tubes.length);

  panel.innerHTML = `
    ${makeToolbar()}
    <div class="water-board ${rowConfig.rows === 1 ? "single-row" : ""}">
      <div class="water-scale" style="--board-cols: ${rowConfig.cols}; --board-rows: ${rowConfig.rows}; --board-scale: ${rowConfig.scale}; --board-width: ${rowConfig.width}px; --board-height: ${rowConfig.height}px; --scaled-width: ${rowConfig.scaledWidth}px; --scaled-height: ${rowConfig.scaledHeight}px">
        <div class="water-grid">
          ${state.water.tubes
            .map(
              (tube, index) => `
                <button class="tube ${state.water.selected === index ? "selected" : ""} ${state.water.animating === index ? state.water.animationType : ""}" data-tube="${index}" aria-label="Tube ${index + 1}">
                  ${tube.map((color) => `<span class="liquid" style="background:${color}"></span>`).join("")}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
    <p class="water-message">${state.water.message}</p>
    <div class="bottom-tools">
      <button class="oval-btn" id="undoWater" type="button">← 480</button>
      <button class="oval-btn" id="restartWaterBottom" type="button">↻ 9</button>
      <button class="oval-btn" id="hintWater" type="button">💡 5</button>
    </div>
    <div class="ad-strip">
      <div class="ad-thumb">AD</div>
      <div>
        <strong>MonopolyGo!</strong>
        <span>Roll the dice and get rich in MONOPOL...</span>
      </div>
      <button type="button" aria-label="Close ad">×</button>
    </div>
    <div id="waterResult"></div>
  `;

  document.querySelector("#newWater").addEventListener("click", () => {
    resetWater();
    renderWaterSort();
  });
  document.querySelector("#waterLevelInput").addEventListener("change", (event) => {
    jumpToWaterLevel(event.target.value);
  });
  document.querySelector("#waterLevelInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") jumpToWaterLevel(event.target.value);
  });
  document.querySelector("#restartWaterBottom").addEventListener("click", () => {
    resetWater();
    renderWaterSort();
  });
  document.querySelector("#hintWater").addEventListener("click", () => {
    state.water.message = "Try freeing a matching color into an empty bottle.";
    updateWaterBoardState();
  });
  document.querySelector("#undoWater").addEventListener("click", () => {
    undoWaterMove();
    renderWaterSort();
  });
  panel.querySelectorAll(".tube").forEach((tube) => {
    tube.addEventListener("click", () => handleTubeClick(Number(tube.dataset.tube)));
  });
  showWaterWin();
}

function getWaterRowConfig(tubeCount) {
  const cols = Math.min(tubeCount, 7);
  const rows = Math.ceil(tubeCount / cols);
  const baseWidth = cols * 48 + (cols - 1) * 12;
  const baseHeight = rows * 142 + (rows - 1) * 38;
  const viewport = window.visualViewport || window;
  const viewportWidth = viewport.width || window.innerWidth || 1200;
  const viewportHeight = viewport.height || window.innerHeight || 800;
  const isPhone = viewportWidth <= 560;
  const isTablet = viewportWidth <= 820;
  const availableWidth = Math.max(260, Math.min(390, viewportWidth) - 34);
  const availableHeight = Math.max(245, viewportHeight - (isPhone ? 300 : isTablet ? 330 : 350));
  const scaleX = Math.min(1, availableWidth / baseWidth);
  const scaleY = Math.min(1, availableHeight / baseHeight);
  const scale = Math.max(0.18, Math.min(scaleX, scaleY));
  return {
    cols,
    rows,
    width: baseWidth,
    height: baseHeight,
    scale,
    scaledWidth: baseWidth * scale,
    scaledHeight: baseHeight * scale,
  };
}

function jumpToWaterLevel(value) {
  const level = Math.max(1, Number.parseInt(value, 10) || 1);
  state.water.level = level;
  resetWater();
  renderWaterSort();
}

function handleTubeClick(index) {
  const water = state.water;
  if (showWaterWin()) return;

  if (water.selected === null) {
    if (water.tubes[index].length) {
      water.selected = index;
      water.message = "Now choose where to pour it.";
      updateWaterBoardState();
    } else {
      water.message = "That tube is empty. Choose one with color in it.";
      water.animating = index;
      water.animationType = "blocked";
      updateWaterBoardState();
      clearWaterAnimation(false);
    }
    return;
  }

  if (water.selected === index) {
    water.selected = null;
    water.message = "Selection cleared.";
    updateWaterBoardState();
    return;
  }

  const from = water.tubes[water.selected];
  const to = water.tubes[index];
  const top = from[from.length - 1];
  const capacity = getWaterLevelConfig(water.level).capacity;
  const canPour = from.length && to.length < capacity && (!to.length || to[to.length - 1] === top);

  if (canPour) {
    water.history.push(cloneTubes(water.tubes));
    pourTube(from, to, capacity);
    water.moves += 1;
    water.message = "Clean pour.";
    water.animating = index;
    water.animationType = "pouring";
    saveWaterProgress();
  } else {
    water.message = "That color cannot pour there.";
    water.animating = index;
    water.animationType = "blocked";
    water.selected = null;
    updateWaterBoardState();
    clearWaterAnimation(false);
    return;
  }

  water.selected = null;
  renderWaterSort();
  clearWaterAnimation();
}

function updateWaterBoardState() {
  panel.querySelectorAll(".tube").forEach((tube) => {
    const index = Number(tube.dataset.tube);
    tube.classList.toggle("selected", state.water.selected === index);
    tube.classList.toggle("pouring", state.water.animating === index && state.water.animationType === "pouring");
    tube.classList.toggle("blocked", state.water.animating === index && state.water.animationType === "blocked");
  });

  const message = panel.querySelector(".water-message");
  if (message) message.textContent = state.water.message;
}

function showWaterWin() {
  const solved = isSolvedTubes(state.water.tubes, getWaterLevelConfig(state.water.level).capacity);

  if (solved) {
    setBest("water", state.water.moves, true);
    document.querySelector("#waterResult").innerHTML = `
      <div class="result">
        <h3>Level ${state.water.level} cleared in ${state.water.moves} moves</h3>
        <p>Next level adds pressure with more bottles and colors.</p>
        <button class="oval-btn" id="clearNextWater">Play Level ${state.water.level + 1}</button>
      </div>
    `;
    const clearNext = document.querySelector("#clearNextWater");
    if (clearNext) {
      clearNext.addEventListener("click", () => {
        state.water.level += 1;
        resetWater();
        renderWaterSort();
      });
    }
  }

  return solved;
}

function undoWaterMove() {
  const previous = state.water.history.pop();
  if (!previous) {
    state.water.message = "No move to undo yet.";
    return;
  }

  state.water.tubes = previous;
  state.water.moves = Math.max(0, state.water.moves - 1);
  state.water.selected = null;
  state.water.message = "Last pour undone.";
  state.water.animating = null;
  state.water.animationType = "";
  saveWaterProgress();
}

function clearWaterAnimation(shouldRender = true) {
  setTimeout(() => {
    state.water.animating = null;
    state.water.animationType = "";
    if (shouldRender) {
      renderWaterSort();
    } else {
      updateWaterBoardState();
    }
  }, 280);
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderWaterSort, 120);
});

renderActiveGame();
