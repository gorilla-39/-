// daifugo_full.js – フル機能版 大富豪（ローカルルール＋資産＋交換＋賭け金）

let players = [];
let currentTurnIndex = 0;
let previousRanks = {};
let selectedCards = [];
let currentPile = [];
let isRevolution = false;
let currentBet = 100; // 1ラウンドの賭け金（初期値）

const rankStrength = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JOKER'];

class Player {
  constructor(name, gleam = 5000, debt = 0) {
    this.name = name;
    this.gleam = gleam;
    this.debt = debt;
    this.hand = [];
    this.rank = null;
  }
}

function initGame(playerNames) {
  players = playerNames.map(n => new Player(n));
  if (!validateGleamBet()) return;
  players.forEach(p => p.gleam -= currentBet);
  dealCards();
  determineFirstPlayer();
  exchangeCards();
  updateUI();
}

function validateGleamBet() {
  const minGleam = Math.min(...players.map(p => p.gleam));
  if (minGleam < currentBet) {
    alert("所持Gleamが不足しているプレイヤーがいます");
    return false;
  }
  return true;
}

function dealCards() {
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  let deck = [];
  suits.forEach(s => ranks.forEach(r => deck.push({ suit: s, rank: r })));
  deck.push({ suit: '', rank: 'JOKER' }, { suit: '', rank: 'JOKER' });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  while (deck.length) {
    for (let p of players) {
      if (!deck.length) break;
      p.hand.push(deck.pop());
    }
  }
}

function determineFirstPlayer() {
  if (Object.keys(previousRanks).length === 0) {
    currentTurnIndex = Math.floor(Math.random() * players.length);
  } else {
    const startPlayer = players.findIndex(p => previousRanks[p.name] === "貧民");
    currentTurnIndex = startPlayer >= 0 ? startPlayer : 0;
  }
}

function exchangeCards() {
  // 仮：手札ソートし強カードを大富豪へ、大貧民へは弱カード
  const sortedPlayers = [...players].sort((a, b) => b.gleam - a.gleam);
  const rich = sortedPlayers[0], poor = sortedPlayers[sortedPlayers.length - 1];
  rich.hand.push(...poor.hand.splice(0, 2)); // poorから2枚
  poor.hand.push(...rich.hand.splice(-2));   // richから2枚
}

function updateUI() {
  const handDiv = document.getElementById('player-hand');
  handDiv.innerHTML = '';
  const currentPlayer = players[currentTurnIndex];
  currentPlayer.hand.forEach((card, idx) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = card.suit + card.rank;
    div.onclick = () => {
      div.classList.toggle('selected');
      if (selectedCards.includes(idx)) {
        selectedCards = selectedCards.filter(i => i !== idx);
      } else {
        selectedCards.push(idx);
      }
    };
    handDiv.appendChild(div);
  });
  document.getElementById('turn-indicator').textContent = `現在の手番: ${currentPlayer.name}`;
  document.getElementById('gleam-info').textContent = `Gleam: ${currentPlayer.gleam}`;
}

function playSelectedCards() {
  const currentPlayer = players[currentTurnIndex];
  if (selectedCards.length === 0) {
    alert("カードを選択してください");
    return;
  }

  const played = selectedCards.map(i => currentPlayer.hand[i]);
  const ranks = played.map(c => c.rank);
  const contains8 = ranks.includes("8");
  const contains5 = ranks.includes("5");
  const contains10 = ranks.includes("10");
  const containsJoker = ranks.includes("JOKER");
  const containsSpade3 = played.some(c => c.rank === "3" && c.suit === "♠");

  // スペ3返し
  if (currentPile.length && currentPile.some(c => c.rank === "JOKER") && containsSpade3) {
    alert("スペ3返し成功！");
    currentPile = played;
  } else {
    // 出せるかの判定（略）→仮にOKとする
    currentPile = played;
  }

  // 特殊ルール
  if (contains8) {
    alert("8切り発動！場を流します");
    currentPile = [];
  }
  if (contains5) {
    alert("5スキップ！次の1人を飛ばします");
    currentTurnIndex = (currentTurnIndex + 1) % players.length;
  }
  if (contains10) {
    alert("10捨て！追加で1枚捨ててください");
    currentPlayer.hand = currentPlayer.hand.filter((_, i) => !selectedCards.includes(i));
    selectedCards = [];
    updateUI();
    return; // 捨て処理後に改めて再アクション
  }

  if (played.length >= 4 && allSameRank(played)) {
    isRevolution = !isRevolution;
    alert("革命発動！強さが逆転しました");
  }

  currentPlayer.hand = currentPlayer.hand.filter((_, i) => !selectedCards.includes(i));
  selectedCards = [];

  if (currentPlayer.hand.length === 0) {
    alert(`${currentPlayer.name} が上がりました！`);
    assignGleamRewards(currentPlayer);
    return;
  }

  nextTurn();
}

function allSameRank(cards) {
  return cards.every(c => c.rank === cards[0].rank);
}

function passTurn() {
  selectedCards = [];
  nextTurn();
}

function nextTurn() {
  currentTurnIndex = (currentTurnIndex + 1) % players.length;
  updateUI();
}

function assignGleamRewards(winner) {
  const pot = currentBet * players.length;
  const weights = [0.5, 0.3, 0.1, 0.05, 0.05];
  const sorted = [...players].sort((a, b) => b.hand.length - a.hand.length);
  sorted.forEach((p, i) => {
    const gain = Math.floor(pot * (p === winner ? 0.5 : 0.05));
    p.gleam += gain;
  });
  updateUI();
}

window.initGame = initGame;
window.playSelectedCards = playSelectedCards;
window.passTurn = passTurn;