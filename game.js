const LETTER_DISTRIBUTION = {
  E: 12,
  A: 9,
  I: 9,
  O: 8,
  N: 6,
  R: 6,
  T: 6,
  L: 4,
  S: 4,
  U: 4,
  D: 4,
  G: 3,
  B: 2,
  C: 2,
  M: 2,
  P: 2,
  F: 2,
  H: 2,
  V: 1,
  W: 1,
  Y: 1,
  K: 1,
  J: 1,
  X: 1,
  Q: 1,
  Z: 1
};

const PLAYER_NAMES = ["你", "电脑玩家 2", "电脑玩家 3", "电脑玩家 4"];
const INITIAL_SCORE = 100;
const REVIEW_WORDS_STORAGE_KEY = "wordMahjongReviewWords";

const LEVEL_VALUE = {
  basic: 1,
  intermediate: 2,
  advanced: 3,
  academic: 4,
  challenge: 5
};

const DIFFICULTY_CONFIG = {
  basic: {
    key: "basic",
    name: "基础",
    targetLevel: "basic",
    minCoreWords: 1,
    description: "所有词均可参与胡牌；胡牌至少包含1个基础及以上等级词。"
  },
  intermediate: {
    key: "intermediate",
    name: "进阶",
    targetLevel: "intermediate",
    minCoreWords: 2,
    description: "所有词均可参与胡牌；胡牌至少包含2个进阶及以上等级词。"
  },
  advanced: {
    key: "advanced",
    name: "高阶",
    targetLevel: "advanced",
    minCoreWords: 2,
    description: "所有词均可参与胡牌；胡牌至少包含2个高阶及以上等级词。"
  },
  academic: {
    key: "academic",
    name: "学术",
    targetLevel: "academic",
    minCoreWords: 2,
    description: "所有词均可参与胡牌；胡牌至少包含2个学术及以上等级词。"
  },
  challenge: {
    key: "challenge",
    name: "挑战",
    targetLevel: "challenge",
    minCoreWords: 2,
    description: "所有词均可参与胡牌；胡牌至少包含2个挑战等级词。"
  }
};

let draggedTileIndex = null;
let selectedTileIndex = null;
let pointerDragState = null;

let reviewModeState = {
  active: false,
  words: [],
  currentIndex: 0,
  knownCount: 0,
  unknownCount: 0,
  meaningVisible: false
};

// V0.9.1 性能优化：词库索引与手牌候选词缓存
let WORD_INDEX = null;
const HAND_CANDIDATE_CACHE = new Map();
const MAX_HAND_CANDIDATE_CACHE_SIZE = 500;

let gameState = {
  wall: [],
  players: [],
  currentPlayerIndex: 0,
  discardPile: [],
  hasDrawnThisTurn: false,
  gameOver: false,
  winnerIndex: null,
  difficulty: "intermediate",
  scores: [INITIAL_SCORE, INITIAL_SCORE, INITIAL_SCORE, INITIAL_SCORE],
  lastRoundScore: null,
  roundNumber: 1,
  stats: {
    winCounts: [0, 0, 0, 0],
    falseWinCount: 0,
    bestRoundScore: 0
  }
};

const elements = {
  hand1: document.getElementById("hand-1"),
  hand2: document.getElementById("hand-2"),
  hand3: document.getElementById("hand-3"),
  hand4: document.getElementById("hand-4"),
  discardPile: document.getElementById("discardPile"),
  discardView: document.getElementById("discardView"),
  reviewView: document.getElementById("reviewView"),
  currentPlayerText: document.getElementById("currentPlayerText"),
  wallCountText: document.getElementById("wallCountText"),
  difficultyText: document.getElementById("difficultyText"),
  roundScoreText: document.getElementById("roundScoreText"),
  messageText: document.getElementById("messageText"),
  drawBtn: document.getElementById("drawBtn"),
  autoBtn: document.getElementById("autoBtn"),
  sortBtn: document.getElementById("sortBtn"),
  discardSelectedBtn: document.getElementById("discardSelectedBtn"),
  wordHintBtn: document.getElementById("wordHintBtn"),
  winCheckBtn: document.getElementById("winCheckBtn"),
  wordHintPanel: document.getElementById("wordHintPanel"),
  dictInput: document.getElementById("dictInput"),
  dictSearchBtn: document.getElementById("dictSearchBtn"),
  dictResultPanel: document.getElementById("dictResultPanel"),
  reviewPanel: document.getElementById("reviewPanel"),
  reviewWordsCount: document.getElementById("reviewWordsCount"),
  toggleReviewWordsBtn: document.getElementById("toggleReviewWordsBtn"),
  startReviewModeBtn: document.getElementById("startReviewModeBtn"),
  clearReviewWordsBtn: document.getElementById("clearReviewWordsBtn"),
  reviewWordsList: document.getElementById("reviewWordsList"),
  reviewModePanel: document.getElementById("reviewModePanel"),
  reviewProgressText: document.getElementById("reviewProgressText"),
  reviewCardWord: document.getElementById("reviewCardWord"),
  reviewCardLevel: document.getElementById("reviewCardLevel"),
  reviewCardMeaning: document.getElementById("reviewCardMeaning"),
  speakReviewWordBtn: document.getElementById("speakReviewWordBtn"),
  showReviewMeaningBtn: document.getElementById("showReviewMeaningBtn"),
  reviewKnownBtn: document.getElementById("reviewKnownBtn"),
  reviewUnknownBtn: document.getElementById("reviewUnknownBtn"),
  exitReviewModeBtn: document.getElementById("exitReviewModeBtn"),
  reviewResultText: document.getElementById("reviewResultText"),
  difficultySelect: document.getElementById("difficultySelect"),
  nextRoundBtn: document.getElementById("nextRoundBtn"),
  restartBtn: document.getElementById("restartBtn")
};

function displayWord(word) {
  return String(word || "").toLowerCase();
}

function getWordData(word) {
  if (!word || typeof DICTIONARY === "undefined") {
    return null;
  }

  const data = DICTIONARY[word];

  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return {
      meaning: data,
      level: "basic",
      rank: null,
      source: "legacy"
    };
  }

  return data;
}

function getWordMeaning(word) {
  const data = getWordData(word);

  if (!data) {
    return WORD_MEANINGS && WORD_MEANINGS[word] ? WORD_MEANINGS[word] : "暂无释义";
  }

  return data.meaning || "暂无释义";
}

function getWordLevel(word) {
  const data = getWordData(word);
  return data && data.level ? data.level : "basic";
}

function getLevelValue(level) {
  return LEVEL_VALUE[level] || 1;
}

function getWordLevelValue(word) {
  return getLevelValue(getWordLevel(word));
}

function getLevelName(level) {
  const levelNameMap = {
    basic: "基础词",
    intermediate: "进阶词",
    advanced: "高阶词",
    academic: "学术词",
    challenge: "挑战词"
  };

  return levelNameMap[level] || level || "未知等级";
}

function getSelectedDifficultyKey() {
  if (!elements.difficultySelect) {
    return "intermediate";
  }

  return elements.difficultySelect.value || "intermediate";
}

function getDifficultyConfig() {
  const key = gameState.difficulty || "intermediate";
  return DIFFICULTY_CONFIG[key] || DIFFICULTY_CONFIG.intermediate;
}

function getCurrentTargetLevelValue() {
  const config = getDifficultyConfig();
  return getLevelValue(config.targetLevel);
}

function getTargetLevelName() {
  const config = getDifficultyConfig();
  return getLevelName(config.targetLevel);
}

function getWinningRuleText() {
  const config = getDifficultyConfig();
  return `当前模式：${config.name}。${config.description}`;
}

function getDifficultyDisplayText() {
  const config = getDifficultyConfig();

  return `当前模式：${config.name}｜目标等级：${getTargetLevelName()}｜胡牌要求：至少${config.minCoreWords}个${getTargetLevelName()}及以上词｜低级词可补位但扣分，高级词加分`;
}

function getRoundStatsDisplayText() {
  const stats = gameState.stats || {
    winCounts: [0, 0, 0, 0],
    falseWinCount: 0,
    bestRoundScore: 0
  };

  const winText = gameState.players && gameState.players.length
    ? gameState.players
        .map((player, index) => `${player.name}${stats.winCounts[index] || 0}胡`)
        .join("，")
    : "暂无胡牌统计";

  return `第${gameState.roundNumber || 1}局｜${winText}｜诈胡${stats.falseWinCount || 0}次｜最高单局${stats.bestRoundScore || 0}分`;
}

function isMatchOver() {
  return gameState.scores.some((score) => score <= 0);
}

function getMatchOverText() {
  const eliminatedPlayers = gameState.players
    .filter((player, index) => gameState.scores[index] <= 0)
    .map((player) => player.name);

  const remainingPlayers = gameState.players
    .filter((player, index) => gameState.scores[index] > 0)
    .map((player) => player.name);

  if (eliminatedPlayers.length === 0) {
    return "";
  }

  if (remainingPlayers.length === 1) {
    return `本轮结束：${eliminatedPlayers.join("、")} 分数已低于或等于 0，${remainingPlayers[0]} 获胜。`;
  }

  return `本轮结束：${eliminatedPlayers.join("、")} 分数已低于或等于 0，请点击“重新开始”。`;
}

function isCoreWordForCurrentDifficulty(word) {
  return getWordLevelValue(word) >= getCurrentTargetLevelValue();
}

function countCoreWords(words) {
  return words.filter((word) => isCoreWordForCurrentDifficulty(word)).length;
}

function isValidWinningCombination(words) {
  if (!words || words.length === 0) {
    return false;
  }

  const config = getDifficultyConfig();
  return countCoreWords(words) >= config.minCoreWords;
}

