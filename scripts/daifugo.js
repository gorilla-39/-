// --- Firebase初期化（あなたの設定に書き換えてください） ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- グローバル変数 ---
const CARD_RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const CARD_SUITS = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades

let players = []; // {name, hand:[], qTable:{}}
let currentPlayerIndex = 0;
let currentHand = []; // 直前に出されたカード
let currentRevolution = false; // 革命状態
let finishOrder = [];
let gameStarted = false;
let selectedCards = [];
let gameMode = 'cpu'; // 'cpu' or 'player'

// --- DOM要素 ---
const daifugoArea = document.getElementById('daifugo-area');
const modeSelect = document.getElementById('daifugo-mode-select');
const playerHandDiv = document.getElementById('player-hand');
const turnIndicator = document.getElementById('turn-indicator');
const gleamInfo = document.getElementById('gleam-info');
const daifugoResult = document.getElementById('daifugo-result');
const putButton = document.getElementById('put-button');
const passButton = document.getElementById('pass-button');
const betInput = document.getElementById('daifugo-bet');

// --- ユーティリティ関数 ---
function cardRankIndex(card) {
  const rank = card.slice(0, -1);
  return CARD_RANKS.indexOf(rank);
}
function cardSuitIndex(card) {
  return CARD_SUITS.indexOf(card.slice(-1));
}

function sortCards(cards) {
  return cards.slice().sort((a,b) => {
    const r = cardRankIndex(a) - cardRankIndex(b);
    if (r !== 0) return r;
    return cardSuitIndex(a) - cardSuitIndex(b);
  });
}

function shuffle(array) {
  for(let i = array.length -1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- ゲームモード切替 ---
function setDaifugoMode(mode) {
  gameMode = mode;
  modeSelect.classList.add('hidden');
  daifugoArea.classList.remove('hidden');
  updateGleamInfo();
  updateTurnIndicator();
  updatePlayerHand();
  putButton.classList.remove('hidden');
  passButton.classList.remove('hidden');
}

// --- カード選択処理 ---
function toggleCardSelection(cardDiv, card) {
  if(selectedCards.includes(card)) {
    selectedCards = selectedCards.filter(c => c !== card);
    cardDiv.classList.remove('selected');
  } else {
    selectedCards.push(card);
    cardDiv.classList.add('selected');
  }
}

// --- 手札表示更新 ---
function updatePlayerHand() {
  playerHandDiv.innerHTML = '';
  if(!players.length) return;
  const player = players[0];
  player.hand.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.textContent = card;
    cardDiv.onclick = () => {
      toggleCardSelection(cardDiv, card);
    };
    playerHandDiv.appendChild(cardDiv);
  });
}

// --- ターン表示更新 ---
function updateTurnIndicator() {
  if(!gameStarted) {
    turnIndicator.textContent = 'ゲーム準備中';
    return;
  }
  const player = players[currentPlayerIndex];
  turnIndicator.textContent = `現在のターン: ${player.name} (${player.hand.length}枚)`;
}

// --- 掛け金情報更新 ---
function updateGleamInfo() {
  const bet = betInput.value;
  gleamInfo.textContent = bet ? `掛け金: ${bet} Gleam` : '掛け金を入力してください';
}

// --- 出せるか判定（合法手かどうか） ---
function isLegalPlay(cards) {
  if(cards.length === 0) return false;

  if(currentHand.length === 0) return true;

  if(cards.length !== currentHand.length) return false;

  const currentIsStraight = isStraight(currentHand);
  const playIsStraight = isStraight(cards);
  if(currentIsStraight !== playIsStraight) return false;

  if(currentIsStraight) {
    const playRank = cardRankIndex(sortCards(cards)[0]);
    const currentRank = cardRankIndex(sortCards(currentHand)[0]);
    return currentRevolution ? playRank < currentRank : playRank > currentRank;
  } else {
    const ranks = cards.map(c => c.slice(0,-1));
    const allSameRank = ranks.every(r => r === ranks[0]);
    if(!allSameRank) return false;

    const playRank = cardRankIndex(ranks[0]);
    const currentRank = cardRankIndex(currentHand[0].slice(0,-1));
    return currentRevolution ? playRank < currentRank : playRank > currentRank;
  }
}

