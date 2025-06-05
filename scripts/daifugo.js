let players = [];
let currentTurnIndex = 0;
let selectedCards = [];
let currentPile = [];
let isRevolution = false;
let currentBet = 100;
let Q_table = {};
let cpuMemory = [[], [], []]; // 各CPUの記録

const rankStrength = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JOKER'];
const CPU_NAMES = ["CPU_1", "CPU_2", "CPU_3"];
let isCPUmode = true;

class Player {
  constructor(name, isCPU = false) {
    this.name = name;
    this.gleam = 5000;
    this.debt = 0;
    this.hand = [];
    this.rank = null;
    this.isCPU = isCPU;
  }
}

function startGame() {
  isCPUmode = confirm("CPU戦を開始しますか？（OKでCPU戦、キャンセルでプレイヤー戦）");
  const names = isCPUmode ? ["You", ...CPU_NAMES] : prompt("名前をカンマ区切りで").split(",");
  players = names.map((n, i) => new Player(n.trim(), isCPUmode && i > 0));

  if (!players.every(p => p.gleam >= currentBet)) {
    alert("Gleam不足");
    return;
  }
  players.forEach(p => p.gleam -= currentBet);
  dealCards();
  currentTurnIndex = 0;
  updateUI();
  if (players[currentTurnIndex].isCPU) setTimeout(cpuTurn, 500);
}

function dealCards() {
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  let deck = suits.flatMap(s => ranks.map(r => ({ suit: s, rank: r })));
  deck.push({ rank: 'JOKER', suit: '' }, { rank: 'JOKER', suit: '' });
  deck.sort(() => Math.random() - 0.5);
  while (deck.length) players.forEach(p => deck.length && p.hand.push(deck.pop()));
}

function updateUI() {
  const div = document.getElementById('daifugo-result');
  div.innerHTML = `<p>手番: ${players[currentTurnIndex].name}</p>`;
  const handDiv = document.getElementById("player-hand");
  if (!players[currentTurnIndex].isCPU) {
    handDiv.innerHTML = players[currentTurnIndex].hand.map((c, i) =>
      `<button onclick="toggleCard(${i})">${c.suit}${c.rank}</button>`
    ).join("");
  } else {
    handDiv.innerHTML = "<p>CPUのターン...</p>";
  }
}

function toggleCard(i) {
  if (selectedCards.includes(i)) selectedCards = selectedCards.filter(x => x !== i);
  else selectedCards.push(i);
}

function putout() {
  const p = players[currentTurnIndex];
  const cards = selectedCards.map(i => p.hand[i]);
  if (!canPlay(cards)) return alert("出せません");
  currentPile = cards;
  p.hand = p.hand.filter((_, i) => !selectedCards.includes(i));
  selectedCards = [];
  checkWin(p);
  nextTurn();
}

function pass() {
  selectedCards = [];
  nextTurn();
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  updateUI();
  const p = players[currentTurnIndex];
  if (p.isCPU) setTimeout(cpuTurn, 700);
}

function checkWin(p) {
  if (p.hand.length === 0) {
    alert(`${p.name} が上がりました！`);
    const idx = players.indexOf(p);
    const reward = idx === 0 ? 1 : idx === 1 ? 0.5 : -0.2;
    cpuMemory.forEach((mem, i) =>
      mem.forEach(({s,a,n}) => updateQ(s, a, reward, n))
    );
    Q_save();
  }
}

function cpuTurn() {
  const cpu = players[currentTurnIndex];
  const cpuIndex = CPU_NAMES.indexOf(cpu.name);
  const state = getState(cpu);
  const actions = getLegalActions(cpu);
  const action = chooseAction(state, actions);
  const nextHand = applyAction(cpu, action);
  const nextState = getState(cpu);

  cpuMemory[cpuIndex].push({ s: state, a: action, n: nextState });

  currentPile = action === "PASS" ? currentPile : nextHand;
  cpu.hand = cpu.hand.filter(c => !nextHand.includes(c));
  checkWin(cpu);
  nextTurn();
}

function getState(p) {
  const counts = Array(15).fill(0);
  p.hand.forEach(c => {
    let i = rankStrength.indexOf(c.rank);
    if (c.rank === "3" && c.suit === "♠") i = 14;
    counts[i]++;
  });
  return JSON.stringify({
    r: counts,
    h: p.hand.length,
    rev: isRevolution,
    top: currentPile.length ? rankStrength.indexOf(currentPile[0].rank) : -1,
    cnt: currentPile.length
  });
}

function getLegalActions(p) {
  let groups = {};
  p.hand.forEach(c => {
    const key = c.rank;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  let actions = [];
  for (const key in groups) {
    const g = groups[key];
    for (let i = 1; i <= g.length; i++) {
      const combo = g.slice(0, i);
      if (canPlay(combo)) actions.push(combo);
    }
  }
  actions.push("PASS");
  return actions;
}

function chooseAction(state, actions) {
  const eps = 0.2;
  if (Math.random() < eps) return actions[Math.floor(Math.random() * actions.length)];
  let max = -Infinity, best = "PASS";
  actions.forEach(a => {
    const k = typeof a === "string" ? a : a.map(c => c.suit + c.rank).join(",");
    const q = (Q_table[state] && Q_table[state][k]) || 0;
    if (q > max) { max = q; best = k; }
  });
  return best;
}

function applyAction(p, a) {
  if (a === "PASS") return [];
  const cardStrs = a.split(",");
  return p.hand.filter(c => cardStrs.includes(c.suit + c.rank));
}

function canPlay(cards) {
  if (!cards.length) return false;
  if (!currentPile.length) return true;
  if (cards.length !== currentPile.length) return false;
  const rank = cards[0].rank;
  if (!cards.every(c => c.rank === rank)) return false;
  const r1 = rankStrength.indexOf(cards[0].rank);
  const r2 = rankStrength.indexOf(currentPile[0].rank);
  return isRevolution ? r1 < r2 : r1 > r2;
}

function updateQ(s, a, r, ns) {
  const alpha = 0.1, gamma = 0.9;
  if (!Q_table[s]) Q_table[s] = {};
  if (!Q_table[s][a]) Q_table[s][a] = 0;
  const maxNext = Math.max(...Object.values(Q_table[ns] || {PASS: 0}));
  Q_table[s][a] += alpha * (r + gamma * maxNext - Q_table[s][a]);
}

function Q_save() {
  localStorage.setItem("Q_daifugo", JSON.stringify(Q_table));
}

function Q_load() {
  const q = localStorage.getItem("Q_daifugo");
  if (q) Q_table = JSON.parse(q);
}

Q_load();