function speakWord(word) {
  if (!word) return;

  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    setMessage("当前浏览器不支持语音朗读功能。");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
  setMessage(`正在朗读：${displayWord(word)}`);
}

function createSpeakableWordHtml(word, meaning, className = "speak-word") {
  const shownWord = displayWord(word);

  return `
    <button
      type="button"
      class="${className}"
      data-word="${word}"
      title="点击朗读 ${shownWord}"
    >
      ${shownWord}
    </button>
    <span class="combo-meaning"> ${meaning}</span>
  `;
}

function createWall() {
  const wall = [];

  Object.entries(LETTER_DISTRIBUTION).forEach(([letter, count]) => {
    for (let i = 0; i < count; i++) {
      wall.push({
        id: `${letter}-${i}-${Math.random().toString(36).slice(2)}`,
        letter
      });
    }
  });

  return shuffle(wall);
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createPlayers() {
  return PLAYER_NAMES.map((name, index) => ({
    id: index,
    name,
    isHuman: index === 0,
    hand: [],
    melds: [],
    discards: []
  }));
}

function dealInitialHands() {
  for (let round = 0; round < 13; round++) {
    for (let i = 0; i < gameState.players.length; i++) {
      const tile = gameState.wall.pop();
      gameState.players[i].hand.push(tile);
    }
  }
}

function startGame() {
  draggedTileIndex = null;
  selectedTileIndex = null;
  clearCandidateCache();
  initializeWordIndex();

  gameState = {
    wall: createWall(),
    players: createPlayers(),
    currentPlayerIndex: 0,
    discardPile: [],
    hasDrawnThisTurn: false,
    gameOver: false,
    winnerIndex: null,
    difficulty: getSelectedDifficultyKey(),
    scores: [INITIAL_SCORE, INITIAL_SCORE, INITIAL_SCORE, INITIAL_SCORE],
    lastRoundScore: null,
    roundNumber: 1,
    stats: {
      winCounts: [0, 0, 0, 0],
      falseWinCount: 0,
      bestRoundScore: 0
    }
  };

  dealInitialHands();
  clearWordHints();
  clearDictResult();
  clearReviewPanel();
  showDiscardView();
  renderReviewWordsPanel();
  render();

  // 开局轮到真人玩家，自动摸牌
  setTimeout(autoDrawForHumanTurn, 300);
}

function cloneStats(stats) {
  return {
    winCounts: stats && stats.winCounts ? [...stats.winCounts] : [0, 0, 0, 0],
    falseWinCount: stats ? stats.falseWinCount || 0 : 0,
    bestRoundScore: stats ? stats.bestRoundScore || 0 : 0
  };
}

function startNextRound() {
  if (!gameState.gameOver) {
    setMessage("当前局尚未结束，不能进入下一局。");
    return;
  }

  if (isMatchOver()) {
    setMessage(getMatchOverText());
    return;
  }

  draggedTileIndex = null;
  selectedTileIndex = null;
  clearCandidateCache();
  initializeWordIndex();

  const preservedScores = [...gameState.scores];
  const preservedStats = cloneStats(gameState.stats);
  const nextRoundNumber = (gameState.roundNumber || 1) + 1;

  gameState = {
    wall: createWall(),
    players: createPlayers(),
    currentPlayerIndex: 0,
    discardPile: [],
    hasDrawnThisTurn: false,
    gameOver: false,
    winnerIndex: null,
    difficulty: getSelectedDifficultyKey(),
    scores: preservedScores,
    lastRoundScore: null,
    roundNumber: nextRoundNumber,
    stats: preservedStats
  };

  dealInitialHands();
  clearWordHints();
  clearDictResult();
  clearReviewPanel();
  showDiscardView();
  renderReviewWordsPanel();
  setMessage(`第 ${gameState.roundNumber} 局开始，分数延续。系统将自动给你摸牌。`);
  render();

  setTimeout(autoDrawForHumanTurn, 300);
}

function getCurrentPlayer() {
  return gameState.players[gameState.currentPlayerIndex];
}

function drawTile() {
  if (gameState.gameOver) return;

  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer.isHuman) {
    setMessage("当前不是你的回合，请点击“电脑继续”。");
    return;
  }

  if (gameState.hasDrawnThisTurn) {
    setMessage("你本回合已经摸过牌了，请选择一张牌打出。");
    return;
  }

  if (gameState.wall.length === 0) {
    endGame("牌池已空，游戏结束。");
    return;
  }

  const tile = gameState.wall.pop();
  currentPlayer.hand.push(tile);
  gameState.hasDrawnThisTurn = true;
  selectedTileIndex = currentPlayer.hand.length - 1;

  clearWordHints();
  setMessage(`你摸到了一张 ${tile.letter}，已自动选中。可以整理手牌后打出一张。`);
  render();
}

function autoDrawForHumanTurn() {
  if (gameState.gameOver) return;

  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer.isHuman) return;
  if (gameState.hasDrawnThisTurn) return;

  if (gameState.wall.length === 0) {
    endGame("牌池已空，游戏结束。");
    return;
  }

  const tile = gameState.wall.pop();
  currentPlayer.hand.push(tile);
  gameState.hasDrawnThisTurn = true;
  selectedTileIndex = currentPlayer.hand.length - 1;

  clearWordHints();
  setMessage(`轮到你了，系统已自动摸到 ${tile.letter}。请选择一张牌打出，或尝试胡牌。`);
  render();
}

function selectHumanTile(tileIndex) {
  if (gameState.gameOver) return;

  if (selectedTileIndex === tileIndex) {
    selectedTileIndex = null;
    setMessage("已取消选中。");
  } else {
    selectedTileIndex = tileIndex;
    const tile = gameState.players[0].hand[tileIndex];
    setMessage(`已选中 ${tile.letter}。摸牌后可点击“打出选中牌”。`);
  }

  render();
}

function discardSelectedTile() {
  if (gameState.gameOver) return;

  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer.isHuman) {
    setMessage("当前不是你的回合。");
    return;
  }

  if (!gameState.hasDrawnThisTurn) {
    setMessage("当前还未摸牌，不能出牌。");
    return;
  }

  if (
    selectedTileIndex === null ||
    selectedTileIndex < 0 ||
    selectedTileIndex >= currentPlayer.hand.length
  ) {
    setMessage("请先选中一张要打出的字母牌。");
    return;
  }

  const discardedTile = currentPlayer.hand.splice(selectedTileIndex, 1)[0];

  currentPlayer.discards.push(discardedTile);
  gameState.discardPile.push({
    ...discardedTile,
    playerName: currentPlayer.name
  });

  draggedTileIndex = null;
  selectedTileIndex = null;

  clearWordHints();
  setMessage(`你打出了 ${discardedTile.letter}。电脑玩家自动行动中……`);

  nextTurn();
  render();

  if (!gameState.gameOver && !getCurrentPlayer().isHuman) {
    setTimeout(computerTurn, 500);
  }
}

function computerTurn() {
  if (gameState.gameOver) return;

  const currentPlayer = getCurrentPlayer();

  /*
    如果电脑连续行动后轮到真人玩家，
    不再等待玩家点“摸牌”，而是自动摸牌。
  */
  if (currentPlayer.isHuman) {
    setTimeout(autoDrawForHumanTurn, 300);
    return;
  }

  if (gameState.wall.length === 0) {
    endGame("牌池已空，游戏结束。");
    return;
  }

  const drawnTile = gameState.wall.pop();
  currentPlayer.hand.push(drawnTile);

  const computerWin = tryWinForPlayer(gameState.currentPlayerIndex);

  if (computerWin) {
    return;
  }

  const discardIndex = chooseComputerDiscardIndex(currentPlayer.hand);
  const discardedTile = currentPlayer.hand.splice(discardIndex, 1)[0];

  currentPlayer.discards.push(discardedTile);
  gameState.discardPile.push({
    ...discardedTile,
    playerName: currentPlayer.name
  });

  setMessage(`${currentPlayer.name} 摸牌后打出了 ${discardedTile.letter}。`);

  nextTurn();
  render();

  if (!gameState.gameOver) {
    if (getCurrentPlayer().isHuman) {
      setTimeout(autoDrawForHumanTurn, 500);
    } else {
      setTimeout(computerTurn, 500);
    }
  }
}