// --- 革命チェック ---
function checkRevolution(cards) {
  if(cards.length === 0) return;

  const ranks = cards.map(c => c.slice(0, -1));
  const allSameRank = ranks.every(r => r === ranks[0]);
  if(allSameRank && cards.length >= 4) {
    currentRevolution = !currentRevolution;
    alert(`革命発生！状態が${currentRevolution ? '反転' : '解除'}されました！`);
    return;
  }

  if(cards.length >= 4 && isStraight(cards)) {
    currentRevolution = !currentRevolution;
    alert(`階段革命発生！状態が${currentRevolution ? '反転' : '解除'}されました！`);
  }
}

// --- 階段判定 ---
function isStraight(cards) {
  if (cards.length < 2) return false;
  const sorted = sortCards(cards);
  for(let i=1; i<sorted.length; i++) {
    if(cardRankIndex(sorted[i]) !== cardRankIndex(sorted[i-1]) + 1) return false;
  }
  return true;
}

// --- 勝利判定 ---
function checkWin(player) {
  if(player.hand.length === 0 && !finishOrder.includes(player)) {
    finishOrder.push(player);
    alert(`${player.name} が ${finishOrder.length}位で上がりました！`);
    if(finishOrder.length >= players.length - 1) {
      players.forEach(p => {
        if(!finishOrder.includes(p)) finishOrder.push(p);
      });
      endGame();
    }
  }
}

// --- ゲーム終了 ---
function endGame() {
  gameStarted = false;
  updateTurnIndicator();
  daifugoResult.textContent = `ゲーム終了！順位:\n${finishOrder.map((p,i)=> `${i+1}位: ${p.name}`).join('\n')}`;
  saveQTable();
  resetUI();
}

// --- UIリセット ---
function resetUI() {
  selectedCards = [];
  playerHandDiv.innerHTML = '';
  putButton.classList.add('hidden');
  passButton.classList.add('hidden');
}

// --- ゲーム開始 ---
async function startGame() {
  finishOrder = [];
  currentHand = [];
  currentRevolution = false;
  selectedCards = [];
  gameStarted = true;
  currentPlayerIndex = 0;

  // プレイヤー設定
  if(gameMode === 'cpu') {
    players = [
      {name:'あなた', hand:[], qTable:{}},
      {name:'CPU1', hand:[], qTable:{}},
      {name:'CPU2', hand:[], qTable:{}}
    ];
  } else {
    players = [
      {name:'プレイヤー1', hand:[], qTable:{}},
      {name:'プレイヤー2', hand:[], qTable:{}},
      {name:'プレイヤー3', hand:[], qTable:{}}
    ];
  }

  // デッキ作成・シャッフル
  const deck = [];
  for(const r of CARD_RANKS) {
    for(const s of CARD_SUITS) {
      deck.push(r+s);
    }
  }
  shuffle(deck);

  // 配布
  let i=0;
  while(deck.length > 0) {
    players[i % players.length].hand.push(deck.pop());
    i++;
  }

  players.forEach(p => {
    p.hand = sortCards(p.hand);
  });

  if(gameMode === 'cpu') {
    // CPUのQテーブルをFirebaseから読み込み
    await Promise.all(players.slice(1).map(p => loadQTable(p)));
  }

  updatePlayerHand();
  updateTurnIndicator();
  updateGleamInfo();

  if(gameMode === 'cpu' && currentPlayerIndex > 0) {
    setTimeout(cpuTurn, 500);
  } else {
    putButton.classList.remove('hidden');
    passButton.classList.remove('hidden');
  }
}

// --- カードを出す（プレイヤー操作） ---
function putout() {
  if(selectedCards.length === 0) {
    alert('カードを選択してください');
    return;
  }
  if(!isLegalPlay(selectedCards)) {
    alert('そのカードは出せません');
    return;
  }

  checkRevolution(selectedCards);

  // 手札からカードを減らす
  const player = players[0];
  selectedCards.forEach(c => {
    const idx = player.hand.indexOf(c);
    if(idx >= 0) player.hand.splice(idx, 1);
  });

  currentHand = selectedCards.slice();
  selectedCards = [];

  updatePlayerHand();
  updateTurnIndicator();

  checkWin(player);

  endTurn();
}

// --- パス（プレイヤー操作） ---
function pass() {
  alert('パスしました');
  endTurn();
}

// --- ターン終了処理 ---
function endTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateTurnIndicator();

  // プレイヤーの手札が0なら次へ
  if(players[currentPlayerIndex].hand.length === 0) {
    endTurn();
    return;
  }

  if(gameMode === 'cpu') {
    if(currentPlayerIndex > 0) {
      putButton.classList.add('hidden');
      passButton.classList.add('hidden');
      setTimeout(cpuTurn, 800);
    } else {
      putButton.classList.remove('hidden');
      passButton.classList.remove('hidden');
    }
  } else {
    putButton.classList.remove('hidden');
    passButton.classList.remove('hidden');
  }
  updatePlayerHand();
}

