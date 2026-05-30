const games = [
  {
    id: "water",
    title: "Water Sort",
    type: "Puzzle",
    description: "Pour matching colors until each tube is pure.",
    image:
      "https://liquidsortpuzzle.com/images/preview1_landscape.jpg",
    render: renderWaterSort,
  },
  {
    id: "memory",
    title: "Match Tiles",
    type: "Memory",
    description: "Flip cards and clear every pair.",
    image: "assets/match-tiles-thumb.svg",
    render: renderMemory,
  },
  {
    id: "tap",
    title: "Speed Tap",
    type: "Arcade",
    description: "Score as many taps as you can before time runs out.",
    image: "assets/speed-tap-thumb.svg",
    render: renderSpeedTap,
  },
];

const state = {
  active: "home",
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
  memory: {
    moves: 0,
    flipped: [],
    locked: false,
    cards: [],
  },
  tap: {
    score: 0,
    time: 15,
    timer: null,
    running: false,
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
const panel = document.querySelector("#gamePanel");
const gameTitle = document.querySelector("#gameTitle");
const gameType = document.querySelector("#gameType");
const statOne = document.querySelector("#statOne");
const statTwo = document.querySelector("#statTwo");
const homeButton = document.querySelector("#homeButton");

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

function mountNavigation() {
  homeButton.classList.toggle("active", state.active === "home");
  homeButton.hidden = state.active === "home";
  homeButton.onclick = () => {
    stopTapTimer();
    state.active = "home";
    renderActiveGame();
  };
}

function renderActiveGame() {
  if (state.active === "home") {
    renderHome();
    mountNavigation();
    return;
  }

  const game = games.find((item) => item.id === state.active);
  gameTitle.textContent = game.title;
  gameType.textContent = game.type;
  mountNavigation();
  game.render();
}

function renderHome() {
  gameTitle.textContent = "Choose a Game";
  gameType.textContent = "Home";
  updateStats(`${games.length} games`, "Ready");
  panel.innerHTML = `
    <section class="home-hero">
      <div>
        <p class="eyebrow">Arcade</p>
        <h3>What are we playing?</h3>
        <p>Pick a card below. Water Sort is the main puzzle, and the others are quick mini games.</p>
      </div>
    </section>

    <section class="home-grid">
      ${games
        .map(
          (game) => `
            <button class="home-game" data-game="${game.id}" style="--game-image: url('${game.image}')">
              <span class="game-badge">${game.type}</span>
              <h3>${game.title}</h3>
              <p>${game.description}</p>
              <span class="play-label">Play</span>
            </button>
          `,
        )
        .join("")}
    </section>
  `;

  panel.querySelectorAll(".home-game").forEach((card) => {
    card.addEventListener("click", () => {
      state.active = card.dataset.game;
      renderActiveGame();
    });
  });
}

function makeToolbar(help, actions) {
  return `
    <div class="toolbar">
      <p class="help-text">${help}</p>
      <div class="actions">${actions}</div>
    </div>
  `;
}

function updateStats(first, second) {
  statOne.textContent = first;
  statTwo.textContent = second;
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
  updateStats(`Level: ${state.water.level}`, `Moves: ${state.water.moves}`);

  panel.innerHTML = `
    ${makeToolbar(
      `${config.colorCount} colors, ${config.colorCount + config.emptyCount} bottles${config.colorCount + config.emptyCount > 10 ? " across multiple rows" : ""}. ${config.nextBottleLevel ? `Next bottle at level ${config.nextBottleLevel}.` : "Bottle cap reached."} Best moves: ${best}`,
      `<label class="level-jump">Level <input id="waterLevelInput" type="number" min="1" value="${state.water.level}" /></label><button class="btn primary" id="newWater">Restart Level</button><button class="btn" id="prevWater">Prev Level</button><button class="btn" id="nextWater">Next Level</button><button class="btn" id="undoWater">Undo</button>`,
    )}
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
  document.querySelector("#prevWater").addEventListener("click", () => {
    state.water.level = Math.max(1, state.water.level - 1);
    localStorage.setItem("game-hub-water-level", String(state.water.level));
    resetWater();
    renderWaterSort();
  });
  document.querySelector("#nextWater").addEventListener("click", () => {
    state.water.level += 1;
    localStorage.setItem("game-hub-water-level", String(state.water.level));
    resetWater();
    renderWaterSort();
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
  const cols = tubeCount <= 10 ? tubeCount : Math.min(tubeCount, Math.ceil(Math.sqrt(tubeCount * 2.6)));
  const rows = Math.ceil(tubeCount / cols);
  const baseWidth = cols * 104 + (cols - 1) * 18;
  const baseHeight = rows * 260 + (rows - 1) * 18;
  const scaleX = Math.min(1, 1680 / baseWidth);
  const scaleY = Math.min(1, 360 / baseHeight);
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
  localStorage.setItem("game-hub-water-level", String(state.water.level));
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
    } else {
      water.message = "That tube is empty. Choose one with color in it.";
      water.animating = index;
      water.animationType = "blocked";
    }
    renderWaterSort();
    clearWaterAnimation();
    return;
  }

  if (water.selected === index) {
    water.selected = null;
    water.message = "Selection cleared.";
    renderWaterSort();
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
  } else {
    water.message = "That color cannot pour there.";
    water.animating = index;
    water.animationType = "blocked";
  }

  water.selected = null;
  renderWaterSort();
  clearWaterAnimation();
}

function showWaterWin() {
  const solved = isSolvedTubes(state.water.tubes, getWaterLevelConfig(state.water.level).capacity);

  if (solved) {
    setBest("water", state.water.moves, true);
    document.querySelector("#waterResult").innerHTML = `
      <div class="result">
        <h3>Level ${state.water.level} cleared in ${state.water.moves} moves</h3>
        <p>Next level adds pressure with more bottles and colors.</p>
        <button class="btn primary" id="clearNextWater">Play Level ${state.water.level + 1}</button>
      </div>
    `;
    const clearNext = document.querySelector("#clearNextWater");
    if (clearNext) {
      clearNext.addEventListener("click", () => {
        state.water.level += 1;
        localStorage.setItem("game-hub-water-level", String(state.water.level));
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
}

function clearWaterAnimation() {
  setTimeout(() => {
    if (state.active !== "water") return;
    state.water.animating = null;
    state.water.animationType = "";
    renderWaterSort();
  }, 280);
}

function resetMemory() {
  const icons = ["A", "B", "C", "D", "E", "F", "G", "H"];
  state.memory.cards = [...icons, ...icons]
    .sort(() => Math.random() - 0.5)
    .map((icon, index) => ({ id: index, icon, flipped: false, matched: false }));
  state.memory.moves = 0;
  state.memory.flipped = [];
  state.memory.locked = false;
}

function renderMemory() {
  if (!state.memory.cards.length) resetMemory();
  updateStats(`Moves: ${state.memory.moves}`, `Best: ${getBest("memory") || "--"}`);

  panel.innerHTML = `
    ${makeToolbar(
      "Find every matching pair with the fewest flips.",
      '<button class="btn primary" id="newMemory">New Board</button>',
    )}
    <div class="memory-grid">
      ${state.memory.cards
        .map(
          (card) => `
            <button class="memory-card ${card.flipped || card.matched ? "flipped" : ""} ${card.matched ? "matched" : ""}" data-card="${card.id}">
              ${card.flipped || card.matched ? card.icon : "?"}
            </button>
          `,
        )
        .join("")}
    </div>
    <div id="memoryResult"></div>
  `;

  document.querySelector("#newMemory").addEventListener("click", () => {
    resetMemory();
    renderMemory();
  });
  panel.querySelectorAll(".memory-card").forEach((card) => {
    card.addEventListener("click", () => flipCard(Number(card.dataset.card)));
  });
  showMemoryWin();
}

function flipCard(id) {
  const memory = state.memory;
  const card = memory.cards.find((item) => item.id === id);
  if (memory.locked || card.flipped || card.matched) return;

  card.flipped = true;
  memory.flipped.push(card);

  if (memory.flipped.length === 2) {
    memory.moves += 1;
    const [first, second] = memory.flipped;
    if (first.icon === second.icon) {
      first.matched = true;
      second.matched = true;
      memory.flipped = [];
    } else {
      memory.locked = true;
      setTimeout(() => {
        first.flipped = false;
        second.flipped = false;
        memory.flipped = [];
        memory.locked = false;
        renderMemory();
      }, 650);
    }
  }

  renderMemory();
}

function showMemoryWin() {
  if (state.memory.cards.every((card) => card.matched)) {
    setBest("memory", state.memory.moves, true);
    document.querySelector("#memoryResult").innerHTML = `
      <div class="result">
        <h3>Board cleared in ${state.memory.moves} moves</h3>
        <p>Your pattern memory is doing the heavy lifting.</p>
      </div>
    `;
  }
}

function renderSpeedTap() {
  updateStats(`Score: ${state.tap.score}`, `Best: ${getBest("tap") || "--"}`);
  panel.innerHTML = `
    ${makeToolbar(
      "Hit the button as much as possible in 15 seconds.",
      '<button class="btn primary" id="startTap">Start</button><span class="pill" id="timeLeft">Time: 15</span>',
    )}
    <div class="tap-zone">
      <button class="tap-button" id="tapButton">TAP</button>
    </div>
  `;

  document.querySelector("#startTap").addEventListener("click", startTapGame);
  document.querySelector("#tapButton").addEventListener("click", scoreTap);
}

function startTapGame() {
  stopTapTimer();
  state.tap.score = 0;
  state.tap.time = 15;
  state.tap.running = true;
  renderSpeedTap();

  state.tap.timer = setInterval(() => {
    state.tap.time -= 1;
    const timeLeft = document.querySelector("#timeLeft");
    if (timeLeft) timeLeft.textContent = `Time: ${state.tap.time}`;

    if (state.tap.time <= 0) {
      setBest("tap", state.tap.score);
      stopTapTimer();
      panel.insertAdjacentHTML(
        "beforeend",
        `<div class="result"><h3>${state.tap.score} taps</h3><p>Fresh run saved. Start again whenever your fingers recover.</p></div>`,
      );
      updateStats(`Score: ${state.tap.score}`, `Best: ${getBest("tap") || "--"}`);
    }
  }, 1000);
}

function scoreTap() {
  if (!state.tap.running) return;
  state.tap.score += 1;
  updateStats(`Score: ${state.tap.score}`, `Best: ${getBest("tap") || "--"}`);
}

function stopTapTimer() {
  clearInterval(state.tap.timer);
  state.tap.timer = null;
  state.tap.running = false;
}

renderActiveGame();