function chooseComputerDiscardIndex(hand) {
  if (!hand || hand.length === 0) {
    return 0;
  }

  const possibleWords = getCandidateWordsForHand(hand)
    .sort((a, b) => {
      const coreDiff =
        (isCoreWordForCurrentDifficulty(b) ? 1 : 0) -
        (isCoreWordForCurrentDifficulty(a) ? 1 : 0);

      if (coreDiff !== 0) return coreDiff;

      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      if (a.length !== b.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    });

  if (possibleWords.length === 0) {
    return Math.floor(Math.random() * hand.length);
  }

  const targetInitial = chooseComputerTargetInitial(possibleWords);

  if (!targetInitial) {
    return Math.floor(Math.random() * hand.length);
  }

  const targetWords = possibleWords
    .filter((word) => word[0] === targetInitial)
    .sort((a, b) => {
      const coreDiff =
        (isCoreWordForCurrentDifficulty(b) ? 1 : 0) -
        (isCoreWordForCurrentDifficulty(a) ? 1 : 0);

      if (coreDiff !== 0) return coreDiff;

      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      return b.length - a.length;
    })
    .slice(0, 8);

  const protectCounts = buildProtectLetterCounts(targetWords);
  const handLetterCounts = getLetterCounts(hand);

  let bestDiscardIndexes = [];
  let bestDiscardScore = -Infinity;

  hand.forEach((tile, index) => {
    const letter = tile.letter;
    const protectedValue = protectCounts[letter] || 0;
    const duplicateCount = handLetterCounts[letter] || 1;

    let discardScore = 0;

    discardScore -= protectedValue * 5;
    discardScore += Math.max(0, duplicateCount - 1) * 2;
    discardScore += Math.random() * 0.5;

    if (discardScore > bestDiscardScore) {
      bestDiscardScore = discardScore;
      bestDiscardIndexes = [index];
    } else if (Math.abs(discardScore - bestDiscardScore) < 0.0001) {
      bestDiscardIndexes.push(index);
    }
  });

  if (bestDiscardIndexes.length === 0) {
    return Math.floor(Math.random() * hand.length);
  }

  return bestDiscardIndexes[Math.floor(Math.random() * bestDiscardIndexes.length)];
}

function chooseComputerTargetInitial(possibleWords) {
  const groups = {};

  possibleWords.forEach((word) => {
    const initial = word[0];

    if (!groups[initial]) {
      groups[initial] = [];
    }

    groups[initial].push(word);
  });

  let bestInitial = null;
  let bestScore = -Infinity;

  Object.entries(groups).forEach(([initial, words]) => {
    const score = scoreComputerTargetInitial(words, initial);

    if (score > bestScore) {
      bestScore = score;
      bestInitial = initial;
    }
  });

  return bestInitial;
}

function buildProtectLetterCounts(words) {
  const counts = {};

  words.forEach((word) => {
    const weight = isCoreWordForCurrentDifficulty(word) ? 2 : 1;

    for (const letter of word) {
      counts[letter] = (counts[letter] || 0) + weight;
    }
  });

  return counts;
}






function nextTurn() {
  gameState.currentPlayerIndex =
    (gameState.currentPlayerIndex + 1) % gameState.players.length;

  gameState.hasDrawnThisTurn = false;
  selectedTileIndex = null;
}

function sortHumanHand() {
  const human = gameState.players[0];

  human.hand.sort((a, b) => a.letter.localeCompare(b.letter));

  draggedTileIndex = null;
  selectedTileIndex = null;

  clearWordHints();
  setMessage("你的手牌已按字母排序。");
  render();
}

function moveHumanTile(fromIndex, toIndex) {
  if (
    fromIndex === null ||
    toIndex === null ||
    fromIndex === toIndex
  ) {
    return;
  }

  const human = gameState.players[0];

  const movingTile = human.hand.splice(fromIndex, 1)[0];

  // 删除前面的牌后，目标索引需要修正
  if (fromIndex < toIndex) {
    toIndex--;
  }

  // 插入到目标牌左边
  human.hand.splice(toIndex, 0, movingTile);

  if (selectedTileIndex === fromIndex) {
    selectedTileIndex = toIndex;
  } else if (
    selectedTileIndex > fromIndex &&
    selectedTileIndex < toIndex
  ) {
    selectedTileIndex--;
  } else if (
    selectedTileIndex < fromIndex &&
    selectedTileIndex >= toIndex
  ) {
    selectedTileIndex++;
  }

  draggedTileIndex = null;

  setMessage("已调整手牌顺序。");
  render();
}

function moveHumanTileToEnd(fromIndex) {
  if (fromIndex === null || fromIndex < 0) return;

  const human = gameState.players[0];

  if (fromIndex >= human.hand.length - 1) {
    draggedTileIndex = null;
    return;
  }

  const movingTile = human.hand.splice(fromIndex, 1)[0];
  human.hand.push(movingTile);

  selectedTileIndex = human.hand.length - 1;
  draggedTileIndex = null;

  setMessage("已将字母牌移动到末尾。");
  render();
}

function getDropTargetIndexByPosition(clientX, clientY) {
  const handElement = elements.hand1;

  if (!handElement) {
    return null;
  }

  const handRect = handElement.getBoundingClientRect();

  const insideHand =
    clientX >= handRect.left &&
    clientX <= handRect.right &&
    clientY >= handRect.top &&
    clientY <= handRect.bottom;

  if (!insideHand) {
    return null;
  }

  const tiles = Array.from(handElement.querySelectorAll(".tile"));

  if (tiles.length === 0) {
    return null;
  }

  let nearestIndex = null;
  let nearestDistance = Infinity;

  tiles.forEach((tile) => {
    const rect = tile.getBoundingClientRect();
    const tileCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(clientX - tileCenterX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = Number(tile.dataset.index);
    }
  });

  const lastTile = tiles[tiles.length - 1];
  const lastRect = lastTile.getBoundingClientRect();

  if (clientX > lastRect.right + 25) {
    return "end";
  }

  return nearestIndex;
}

function endGame(message) {
  gameState.gameOver = true;
  setMessage(message);
  render();
}

function setMessage(message) {
  if (elements.messageText) {
    elements.messageText.textContent = message;
  }
}

function swapHumanTiles(fromIndex, toIndex) {
  moveHumanTile(fromIndex, toIndex);
}

function getLetterCounts(tiles) {
  const counts = {};

  tiles.forEach((tile) => {
    counts[tile.letter] = (counts[tile.letter] || 0) + 1;
  });

  return counts;
}

function getWordLetterCounts(word) {
  const counts = {};

  for (const letter of word) {
    counts[letter] = (counts[letter] || 0) + 1;
  }

  return counts;
}

function initializeWordIndex() {
  if (WORD_INDEX) {
    return;
  }

  WORD_INDEX = WORD_LIST.map((word) => ({
    word,
    length: word.length,
    firstLetter: word[0],
    counts: getWordLetterCounts(word),
    levelValue: getWordLevelValue(word)
  }));

  console.log(`WORD_INDEX initialized: ${WORD_INDEX.length} words`);
}

function getHandSignature(hand) {
  return hand
    .map((tile) => tile.letter)
    .sort()
    .join("");
}

function canCountsFit(wordCounts, letterCounts) {
  for (const letter in wordCounts) {
    if ((letterCounts[letter] || 0) < wordCounts[letter]) {
      return false;
    }
  }

  return true;
}

function getCandidateWordsForHand(hand) {
  initializeWordIndex();

  const signature = getHandSignature(hand);

  if (HAND_CANDIDATE_CACHE.has(signature)) {
    return [...HAND_CANDIDATE_CACHE.get(signature)];
  }

  const letterCounts = getLetterCounts(hand);
  const handLength = hand.length;

  const candidates = WORD_INDEX
    .filter((entry) => {
      if (entry.length > handLength) {
        return false;
      }

      return canCountsFit(entry.counts, letterCounts);
    })
    .map((entry) => entry.word);

  HAND_CANDIDATE_CACHE.set(signature, candidates);

  if (HAND_CANDIDATE_CACHE.size > MAX_HAND_CANDIDATE_CACHE_SIZE) {
    const firstKey = HAND_CANDIDATE_CACHE.keys().next().value;
    HAND_CANDIDATE_CACHE.delete(firstKey);
  }

  return [...candidates];
}

function clearCandidateCache() {
  HAND_CANDIDATE_CACHE.clear();
}

function canFormWord(word, letterCounts) {
  const tempCounts = { ...letterCounts };

  for (const letter of word) {
    if (!tempCounts[letter]) {
      return false;
    }

    tempCounts[letter]--;
  }

  return true;
}

function formatWordWithMeaning(word) {
  return `${displayWord(word)}（${getWordMeaning(word)}）`;
}

function sortWordsForDisplay(words) {
  return [...words].sort((a, b) => {
    const wordA = typeof a === "string" ? a : a.word;
    const wordB = typeof b === "string" ? b : b.word;

    if (wordA.length !== wordB.length) {
      return wordB.length - wordA.length;
    }

    return wordA.localeCompare(wordB);
  });
}

function getWordLengthScore(wordLength) {
  if (wordLength <= 3) return 0;
  if (wordLength === 4) return 2;
  if (wordLength === 5) return 4;
  if (wordLength === 6) return 6;
  if (wordLength === 7) return 9;
  if (wordLength === 8) return 12;
  if (wordLength === 9) return 16;
  if (wordLength >= 10) return 20 + (wordLength - 10) * 5;

  return 0;
}

function getLevelAdjustmentScore(word) {
  const wordLevelValue = getWordLevelValue(word);
  const targetLevelValue = getCurrentTargetLevelValue();

  return (wordLevelValue - targetLevelValue) * 3;
}

function getLevelAdjustmentText(word) {
  const adjustment = getLevelAdjustmentScore(word);
  const levelName = getLevelName(getWordLevel(word));

  if (adjustment > 0) {
    return `${displayWord(word)}高于当前等级（${levelName}）+${adjustment}`;
  }

  if (adjustment < 0) {
    return `${displayWord(word)}低于当前等级（${levelName}）${adjustment}`;
  }

  return `${displayWord(word)}同级（${levelName}）`;
}

function calculateRoundScore(words) {
  const sortedWords = sortWordsForDisplay(words);
  let score = 10;

  const lengthCounts = {};
  let lengthScoreTotal = 0;
  let levelScoreTotal = 0;

  sortedWords.forEach((word) => {
    lengthCounts[word.length] = (lengthCounts[word.length] || 0) + 1;

    const lengthScore = getWordLengthScore(word.length);
    const levelScore = getLevelAdjustmentScore(word);

    lengthScoreTotal += lengthScore;
    levelScoreTotal += levelScore;

    score += lengthScore;
    score += levelScore;
  });

  const allWordsAtOrAboveTarget = sortedWords.every((word) => {
    return getWordLevelValue(word) >= getCurrentTargetLevelValue();
  });

  const qualityBonus = allWordsAtOrAboveTarget ? 8 : 0;
  score += qualityBonus;

  score = Math.max(5, score);

  const detailParts = ["基础10"];

  Object.keys(lengthCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((length) => {
      const count = lengthCounts[length];
      const unitScore = getWordLengthScore(length);

      if (unitScore === 0) {
        detailParts.push(`${length}字母×${count}`);
      } else {
        const total = unitScore * count;
        detailParts.push(`${length}字母×${count}+${total}`);
      }
    });

  if (levelScoreTotal > 0) {
    detailParts.push(`等级修正+${levelScoreTotal}`);
  } else if (levelScoreTotal < 0) {
    detailParts.push(`等级修正${levelScoreTotal}`);
  } else {
    detailParts.push("等级修正0");
  }

  if (qualityBonus > 0) {
    detailParts.push("全词达到当前等级+8");
  }

  if (score === 5) {
    detailParts.push("最低5分");
  }

  return {
    score,
    detailText: detailParts.join("；"),
    lengthScoreTotal,
    levelScoreTotal,
    qualityBonus
  };
}

function applyScoreSettlement(winnerIndex, roundScore) {
  const totalGain = roundScore * (gameState.players.length - 1);

  gameState.scores = gameState.scores.map((score, index) => {
    if (index === winnerIndex) {
      return score + totalGain;
    }

    return score - roundScore;
  });

  return totalGain;
}

function applyFalseWinPenalty(playerIndex) {
  const penalty = 15;
  const reward = 5;

  gameState.scores = gameState.scores.map((score, index) => {
    if (index === playerIndex) {
      return score - penalty;
    }

    return score + reward;
  });

  if (!gameState.stats) {
    gameState.stats = {
      winCounts: [0, 0, 0, 0],
      falseWinCount: 0,
      bestRoundScore: 0
    };
  }

  gameState.stats.falseWinCount += 1;

  gameState.lastRoundScore = {
    type: "falseWin",
    offenderIndex: playerIndex,
    winnerIndex: null,
    roundScore: -penalty,
    totalGain: -penalty,
    detailText: `诈胡处罚：${gameState.players[playerIndex].name} -${penalty}，其余三家各 +${reward}`
  };

  return {
    penalty,
    reward
  };
}


function reorderPlayerHandByWords(playerIndex, words) {
  const player = gameState.players[playerIndex];
  const remainingTiles = [...player.hand];
  const orderedTiles = [];

  words.forEach((word) => {
    for (const letter of word) {
      const tileIndex = remainingTiles.findIndex((tile) => tile.letter === letter);

      if (tileIndex !== -1) {
        const tile = remainingTiles.splice(tileIndex, 1)[0];
        orderedTiles.push(tile);
      }
    }
  });

  player.hand = [...orderedTiles, ...remainingTiles];

  if (playerIndex === 0) {
    selectedTileIndex = null;
    draggedTileIndex = null;
  }
}

function findPossibleWordsFromHand() {
  const human = gameState.players[0];

  const possibleWords = getCandidateWordsForHand(human.hand)
    .sort((a, b) => {
      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      if (a.length !== b.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    });

  return possibleWords;
}

function showWordHints() {
  const possibleWords = findPossibleWordsFromHand();

  if (possibleWords.length === 0) {
    elements.wordHintPanel.innerHTML = "当前手牌暂时没有可组成单词。";
    setMessage(`暂无可组成单词。${getWinningRuleText()}`);
    return;
  }

  const topWords = possibleWords.slice(0, 30);

  elements.wordHintPanel.innerHTML = topWords
    .map((word) => {
      const meaning = getWordMeaning(word);
      const level = getWordLevel(word);
      const adjustment = getLevelAdjustmentScore(word);
      const adjustmentText =
        adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : "0";

      return `
        <span class="word-chip" title="${getLevelName(level)}｜等级修正${adjustmentText}">
          ${displayWord(word)}
        </span>
        <span class="word-meaning">${meaning}</span>
      `;
    })
    .join("");

  setMessage(`发现 ${possibleWords.length} 个可组成单词，已显示前 ${topWords.length} 个。${getWinningRuleText()}`);
}

function clearWordHints() {
  if (elements.wordHintPanel) {
    elements.wordHintPanel.innerHTML = "暂无单词提示";
  }
}

function makeCountsKey(letterCounts) {
  return Object.keys(letterCounts)
    .sort()
    .map((letter) => `${letter}${letterCounts[letter]}`)
    .join("");
}

function removeWordFromCounts(word, letterCounts) {
  const nextCounts = { ...letterCounts };

  for (const letter of word) {
    nextCounts[letter]--;

    if (nextCounts[letter] === 0) {
      delete nextCounts[letter];
    }
  }

  return nextCounts;
}

function isCountsEmpty(letterCounts) {
  return Object.keys(letterCounts).length === 0;
}

function buildCandidateWords(hand) {
  return getCandidateWordsForHand(hand)
    .sort((a, b) => {
      const coreA = isCoreWordForCurrentDifficulty(a) ? 1 : 0;
      const coreB = isCoreWordForCurrentDifficulty(b) ? 1 : 0;

      if (coreA !== coreB) {
        return coreB - coreA;
      }

      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      if (a.length !== b.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    });
}

function searchCombinationByCandidates(hand, candidateWords, options = {}) {
  const {
    requireCore = false,
    minCoreWords = 0
  } = options;

  const letterCounts = getLetterCounts(hand);
  const memo = new Map();

  function search(currentCounts, currentWords, coreWordCount) {
    if (isCountsEmpty(currentCounts)) {
      if (!requireCore || coreWordCount >= minCoreWords) {
        return currentWords;
      }

      return null;
    }

    const key = `${makeCountsKey(currentCounts)}|${coreWordCount}`;

    if (memo.has(key)) {
      return null;
    }

    for (const word of candidateWords) {
      if (!canFormWord(word, currentCounts)) {
        continue;
      }

      const nextCounts = removeWordFromCounts(word, currentCounts);
      const nextWords = [...currentWords, word];
      const nextCoreWordCount =
        coreWordCount + (isCoreWordForCurrentDifficulty(word) ? 1 : 0);

      const result = search(nextCounts, nextWords, nextCoreWordCount);

      if (result !== null) {
        return result;
      }
    }

    memo.set(key, false);
    return null;
  }

  return search(letterCounts, [], 0);
}

function findWinningCombinationForHand(hand) {
  const config = getDifficultyConfig();
  const candidateWords = buildCandidateWords(hand);

  return searchCombinationByCandidates(hand, candidateWords, {
    requireCore: true,
    minCoreWords: config.minCoreWords
  });
}

function findAnyWordCombinationForHand(hand) {
  const candidateWords = buildCandidateWords(hand);

  return searchCombinationByCandidates(hand, candidateWords, {
    requireCore: false
  });
}

function isSameInitialCombination(words) {
  if (!words || words.length === 0) {
    return false;
  }

  const firstInitial = words[0][0];

  return words.every((word) => word && word[0] === firstInitial);
}

function getComputerMinCoreWordsForDifficulty() {
  const difficulty = gameState.difficulty || "intermediate";

  /*
    电脑玩家专用胡牌门槛：
    基础 / 进阶：词库较宽，要求至少 3 个同首字母核心词；
    高阶 / 学术 / 挑战：词汇难度更高，要求至少 2 个同首字母核心词。
  */
  if (difficulty === "basic" || difficulty === "intermediate") {
    return 3;
  }

  return 2;
}

function findSameInitialWinningCombinationForHand(hand) {
  const config = getDifficultyConfig();

  /*
    电脑胡牌规则：
    不是所有单词都要同首字母；
    而是要求“当前模式核心词”中，有足够数量的词首字母相同。
  */
  const computerMinCoreWords = Math.max(
    getComputerMinCoreWordsForDifficulty(),
    config.minCoreWords
  );

  const allCandidates = buildCandidateWords(hand);

  const coreInitials = [
    ...new Set(
      allCandidates
        .filter((word) => isCoreWordForCurrentDifficulty(word))
        .map((word) => word[0])
    )
  ];

  if (coreInitials.length === 0) {
    return null;
  }

  coreInitials.sort((a, b) => {
    const scoreA = scoreComputerTargetInitial(allCandidates, a);
    const scoreB = scoreComputerTargetInitial(allCandidates, b);
    return scoreB - scoreA;
  });

  for (const targetInitial of coreInitials) {
    const combination = searchComputerCombinationByTargetInitial(
      hand,
      allCandidates,
      targetInitial,
      computerMinCoreWords
    );

    if (combination) {
      return combination;
    }
  }

  return null;
}

function searchComputerCombinationByTargetInitial(
  hand,
  candidateWords,
  targetInitial,
  minCoreWords
) {
  const letterCounts = getLetterCounts(hand);
  const memo = new Map();

  function search(currentCounts, currentWords, targetCoreCount) {
    if (isCountsEmpty(currentCounts)) {
      return targetCoreCount >= minCoreWords ? currentWords : null;
    }

    const key = `${makeCountsKey(currentCounts)}|${targetInitial}|${targetCoreCount}`;

    if (memo.has(key)) {
      return null;
    }

    for (const word of candidateWords) {
      if (!canFormWord(word, currentCounts)) {
        continue;
      }

      const nextCounts = removeWordFromCounts(word, currentCounts);
      const nextWords = [...currentWords, word];

      const isTargetCoreWord =
        isCoreWordForCurrentDifficulty(word) && word[0] === targetInitial;

      const nextTargetCoreCount =
        targetCoreCount + (isTargetCoreWord ? 1 : 0);

      const result = search(nextCounts, nextWords, nextTargetCoreCount);

      if (result !== null) {
        return result;
      }
    }

    memo.set(key, false);
    return null;
  }

  return search(letterCounts, [], 0);
}


function scoreInitialWordGroup(words) {
  if (!words || words.length === 0) {
    return 0;
  }

  const topWords = [...words]
    .sort((a, b) => {
      const coreDiff =
        (isCoreWordForCurrentDifficulty(b) ? 1 : 0) -
        (isCoreWordForCurrentDifficulty(a) ? 1 : 0);

      if (coreDiff !== 0) return coreDiff;

      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      return b.length - a.length;
    })
    .slice(0, 8);

  return topWords.reduce((total, word) => {
    let score = 0;

    score += word.length;
    score += getWordLevelValue(word) * 3;

    if (isCoreWordForCurrentDifficulty(word)) {
      score += 10;
    }

    return total + score;
  }, 0);
}

function scoreComputerTargetInitial(candidateWords, targetInitial) {
  if (!candidateWords || candidateWords.length === 0) {
    return 0;
  }

  let score = 0;

  candidateWords.forEach((word) => {
    const levelValue = getWordLevelValue(word);
    const lengthScore = Math.min(word.length, 10);

    if (isCoreWordForCurrentDifficulty(word) && word[0] === targetInitial) {
      score += 40;
      score += levelValue * 5;
      score += lengthScore;
      return;
    }

    if (word[0] === targetInitial) {
      score += 8;
      score += lengthScore;
      return;
    }

    // 非目标首字母的词可以作为补位词，但价值较低
    score += 2;
  });

  return score;
}


function evaluateSameInitialPotential(hand) {
  const possibleWords = getCandidateWordsForHand(hand)
    .sort((a, b) => {
      const levelDiff = getWordLevelValue(b) - getWordLevelValue(a);
      if (levelDiff !== 0) return levelDiff;

      if (a.length !== b.length) {
        return b.length - a.length;
      }

      return a.localeCompare(b);
    });

  if (possibleWords.length === 0) {
    return {
      bestInitial: null,
      score: 0
    };
  }

  const coreInitials = [
    ...new Set(
      possibleWords
        .filter((word) => isCoreWordForCurrentDifficulty(word))
        .map((word) => word[0])
    )
  ];

  if (coreInitials.length === 0) {
    return {
      bestInitial: null,
      score: possibleWords.length
    };
  }

  let bestInitial = null;
  let bestScore = -Infinity;

  coreInitials.forEach((initial) => {
    const score = scoreComputerTargetInitial(possibleWords, initial);

    if (score > bestScore) {
      bestScore = score;
      bestInitial = initial;
    }
  });

  return {
    bestInitial,
    score: bestScore
  };
}


function getCombinationCoreInfo(words) {
  const config = getDifficultyConfig();
  const coreWords = words.filter((word) => isCoreWordForCurrentDifficulty(word));
  const nonCoreWords = words.filter((word) => !isCoreWordForCurrentDifficulty(word));

  return {
    coreWordCount: coreWords.length,
    requiredCoreWordCount: config.minCoreWords,
    targetLevel: config.targetLevel,
    targetLevelName: getTargetLevelName(),
    coreWords,
    nonCoreWords
  };
}

function showCoreMismatchHint(words) {
  const sortedWords = sortWordsForDisplay(words);
  const coreInfo = getCombinationCoreInfo(sortedWords);
  const config = getDifficultyConfig();

  elements.wordHintPanel.innerHTML = `
    <div class="fail-result">
      当前手牌可以完整组成英文单词，但【${config.name}】模式下的核心词数量还不够。
      <br />
      当前要求：至少 ${coreInfo.requiredCoreWordCount} 个 ${coreInfo.targetLevelName} 及以上词。
      <br />
      当前组合中符合要求的核心词数量：${coreInfo.coreWordCount} 个。
      <br />
      <br />
      <strong>当前可成词组合：</strong>
      <div class="level-mismatch-list">
        ${sortedWords
          .map((word) => {
            const level = getWordLevel(word);
            const adjustment = getLevelAdjustmentScore(word);
            const adjustmentText =
              adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : "0";

            return `
              <span class="word-combo" title="${getLevelName(level)}｜等级修正${adjustmentText}">
                ${createSpeakableWordHtml(
                  word,
                  `${getWordMeaning(word)}｜${getLevelName(level)}｜等级修正${adjustmentText}`,
                  "speak-word word-combo-button"
                )}
              </span>
            `;
          })
          .join("")}
      </div>
      <br />
      建议：继续摸牌，尽量组成更多 ${coreInfo.targetLevelName} 及以上词。
    </div>
  `;

  setMessage(`胡牌失败：可以成词，但${coreInfo.targetLevelName}及以上词数量不足。`);
}

function applyWinResult(playerIndex, combination) {
  const player = gameState.players[playerIndex];
  const sortedCombination = sortWordsForDisplay(combination);
  const roundScoreResult = calculateRoundScore(sortedCombination);
  const totalGain = applyScoreSettlement(playerIndex, roundScoreResult.score);

  reorderPlayerHandByWords(playerIndex, sortedCombination);

  player.melds = sortedCombination.map((word) => ({
    word,
    meaning: getWordMeaning(word)
  }));

  if (!gameState.stats) {
    gameState.stats = {
      winCounts: [0, 0, 0, 0],
      falseWinCount: 0,
      bestRoundScore: 0
    };
  }

  gameState.stats.winCounts[playerIndex] =
    (gameState.stats.winCounts[playerIndex] || 0) + 1;

  gameState.stats.bestRoundScore = Math.max(
    gameState.stats.bestRoundScore || 0,
    roundScoreResult.score
  );

  gameState.gameOver = true;
  gameState.winnerIndex = playerIndex;
  gameState.lastRoundScore = {
    winnerIndex: playerIndex,
    roundScore: roundScoreResult.score,
    totalGain,
    detailText: roundScoreResult.detailText
  };

  const winText = `${player.name} 胡牌成功：${sortedCombination
    .map(formatWordWithMeaning)
    .join(" + ")}。本局${roundScoreResult.score}分，赢家+${totalGain}，其余玩家各-${roundScoreResult.score}。`;

  elements.wordHintPanel.innerHTML = `
    <div class="win-result">
      ${player.name} 胡牌成功，详细单词复盘请查看中央“本局复盘”区域。
    </div>
  `;

  renderReviewPanel(sortedCombination, roundScoreResult, player);
  showReviewView();

  if (isMatchOver()) {
    setMessage(`${winText} ${getMatchOverText()}`);
  } else {
    setMessage(winText);
  }

  render();
}

function tryWinForPlayer(playerIndex) {
  const player = gameState.players[playerIndex];

  /*
    真人玩家：沿用普通胡牌规则。
    电脑玩家：必须清一色，即所有组成单词首字母相同。
  */
  const combination = player.isHuman
    ? findWinningCombinationForHand(player.hand)
    : findSameInitialWinningCombinationForHand(player.hand);

  if (!combination) {
    return false;
  }

  applyWinResult(playerIndex, combination);
  return true;
}

function checkWin() {
  const currentPlayer = getCurrentPlayer();

  if (gameState.gameOver) {
    return;
  }

  if (!currentPlayer.isHuman) {
    elements.wordHintPanel.innerHTML = `
      <div class="fail-result">
        当前不是你的回合，不能胡牌。
      </div>
    `;
    setMessage("胡牌失败：当前不是你的回合。");
    return;
  }

  if (!gameState.hasDrawnThisTurn) {
    elements.wordHintPanel.innerHTML = `
      <div class="fail-result">
        请先摸牌，再进行胡牌判断。
      </div>
    `;
    setMessage("胡牌失败：必须先摸牌，才能胡牌。");
    return;
  }

  const human = gameState.players[0];

  if (human.hand.length === 0) {
    elements.wordHintPanel.innerHTML = `
      <div class="fail-result">当前没有手牌，无法胡牌检查。</div>
    `;
    return;
  }

  const strictCombination = findWinningCombinationForHand(human.hand);

  if (strictCombination) {
    applyWinResult(0, strictCombination);
    return;
  }

  const penaltyResult = applyFalseWinPenalty(0);
  clearReviewPanel("本次诈胡未成功，暂无胡牌复盘。");
  showDiscardView();
  const looseCombination = findAnyWordCombinationForHand(human.hand);

  if (looseCombination) {
    const sortedWords = sortWordsForDisplay(looseCombination);
    const coreInfo = getCombinationCoreInfo(sortedWords);

    elements.wordHintPanel.innerHTML = `
      <div class="fail-result">
        诈胡！当前手牌虽然可以完整组成英文单词，但【${getDifficultyConfig().name}】模式下的核心词数量不足。
        <br />
        当前要求：至少 ${coreInfo.requiredCoreWordCount} 个 ${coreInfo.targetLevelName} 及以上词。
        <br />
        当前组合中符合要求的核心词数量：${coreInfo.coreWordCount} 个。
        <br />
        处罚：你 -${penaltyResult.penalty} 分，其余三家各 +${penaltyResult.reward} 分。
        <br />
        <br />
        <strong>当前可成词组合：</strong>
        <div class="level-mismatch-list">
          ${sortedWords
            .map((word) => {
              const level = getWordLevel(word);
              const adjustment = getLevelAdjustmentScore(word);
              const adjustmentText =
                adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : "0";

              return `
                <span class="word-combo" title="${getLevelName(level)}｜等级修正${adjustmentText}">
                  ${createSpeakableWordHtml(
                    word,
                    `${getWordMeaning(word)}｜${getLevelName(level)}｜等级修正${adjustmentText}`,
                    "speak-word word-combo-button"
                  )}
                </span>
              `;
            })
            .join("")}
        </div>
      </div>
    `;

    if (isMatchOver()) {
      setMessage(`诈胡！核心词数量不足。你扣${penaltyResult.penalty}分，其余三家各得${penaltyResult.reward}分。${getMatchOverText()}`);
    } else {
      setMessage(`诈胡！核心词数量不足。你扣${penaltyResult.penalty}分，其余三家各得${penaltyResult.reward}分。`);
    }

    render();
    return;
  }

  elements.wordHintPanel.innerHTML = `
    <div class="fail-result">
      诈胡！当前手牌无法完整拆成词库中的英文单词。
      <br />
      处罚：你 -${penaltyResult.penalty} 分，其余三家各 +${penaltyResult.reward} 分。
      <br />
      ${getWinningRuleText()}
    </div>
  `;

  if (isMatchOver()) {
    setMessage(`诈胡！当前手牌不能完整成词。你扣${penaltyResult.penalty}分，其余三家各得${penaltyResult.reward}分。${getMatchOverText()}`);
  } else {
    setMessage(`诈胡！当前手牌不能完整成词。你扣${penaltyResult.penalty}分，其余三家各得${penaltyResult.reward}分。`);
  }

  render();
}

function clearDictResult() {
  if (elements.dictResultPanel) {
    elements.dictResultPanel.innerHTML = "暂无查词结果";
  }
}

function clearReviewPanel(message = "胡牌后显示本局单词复盘") {
  if (!elements.reviewPanel) return;

  elements.reviewPanel.innerHTML = `
    <div class="review-empty">${message}</div>
  `;
}

function loadReviewWords() {
  try {
    const raw = localStorage.getItem(REVIEW_WORDS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("读取复习词表失败：", error);
    return [];
  }
}

function saveReviewWords(words) {
  try {
    localStorage.setItem(REVIEW_WORDS_STORAGE_KEY, JSON.stringify(words));
  } catch (error) {
    console.warn("保存复习词表失败：", error);
    setMessage("复习词表保存失败，可能是浏览器存储受限。");
  }
}

function isWordInReviewList(word) {
  const normalizedWord = String(word || "").toUpperCase();
  return loadReviewWords().some((item) => item.word === normalizedWord);
}

function addWordToReviewList(word) {
  const normalizedWord = String(word || "").toUpperCase();

  if (!normalizedWord) {
    return;
  }

  const words = loadReviewWords();

  if (words.some((item) => item.word === normalizedWord)) {
    setMessage(`${displayWord(normalizedWord)} 已在复习词表中。`);
    return;
  }

  words.unshift({
    word: normalizedWord,
    meaning: getWordMeaning(normalizedWord),
    level: getWordLevel(normalizedWord),
    addedAt: new Date().toISOString()
  });

  saveReviewWords(words);
  renderReviewWordsPanel();
  refreshAddReviewButtons();
  updateReviewModeButtons();
  setMessage(`已加入复习词：${displayWord(normalizedWord)}`);
}

function clearReviewWords() {
  const words = loadReviewWords();

  if (words.length === 0) {
    setMessage("复习词表已经是空的。");
    return;
  }

  const confirmed = window.confirm(`确定清空 ${words.length} 个复习词吗？`);

  if (!confirmed) {
    return;
  }

  saveReviewWords([]);

  if (reviewModeState.active) {
    exitReviewMode();
  }

  renderReviewWordsPanel();
  refreshAddReviewButtons();
  updateReviewModeButtons();
  setMessage("复习词表已清空。");
}

function toggleReviewWordsList() {
  if (!elements.reviewWordsList) return;

  elements.reviewWordsList.classList.toggle("hidden");

  if (elements.toggleReviewWordsBtn) {
    const isHidden = elements.reviewWordsList.classList.contains("hidden");
    elements.toggleReviewWordsBtn.textContent = isHidden ? "查看复习词" : "收起复习词";
  }
}

function renderReviewWordsPanel() {
  const words = loadReviewWords();

  if (elements.reviewWordsCount) {
    elements.reviewWordsCount.textContent = words.length;
  }

  if (!elements.reviewWordsList) {
    return;
  }

  if (words.length === 0) {
    elements.reviewWordsList.innerHTML = `<div class="review-words-empty">暂无复习词。胡牌复盘中可点击“加入”。</div>`;
    return;
  }

  const shownWords = words.slice(0, 50);

  elements.reviewWordsList.innerHTML = shownWords
    .map((item) => {
      const word = item.word;
      const meaning = item.meaning || getWordMeaning(word);
      const levelName = getLevelName(item.level || getWordLevel(word));

      return `
        <div class="review-word-item">
          <div class="review-word-main">
            <button
              type="button"
              class="speak-word review-word-name"
              data-word="${word}"
              title="点击朗读 ${displayWord(word)}"
            >
              ${displayWord(word)}
            </button>
            <span class="review-word-level">${levelName}</span>
            <span class="review-word-meaning">${meaning}</span>
          </div>
        </div>
      `;
    })
    .join("");

  if (words.length > shownWords.length) {
    elements.reviewWordsList.innerHTML += `
      <div class="review-words-empty">仅显示前 ${shownWords.length} 个，共 ${words.length} 个。</div>
    `;
  }

  updateReviewModeButtons();
}

function shuffleReviewWords(words) {
  const result = [...words];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getCurrentReviewWordItem() {
  if (!reviewModeState.active) return null;
  return reviewModeState.words[reviewModeState.currentIndex] || null;
}

function startReviewMode() {
  const words = loadReviewWords();

  if (words.length === 0) {
    setMessage("复习词表为空。请先在胡牌复盘中加入复习词。");
    return;
  }

  reviewModeState = {
    active: true,
    words: shuffleReviewWords(words),
    currentIndex: 0,
    knownCount: 0,
    unknownCount: 0,
    meaningVisible: false
  };

  if (elements.reviewModePanel) {
    elements.reviewModePanel.classList.remove("hidden");
  }

  if (elements.reviewWordsList) {
    elements.reviewWordsList.classList.add("hidden");
  }

  if (elements.toggleReviewWordsBtn) {
    elements.toggleReviewWordsBtn.textContent = "查看复习词";
  }

  renderReviewCard();
  setMessage(`开始复习，共 ${words.length} 个词。`);
}

function exitReviewMode() {
  if (!reviewModeState.active) {
    if (elements.reviewModePanel) {
      elements.reviewModePanel.classList.add("hidden");
    }

    return;
  }

  const total = reviewModeState.knownCount + reviewModeState.unknownCount;

  reviewModeState.active = false;

  if (elements.reviewResultText) {
    elements.reviewResultText.innerHTML = `
      <span class="review-result-good">本轮已退出：</span>
      已复习 ${total} 个，认识 ${reviewModeState.knownCount} 个，不认识 ${reviewModeState.unknownCount} 个。
    `;
  }

  if (elements.reviewModePanel) {
    elements.reviewModePanel.classList.add("hidden");
  }

  setMessage(`已退出复习模式。本轮已复习 ${total} 个词。`);
}

function finishReviewMode() {
  const total = reviewModeState.words.length;
  const known = reviewModeState.knownCount;
  const unknown = reviewModeState.unknownCount;

  reviewModeState.active = false;

  if (elements.reviewProgressText) {
    elements.reviewProgressText.textContent = `${total} / ${total}`;
  }

  if (elements.reviewCardWord) {
    elements.reviewCardWord.textContent = "完成";
    elements.reviewCardWord.dataset.word = "";
  }

  if (elements.reviewCardLevel) {
    elements.reviewCardLevel.textContent = "本轮复习结束";
  }

  if (elements.reviewCardMeaning) {
    elements.reviewCardMeaning.classList.remove("hidden");
    elements.reviewCardMeaning.innerHTML = `
      本轮共复习 ${total} 个词。<br />
      <span class="review-result-good">认识：${known} 个</span><br />
      <span class="review-result-bad">不认识：${unknown} 个</span>
    `;
  }

  if (elements.reviewResultText) {
    elements.reviewResultText.innerHTML = `
      本轮完成：共 ${total} 个，认识 ${known} 个，不认识 ${unknown} 个。
    `;
  }

  updateReviewModeButtons();
  setMessage(`本轮复习完成：认识 ${known} 个，不认识 ${unknown} 个。`);
}

function renderReviewCard() {
  if (!reviewModeState.active) return;

  const item = getCurrentReviewWordItem();

  if (!item) {
    finishReviewMode();
    return;
  }

  const word = item.word;
  const meaning = item.meaning || getWordMeaning(word);
  const level = item.level || getWordLevel(word);
  const levelName = getLevelName(level);

  if (elements.reviewProgressText) {
    elements.reviewProgressText.textContent =
      `${reviewModeState.currentIndex + 1} / ${reviewModeState.words.length}`;
  }

  if (elements.reviewCardWord) {
    elements.reviewCardWord.textContent = displayWord(word);
    elements.reviewCardWord.dataset.word = word;
    elements.reviewCardWord.title = `点击朗读 ${displayWord(word)}`;
  }

  if (elements.reviewCardLevel) {
    elements.reviewCardLevel.textContent = levelName;
  }

  if (elements.reviewCardMeaning) {
    elements.reviewCardMeaning.innerHTML = meaning;
    elements.reviewCardMeaning.classList.toggle("hidden", !reviewModeState.meaningVisible);
  }

  if (elements.reviewResultText) {
    elements.reviewResultText.textContent =
      `认识 ${reviewModeState.knownCount} 个｜不认识 ${reviewModeState.unknownCount} 个`;
  }

  updateReviewModeButtons();
}

function showCurrentReviewMeaning() {
  if (!reviewModeState.active) {
    setMessage("请先点击“开始复习”。");
    return;
  }

  reviewModeState.meaningVisible = true;
  renderReviewCard();

  const item = getCurrentReviewWordItem();
  if (item) {
    setMessage(`显示释义：${displayWord(item.word)}`);
  }
}

function speakCurrentReviewWord() {
  const item = getCurrentReviewWordItem();

  if (!item) {
    setMessage("当前没有正在复习的单词。");
    return;
  }

  speakWord(item.word);
}

function markCurrentReviewWord(isKnown) {
  if (!reviewModeState.active) {
    setMessage("当前未处于复习模式。");
    return;
  }

  const item = getCurrentReviewWordItem();

  if (!item) {
    finishReviewMode();
    return;
  }

  if (isKnown) {
    reviewModeState.knownCount += 1;
  } else {
    reviewModeState.unknownCount += 1;
  }

  reviewModeState.currentIndex += 1;
  reviewModeState.meaningVisible = false;

  if (reviewModeState.currentIndex >= reviewModeState.words.length) {
    finishReviewMode();
    return;
  }

  renderReviewCard();
}

function updateReviewModeButtons() {
  const hasWords = loadReviewWords().length > 0;
  const active = reviewModeState.active;

  if (elements.startReviewModeBtn) {
    elements.startReviewModeBtn.disabled = !hasWords;
  }

  if (elements.speakReviewWordBtn) {
    elements.speakReviewWordBtn.disabled = !active;
  }

  if (elements.showReviewMeaningBtn) {
    elements.showReviewMeaningBtn.disabled = !active;
  }

  if (elements.reviewKnownBtn) {
    elements.reviewKnownBtn.disabled = !active;
  }

  if (elements.reviewUnknownBtn) {
    elements.reviewUnknownBtn.disabled = !active;
  }

  if (elements.exitReviewModeBtn) {
    elements.exitReviewModeBtn.disabled = !active;
  }
}

function refreshAddReviewButtons() {
  document.querySelectorAll(".add-review-word-btn").forEach((button) => {
    const word = button.dataset.word;

    if (isWordInReviewList(word)) {
      button.textContent = "已加入";
      button.classList.add("added");
      button.disabled = true;
    } else {
      button.textContent = "加入";
      button.classList.remove("added");
      button.disabled = false;
    }
  });
}

function createAddReviewButtonHtml(word) {
  const added = isWordInReviewList(word);

  return `
    <button
      type="button"
      class="add-review-word-btn ${added ? "added" : ""}"
      data-word="${word}"
      ${added ? "disabled" : ""}
      title="加入复习词表"
    >
      ${added ? "已加入" : "加入"}
    </button>
  `;
}

function showDiscardView() {
  if (elements.discardView) {
    elements.discardView.classList.remove("hidden");
  }

  if (elements.reviewView) {
    elements.reviewView.classList.add("hidden");
  }
}

function showReviewView() {
  if (elements.discardView) {
    elements.discardView.classList.add("hidden");
  }

  if (elements.reviewView) {
    elements.reviewView.classList.remove("hidden");
  }
}

function formatSignedScore(score) {
  if (score > 0) return `+${score}`;
  if (score < 0) return `${score}`;
  return "0";
}

function getAdjustmentClass(score) {
  if (score > 0) return "review-adjust-positive";
  if (score < 0) return "review-adjust-negative";
  return "review-adjust-zero";
}

function renderReviewPanel(words, roundScoreResult, winner) {
  if (!elements.reviewPanel) return;

  const sortedWords = sortWordsForDisplay(words);
  const levelScoreTotal = roundScoreResult.levelScoreTotal || 0;
  const lengthScoreTotal = roundScoreResult.lengthScoreTotal || 0;
  const qualityBonus = roundScoreResult.qualityBonus || 0;

  const rowsHtml = sortedWords
    .map((word) => {
      const level = getWordLevel(word);
      const levelName = getLevelName(level);
      const meaning = getWordMeaning(word);
      const lengthScore = getWordLengthScore(word.length);
      const levelScore = getLevelAdjustmentScore(word);
      const levelScoreText = formatSignedScore(levelScore);
      const lengthScoreText = formatSignedScore(lengthScore);
      const adjustmentClass = getAdjustmentClass(levelScore);

      return `
        <tr>
          <td>
            <button
              type="button"
              class="speak-word review-word-button"
              data-word="${word}"
              title="点击朗读 ${displayWord(word)}"
            >
              ${displayWord(word)}
            </button>
          </td>
          <td class="review-meaning">${meaning}</td>
          <td class="review-level">${levelName}</td>
          <td>${word.length}</td>
          <td>${lengthScoreText}</td>
          <td class="${adjustmentClass}">${levelScoreText}</td>
          <td>${createAddReviewButtonHtml(word)}</td>
        </tr>
      `;
    })
    .join("");

  const allWordsAtOrAboveTarget = sortedWords.every((word) => {
    return getWordLevelValue(word) >= getCurrentTargetLevelValue();
  });

  elements.reviewPanel.innerHTML = `
    <div class="review-summary">
      ${winner.name} 胡牌复盘｜本局 ${roundScoreResult.score} 分｜
      词长加分 ${formatSignedScore(lengthScoreTotal)}｜
      等级修正 ${formatSignedScore(levelScoreTotal)}｜
      质量奖励 ${formatSignedScore(qualityBonus)}
      ${allWordsAtOrAboveTarget ? "｜全词达到当前等级" : ""}
    </div>

    <table class="review-table">
      <thead>
        <tr>
          <th>单词</th>
          <th>释义</th>
          <th>等级</th>
          <th>长度</th>
          <th>长度分</th>
          <th>等级分</th>
          <th>复习</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function searchDictionary() {
  if (!elements.dictInput || !elements.dictResultPanel) return;

  const rawInput = elements.dictInput.value.trim();

  if (!rawInput) {
    elements.dictResultPanel.innerHTML = "请输入要查询的英文单词。";
    return;
  }

  const word = rawInput.toUpperCase();
  const inDictionary = WORD_LIST.includes(word);
  const meaning = getWordMeaning(word);

  const human = gameState.players[0];
  const letterCounts = getLetterCounts(human.hand);
  const canForm = canFormWord(word, letterCounts);

  if (!inDictionary) {
    elements.dictResultPanel.innerHTML = `
      <div>
        <strong>${displayWord(word)}</strong> 暂不在当前词库中。
        <br />
        当前手牌${canForm ? "可以" : "不能"}拼出这个词。
      </div>
    `;
    setMessage(`查词：${displayWord(word)} 暂不在当前词库中。`);
    return;
  }

  const level = getWordLevel(word);
  const adjustment = getLevelAdjustmentScore(word);
  const adjustmentText =
    adjustment > 0 ? `+${adjustment}` : adjustment < 0 ? `${adjustment}` : "0";

  elements.dictResultPanel.innerHTML = `
    <div>
      <strong>${displayWord(word)}</strong>：${meaning}
      <br />
      词库等级：${getLevelName(level)}
      <br />
      当前模式等级修正：${adjustmentText}
      <br />
      当前手牌：${canForm ? "可以拼出这个词" : "暂时不能拼出这个词"}
    </div>
  `;

  setMessage(`查词：${displayWord(word)}，${meaning}`);
}

function render() {
  renderStatus();
  renderScores();
  renderHands();
  renderMelds();
  renderDiscardPile();
  renderReviewWordsPanel();
  updateReviewModeButtons();
  updateButtons();
}

function renderStatus() {
  const currentPlayer = getCurrentPlayer();

  if (gameState.gameOver && isMatchOver()) {
    elements.currentPlayerText.textContent = getMatchOverText();
  } else if (gameState.gameOver && gameState.winnerIndex !== null) {
    elements.currentPlayerText.textContent = `游戏结束：${gameState.players[gameState.winnerIndex].name} 胡牌`;
  } else {
    elements.currentPlayerText.textContent = `当前回合：${currentPlayer.name}`;
  }

  elements.wallCountText.textContent = `剩余牌数：${gameState.wall.length}`;

  if (elements.difficultyText) {
    elements.difficultyText.textContent =
      `${getDifficultyDisplayText()}｜${getRoundStatsDisplayText()}`;
  }

  renderRoundScore();
}

function renderRoundScore() {
  if (!elements.roundScoreText) return;

  if (!gameState.lastRoundScore) {
    elements.roundScoreText.className = "round-score-normal";
    elements.roundScoreText.textContent = "本局得分：-";
    return;
  }

  if (gameState.lastRoundScore.type === "falseWin") {
    const offender = gameState.players[gameState.lastRoundScore.offenderIndex];

    elements.roundScoreText.className = "round-score-positive";
    elements.roundScoreText.textContent =
      `本局处罚：${offender.name} 诈胡 -15 分｜其余三家各 +5 分`;
    return;
  }

  const winner = gameState.players[gameState.lastRoundScore.winnerIndex];

  if (!winner) {
    elements.roundScoreText.className = "round-score-normal";
    elements.roundScoreText.textContent = gameState.lastRoundScore.detailText || "本局得分：-";
    return;
  }

  elements.roundScoreText.className = "round-score-positive";
  elements.roundScoreText.textContent =
    `本局得分：${gameState.lastRoundScore.roundScore} 分｜${winner.name} +${gameState.lastRoundScore.totalGain}｜其余各 -${gameState.lastRoundScore.roundScore}｜${gameState.lastRoundScore.detailText}`;
}

function renderScores() {
  gameState.scores.forEach((score, index) => {
    const scoreElement = document.getElementById(`score-${index + 1}`);

    if (!scoreElement) return;

    scoreElement.textContent = `${score} 分`;
    scoreElement.classList.remove("score-up", "score-down");

    if (!gameState.lastRoundScore) return;

    if (gameState.lastRoundScore.type === "falseWin") {
      if (index === gameState.lastRoundScore.offenderIndex) {
        scoreElement.classList.add("score-down");
      } else {
        scoreElement.classList.add("score-up");
      }

      return;
    }

    if (index === gameState.lastRoundScore.winnerIndex) {
      scoreElement.classList.add("score-up");
    } else {
      scoreElement.classList.add("score-down");
    }
  });
}

function renderMelds() {
  gameState.players.forEach((player, index) => {
    const meldElement = document.getElementById(`meld-${index + 1}`);

    if (!meldElement) return;

    meldElement.classList.remove("side-winner-meld");

    const isSideWinner =
      gameState.gameOver &&
      gameState.winnerIndex === index &&
      (index === 1 || index === 3);

    if (!player.melds || player.melds.length === 0) {
      meldElement.innerHTML = "已成词区";
      return;
    }

    /*
      左右两侧电脑玩家胡牌时：
      侧边区域只显示“已胡牌”，不显示一长串单词按钮，
      避免挤压侧边手牌显示。
    */
    if (isSideWinner) {
      meldElement.classList.add("side-winner-meld");
      meldElement.innerHTML = "已胡牌";
      return;
    }

    const sortedMelds = sortWordsForDisplay(player.melds);

    meldElement.innerHTML = sortedMelds
      .map((item) => {
        if (typeof item === "string") {
          const shownWord = displayWord(item);

          return `<span class="meld-text-word">
            <button type="button" class="speak-word meld-word-button" data-word="${item}" title="点击朗读 ${shownWord}">
              ${shownWord}
            </button>
          </span>`;
        }

        const shownWord = displayWord(item.word);

        return `<span class="meld-text-word">
          <button type="button" class="speak-word meld-word-button" data-word="${item.word}" title="点击朗读 ${shownWord}">
            ${shownWord}
          </button>（${item.meaning}）
        </span>`;
      })
      .join(" ");
  });
}

function renderHands() {
  gameState.players.forEach((player, index) => {
    const handElement = elements[`hand${index + 1}`];

    handElement.innerHTML = "";
    handElement.classList.remove("side-winner-hand", "top-winner-hand");

    const shouldRevealComputerHand =
      gameState.gameOver && gameState.winnerIndex === index && !player.isHuman;

    const isTopWinner = shouldRevealComputerHand && index === 2;
    const isSideWinner = shouldRevealComputerHand && (index === 1 || index === 3);

    if (isTopWinner) handElement.classList.add("top-winner-hand");
    if (isSideWinner) handElement.classList.add("side-winner-hand");

    if (player.isHuman) {
      player.hand.forEach((tile, tileIndex) => {
        const tileElement = document.createElement("div");
        tileElement.className = "tile";

        if (selectedTileIndex === tileIndex) {
          tileElement.classList.add("selected");
        }

        tileElement.textContent = tile.letter;
        tileElement.dataset.index = tileIndex;
        tileElement.draggable = false;
        tileElement.title = gameState.gameOver
          ? "游戏已结束"
          : "点击选中；拖动可调整顺序";

        tileElement.addEventListener("pointerdown", (e) => {
          if (gameState.gameOver) return;

          draggedTileIndex = tileIndex;

          pointerDragState = {
            pointerId: e.pointerId,
            fromIndex: tileIndex,
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false,
            tileElement
          };

          try {
            tileElement.setPointerCapture(e.pointerId);
          } catch (error) {
            // 某些浏览器可能不支持或释放过快，忽略即可
          }
        });

        tileElement.addEventListener("pointermove", (e) => {
          if (
            !pointerDragState ||
            pointerDragState.pointerId !== e.pointerId ||
            gameState.gameOver
          ) {
            return;
          }

          const moveDistance = Math.hypot(
            e.clientX - pointerDragState.startX,
            e.clientY - pointerDragState.startY
          );

          if (moveDistance <= 8) {
            return;
          }

          pointerDragState.hasMoved = true;
          tileElement.classList.add("dragging");

          e.preventDefault();
        });

        tileElement.addEventListener("pointerup", (e) => {
          if (
            !pointerDragState ||
            pointerDragState.pointerId !== e.pointerId
          ) {
            return;
          }

          const dragState = pointerDragState;

          tileElement.classList.remove("dragging");

          try {
            tileElement.releasePointerCapture(e.pointerId);
          } catch (error) {
            // 指针已释放时忽略
          }

          pointerDragState = null;

          if (gameState.gameOver) {
            draggedTileIndex = null;
            return;
          }

          if (!dragState.hasMoved) {
            draggedTileIndex = null;
            selectHumanTile(tileIndex);
            return;
          }

          const targetIndex = getDropTargetIndexByPosition(e.clientX, e.clientY);

          if (targetIndex === "end") {
            moveHumanTileToEnd(dragState.fromIndex);
          } else if (targetIndex !== null) {
            moveHumanTile(dragState.fromIndex, targetIndex);
          } else {
            draggedTileIndex = null;
            render();
          }

          e.preventDefault();
        });

        tileElement.addEventListener("pointercancel", () => {
          tileElement.classList.remove("dragging");
          draggedTileIndex = null;
          pointerDragState = null;
        });

        tileElement.addEventListener("lostpointercapture", () => {
          tileElement.classList.remove("dragging");

          if (pointerDragState && pointerDragState.tileElement === tileElement) {
            draggedTileIndex = null;
            pointerDragState = null;
          }
        });

        handElement.appendChild(tileElement);
      });

      return;
    }

    player.hand.forEach((tile) => {
      if (shouldRevealComputerHand) {
        const tileElement = document.createElement("div");
        tileElement.className = "tile";
        tileElement.textContent = tile.letter;
        tileElement.title = `${player.name} 胡牌手牌`;
        handElement.appendChild(tileElement);
      } else {
        const tileBack = document.createElement("div");
        tileBack.className = "tile-back";
        handElement.appendChild(tileBack);
      }
    });
  });
}

function renderDiscardPile() {
  elements.discardPile.innerHTML = "";

  gameState.discardPile.forEach((tile) => {
    const tileElement = document.createElement("div");
    tileElement.className = "tile discard-tile";
    tileElement.textContent = tile.letter;
    tileElement.title = `${tile.playerName} 打出`;
    elements.discardPile.appendChild(tileElement);
  });
}

function updateButtons() {
  const currentPlayer = getCurrentPlayer();
  const isHumanTurn = currentPlayer.isHuman;

  if (elements.drawBtn) {
    elements.drawBtn.disabled =
      gameState.gameOver || !isHumanTurn || gameState.hasDrawnThisTurn;

    if (isHumanTurn && !gameState.hasDrawnThisTurn && !gameState.gameOver) {
      elements.drawBtn.textContent = "摸牌";
    } else if (isHumanTurn && gameState.hasDrawnThisTurn) {
      elements.drawBtn.textContent = "已摸牌";
    } else {
      elements.drawBtn.textContent = "摸牌";
    }
  }

  if (elements.autoBtn) {
    elements.autoBtn.disabled =
      gameState.gameOver || isHumanTurn;
  }

  if (elements.nextRoundBtn) {
    const canStartNextRound = gameState.gameOver && !isMatchOver();

    elements.nextRoundBtn.disabled = !canStartNextRound;
    elements.nextRoundBtn.classList.toggle("round-ready", canStartNextRound);
  }

  elements.sortBtn.disabled =
    gameState.gameOver;

  if (elements.wordHintBtn) {
    elements.wordHintBtn.disabled = gameState.gameOver;
  }

  if (elements.winCheckBtn) {
    elements.winCheckBtn.disabled =
      gameState.gameOver || !isHumanTurn || !gameState.hasDrawnThisTurn;
  }

  elements.discardSelectedBtn.disabled =
    gameState.gameOver ||
    !isHumanTurn ||
    !gameState.hasDrawnThisTurn ||
    selectedTileIndex === null;
}

if (elements.drawBtn) {
  elements.drawBtn.addEventListener("click", drawTile);
}

if (elements.autoBtn) {
  elements.autoBtn.addEventListener("click", computerTurn);
}
elements.sortBtn.addEventListener("click", sortHumanHand);
elements.wordHintBtn.addEventListener("click", showWordHints);

if (elements.winCheckBtn) {
  elements.winCheckBtn.addEventListener("click", checkWin);
}

if (elements.dictSearchBtn) {
  elements.dictSearchBtn.addEventListener("click", searchDictionary);
}

if (elements.dictInput) {
  elements.dictInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchDictionary();
    }
  });
}

if (elements.difficultySelect) {
  elements.difficultySelect.addEventListener("change", () => {
    startGame();
  });
}

document.addEventListener("click", (event) => {
  const addReviewButton = event.target.closest(".add-review-word-btn");

  if (addReviewButton) {
    event.preventDefault();
    event.stopPropagation();

    const word = addReviewButton.dataset.word;

    if (word) {
      addWordToReviewList(word);
    }

    return;
  }

  const speakButton = event.target.closest(".speak-word");

  if (!speakButton) return;

  event.preventDefault();
  event.stopPropagation();

  const word = speakButton.dataset.word;

  if (word) {
    speakWord(word);
  }
});

elements.discardSelectedBtn.addEventListener("click", discardSelectedTile);

if (elements.nextRoundBtn) {
  elements.nextRoundBtn.addEventListener("click", startNextRound);
}

if (elements.toggleReviewWordsBtn) {
  elements.toggleReviewWordsBtn.addEventListener("click", toggleReviewWordsList);
}

if (elements.startReviewModeBtn) {
  elements.startReviewModeBtn.addEventListener("click", startReviewMode);
}

if (elements.clearReviewWordsBtn) {
  elements.clearReviewWordsBtn.addEventListener("click", clearReviewWords);
}

if (elements.speakReviewWordBtn) {
  elements.speakReviewWordBtn.addEventListener("click", speakCurrentReviewWord);
}

if (elements.showReviewMeaningBtn) {
  elements.showReviewMeaningBtn.addEventListener("click", showCurrentReviewMeaning);
}

if (elements.reviewKnownBtn) {
  elements.reviewKnownBtn.addEventListener("click", () => markCurrentReviewWord(true));
}

if (elements.reviewUnknownBtn) {
  elements.reviewUnknownBtn.addEventListener("click", () => markCurrentReviewWord(false));
}

if (elements.exitReviewModeBtn) {
  elements.exitReviewModeBtn.addEventListener("click", exitReviewMode);
}

elements.restartBtn.addEventListener("click", startGame);

renderReviewWordsPanel();
updateReviewModeButtons();
startGame();