// --- CPUのQ学習関連 ---

function getState(player) {
  return JSON.stringify({
    handSize: player.hand.length,
    topRank: currentHand.length ? (isStraight(currentHand) ? 'straight' : currentHand[0].slice(0,-1)) : 'null',
    count: currentHand.length,
    revolution: currentRevolution
  });
}

function groupHandCards(hand) {
  const rankGroups = {};
  hand.forEach(c => {
    const r = c.slice(0,-1);
    if(!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r].push(c);
  });

  const sets = [];
  Object.values(rankGroups).forEach(cards => {
    for(let i=1; i<=cards.length; i++) {
      sets.push(cards.slice(0,i));
    }
  });

  const sortedHand = sortCards(hand);
  const straights = [];
  for(let len=2; len<=sortedHand.length; len++) {
    for(let start=0; start+len <= sortedHand.length; start++) {
      const segment = sortedHand.slice(start, start+len);
      if(isStraight(segment)) {
        straights.push(segment);
      }
    }
  }

  const uniqueStraights = [];
  const serialized = new Set();
  for(const s of straights) {
    const key = s.join(',');
    if(!serialized.has(key)) {
      serialized.add(key);
      uniqueStraights.push(s);
    }
  }

  return sets.concat(uniqueStraights);
}

function getLegalActions(player) {
  const groups = groupHandCards(player.hand);
  const legalActions = [];
  for(const group of groups) {
    if(isLegalPlay(group)) legalActions.push(group);
  }
  legalActions.push("PASS");
  return legalActions;
}

function getQValue(qTable, state, actionKey) {
  if(!qTable[state]) return 0;
  return qTable[state][actionKey] || 0;
}

function chooseAction(state, actions, qTable) {
  const EPSILON = 0.2;
  if(Math.random() < EPSILON) {
    return actions[Math.floor(Math.random() * actions.length)];
  }
  let bestAction = "PASS";
  let bestQ = -Infinity;
  for(const action of actions) {
    const key = (typeof action === "string") ? action : action.join(',');
    const q = getQValue(qTable, state, key);
    if(q > bestQ) {
      bestQ = q;
      bestAction = action;
    }
  }
  return bestAction;
}

function updateQ(player, state, action, reward, nextState) {
  const ALPHA = 0.1;
  const GAMMA = 0.95;
  const actionKey = (typeof action === "string") ? action : action.join(',');

  const currentQ = getQValue(player.qTable, state, actionKey);
  const nextMaxQ = Math.max(...Object.values(player.qTable[nextState] || { PASS: 0 }));

  const updatedQ = currentQ + ALPHA * (reward + GAMMA * nextMaxQ - currentQ);

  if(!player.qTable[state]) player.qTable[state] = {};
  player.qTable[state][actionKey] = updatedQ;
}

// --- CPUのターン ---
function cpuTurn() {
  if(!gameStarted) return;
  const cpu = players[currentPlayerIndex];
  const state = getState(cpu);
  const legalActions = getLegalActions(cpu);
  const action = chooseAction(state, legalActions, cpu.qTable);

  if(action === "PASS") {
    alert(`${cpu.name} はパスしました`);
    endTurn();
    return;
  }

  checkRevolution(action);

  currentHand = action;
  cpu.hand = cpu.hand.filter(c => !action.includes(c));

  const nextState = getState(cpu);
  updateQ(cpu, state, action, 0.1, nextState);

  checkWin(cpu);
  endTurn();
}

// --- FirebaseにQテーブル保存 ---
function saveQTable() {
  players.forEach(p => {
    if(p.qTable && Object.keys(p.qTable).length > 0) {
      db.ref(`daifugo_q/${p.name}`).set(p.qTable);
    }
  });
}

// --- FirebaseからQテーブル読み込み ---
function loadQTable(player) {
  return db.ref(`daifugo_q/${player.name}`).get()
    .then(snapshot => {
      if(snapshot.exists()) {
        player.qTable = snapshot.val();
      } else {
        player.qTable = {};
      }
    })
    .catch(() => {
      player.qTable = {};
    });
}

// --- ゲームエリア表示切替 ---
function toggleGame(game) {
  if(game === 'daifugo') {
    daifugoArea.classList.toggle('hidden');
    modeSelect.classList.toggle('hidden');
    resetUI();
  }
}
