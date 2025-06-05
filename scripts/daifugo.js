// daifugo.js

// --- グローバル変数 ---
const CARD_RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
const CARD_SUITS = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades（絵柄）

let players = []; // {name, hand:[], qTable:{}}
let currentPlayerIndex = 0;
let currentHand = []; // 直前に出されたカード
let currentRevolution = false; // 革命状態
let finishOrder = [];
let gameStarted = false;

// --- ユーティリティ ---
function cardRankIndex(card) {
  const rank = card.slice(0, -1);
  return CARD_RANKS.indexOf(rank);
}
function cardSuitIndex(card) {
  return CARD_SUITS.indexOf(card.slice(-1));
}

// ソート（階段判定用）
// ランク昇順 → 同ランク内はスート昇順
function sortCards(cards) {
  return cards.slice().sort((a,b) => {
    const r = cardRankIndex(a) - cardRankIndex(b);
    if (r !== 0) return r;
    return cardSuitIndex(a) - cardSuitIndex(b);
  });
}

// --- 階段判定 ---
// 連続したランクがlength枚以上並んでいて、スートは無関係。
// ex: 3H 4S 5C 6D（4枚階段）
// 階段の枚数を返す。最低2枚以上を階段扱い。
function isStraight(cards) {
  if (cards.length < 2) return false;
  const sorted = sortCards(cards);
  for(let i=1; i<sorted.length; i++) {
    if(cardRankIndex(sorted[i]) !== cardRankIndex(sorted[i-1]) + 1) return false;
  }
  return true;
}

// --- 革命判定 ---
// 通常革命：同ランク4枚以上の出し
// 階段革命：階段4枚以上の出し（階段革命ON時のみ）
function checkRevolution(cards) {
  if (cards.length === 0) return;

  // 通常革命判定
  const ranks = cards.map(c => c.slice(0, -1));
  const allSameRank = ranks.every(r => r === ranks[0]);
  if (allSameRank && cards.length >= 4) {
    currentRevolution = !currentRevolution;
    alert(`革命発生！状態が${currentRevolution ? '反転' : '解除'}されました！`);
    return;
  }

  // 階段革命判定
  if (cards.length >= 4 && isStraight(cards)) {
    currentRevolution = !currentRevolution;
    alert(`階段革命発生！状態が${currentRevolution ? '反転' : '解除'}されました！`);
  }
}

// --- 手札に階段判定用グルーピング ---
// 通常手札グループ（同ランクまとめ）
// + 連続階段グループ（連続ランクでまとめたもの）
// 戻り値は [{type:'set', cards:[]}, {type:'straight', cards:[]}, ...]
// typeは行動候補の分類用
function groupHandCards(hand) {
  // 同ランクまとめ
  const rankGroups = {};
  hand.forEach(c => {
    const r = c.slice(0,-1);
    if(!rankGroups[r]) rankGroups[r] = [];
    rankGroups[r].push(c);
  });

  // 同ランクグループから可能なセットアクション生成
  const sets = [];
  Object.values(rankGroups).forEach(cards => {
    for(let i=1; i<=cards.length; i++) {
      sets.push({type:'set', cards: cards.slice(0,i)});
    }
  });

  // 階段候補作成
  const sortedHand = sortCards(hand);
  const straights = [];

  // 階段を抽出するためにスライドでチェック
  for(let len=2; len<=sortedHand.length; len++) { // 2枚以上の階段
    for(let start=0; start+len <= sortedHand.length; start++) {
      const segment = sortedHand.slice(start, start+len);
      if(isStraight(segment)) {
        straights.push({type:'straight', cards:segment});
      }
    }
  }

  // 重複除去
  const uniqueStraights = [];
  const serialized = new Set();
  for(const s of straights) {
    const key = s.cards.join(',');
    if(!serialized.has(key)) {
      serialized.add(key);
      uniqueStraights.push(s);
    }
  }

  return sets.concat(uniqueStraights);
}

// --- ルール判定：合法手出しか ---
function isLegalPlay(cards) {
  if(cards.length === 0) return false;

  if(currentHand.length === 0) return true; // 新たな場のカードは何でもOK

  // 判定ロジック

  // 同じ枚数を出すことが前提
  if(cards.length !== currentHand.length) return false;

  // 同じタイプ判定
  // 既存の場のカードが階段なら階段でなければならない（逆も同様）
  const currentIsStraight = isStraight(currentHand);
  const playIsStraight = isStraight(cards);
  if(currentIsStraight !== playIsStraight) return false;

  if(currentIsStraight) {
    // 階段出しの場合はランク比較は先頭カード同士で
    const playRank = cardRankIndex(sortCards(cards)[0]);
    const currentRank = cardRankIndex(sortCards(currentHand)[0]);
    return currentRevolution ? playRank < currentRank : playRank > currentRank;
  } else {
    // 同ランク複数出しの場合
    const ranks = cards.map(c => c.slice(0,-1));
    const allSameRank = ranks.every(r => r === ranks[0]);
    if(!allSameRank) return false;

    const playRank = cardRankIndex(ranks[0]);
    const currentRank = cardRankIndex(currentHand[0].slice(0,-1));
    return currentRevolution ? playRank < currentRank : playRank > currentRank;
  }
}

// --- 順位判定・終了判定 ---
function checkWin(player) {
  if(player.hand.length === 0 && !finishOrder.includes(player)) {
    finishOrder.push(player);
    alert(`${player.name} が ${finishOrder.length}位で上がりました！`);
    if(finishOrder.length >= players.length - 1) {
      // 最後の一人も自動で順位付け
      players.forEach(p => {
        if(!finishOrder.includes(p)) finishOrder.push(p);
      });
      endGame();
    }
  }
}

function endGame() {
  gameStarted = false;
  alert(`ゲーム終了！順位:\n${finishOrder.map((p,i)=> `${i+1}位: ${p.name}`).join('\n')}`);

  // TODO: 報酬計算など

  // Qテーブル保存
  saveQTable();

  // UIボタンリセット等
  resetUI();
}

// --- Q学習関連 ---
// 状態定義：手札枚数, 場のカードトップランク, 枚数, 革命フラグ, 直前のカード種別(階段orセット)
function getState(player) {
  return JSON.stringify({
    handSize: player.hand.length,
    topRank: currentHand.length ? (isStraight(currentHand) ? 'straight' : currentHand[0].slice(0,-1)) : 'null',
    count: currentHand.length,
    revolution: currentRevolution
  });
}

// 合法アクション生成（階段含む）
function getLegalActions(player) {
  const groups = groupHandCards(player.hand);

  // isLegalPlay判定
  const legalActions = [];
  for(const group of groups) {
    if(isLegalPlay(group.cards)) legalActions.push(group.cards);
  }
  legalActions.push("PASS");
  return legalActions;
}

// Q値を取得（存在しなければ0）
function getQValue(qTable, state, actionKey) {
  if(!qTable[state]) return 0;
  return qTable[state][actionKey] || 0;
}

// Q学習 行動選択 ε-greedy
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

// Q値更新
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

// --- CPUターン ---
function cpuTurn() {
  if(!gameStarted) return;
  const cpu = players[currentPlayerIndex];
  const state = getState(cpu);
  const legalActions = getLegalActions(cpu);
  const action = chooseAction(state, legalActions, cpu.qTable);

  if(action === "PASS") {
    passTurn();
    return;
  }

  // actionはカード配列
  checkRevolution(action);

  currentHand = action;
  cpu.hand = cpu.hand.filter(c => !action.includes(c));

  const nextState = getState(cpu);
  updateQ(cpu, state, action, 0.1, nextState);

  checkWin(cpu);
  endTurn();
}

// --- ターン終了処理 ---
function endTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  if(players[currentPlayerIndex].hand.length === 0) {
    // 上がったプレイヤーはスキップ
    endTurn();
    return;
  }
  updateUI();

  if(currentPlayerIndex > 0) {
    // CPUのターンなら遅延を置く
    setTimeout(cpuTurn, 500);
  }
}

// --- パス処理 ---
function passTurn() {
  alert(`${players[currentPlayerIndex].name} はパスしました`);
  // 連続パス判定（今回は連続パスOK、ただし4連続で場クリア）
  // TODO: 実装例として4連続パスで場クリア
  // 現状は連続パス無制限
  endTurn();
}

// --- ゲーム開始 ---
function startGame() {
  // プレイヤー3人固定（1人プレイヤー、2人CPU）
  players = [
    {name:'あなた', hand:[], qTable:{}},
    {name:'CPU1', hand:[], qTable:{}},
    {name:'CPU2', hand:[], qTable:{}}
  ];

  finishOrder = [];
  currentHand = [];
  currentRevolution = false;
  currentPlayerIndex = 0;
  gameStarted = true;

  const deck = [];
  for(const r of CARD_RANKS) {
    for(const s of CARD_SUITS) {
      deck.push(r+s);
    }
  }
  shuffle(deck);

  // 配布（均等割）
  const handSize = Math.floor(deck.length / players.length);
  for(let i=0; i<players.length; i++) {
    players[i].hand = deck.slice(i*handSize, (i+1)*handSize);
    players[i].hand.sort((a,b) => {
      const r = cardRankIndex(a) - cardRankIndex(b);
      if(r !== 0) return r;
      return cardSuitIndex(a) - cardSuitIndex(b);
    });
    players[i].qTable = players[i].qTable || {};
  }

  loadQTable();
  updateUI();

  // プレイヤー先攻（index=0）
  if(currentPlayerIndex > 0) setTimeout(cpuTurn, 500);
}

// --- UI更新 ---
function updateUI() {
  // プレイヤー手札表示
  const handDiv = document.getElementById('player-hand');
  handDiv.innerHTML = '';
  players[0].hand.forEach(card => {
    const c = document.createElement('button');
    c.textContent = card;
    c.onclick = () => selectCard(card);
    handDiv.appendChild(c);
  });

  // 場のカード表示
  const turnDiv = document.getElementById('turn-indicator');
  turnDiv.textContent = `現在の場: ${currentHand.length > 0 ? currentHand.join(' ') : 'なし'} / 革命: ${currentRevolution ? '有' : '無'}`;

  // 順位表示
  const finishDiv = document.getElementById('finish-order');
  finishDiv.textContent = `順位: ${finishOrder.map((p,i)=> `${i+1}位:${p.name}`).join(' ')}`;

  // ターン表示
  const turnPlayer = players[currentPlayerIndex];
  const turnPlayerDiv = document.getElementById('current-player');
  turnPlayerDiv.textContent = `現在の手番: ${turnPlayer.name}`;
}

// --- カード選択（UI用） ---
let selectedCards = [];
function selectCard(card) {
  const idx = selectedCards.indexOf(card);
  if(idx >= 0) {
    selectedCards.splice(idx,1);
  } else {
    selectedCards.push(card);
  }
  highlightSelected();
}

function highlightSelected() {
  const handDiv = document.getElementById('player-hand');
  for(const btn of handDiv.children) {
    btn.style.backgroundColor = selectedCards.includes(btn.textContent) ? 'lightblue' : '';
  }
}

// --- プレイヤー出し ---
function playerPutout() {
  if(!gameStarted) return alert("ゲームが始まっていません");
  if(currentPlayerIndex !== 0) return alert("あなたのターンではありません");

  if(selectedCards.length === 0) return alert("カードを選択してください");
  if(!selectedCards.every(c => players[0].hand.includes(c))) return alert("不正なカードがあります");

  if(!isLegalPlay(selectedCards)) return alert("そのカードは出せません");

  checkRevolution(selectedCards);

  currentHand = selectedCards;
  players[0].hand = players[0].hand.filter(c => !selectedCards.includes(c));

  checkWin(players[0]);
  selectedCards = [];
  updateUI();
  endTurn();
}

// --- プレイヤーパス ---
function playerPass() {
  if(!gameStarted) return alert("ゲームが始まっていません");
  if(currentPlayerIndex !== 0) return alert("あなたのターンではありません");

  passTurn();
  selectedCards = [];
  updateUI();
}

// --- シャッフル ---
function shuffle(array) {
  for(let i = array.length -1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- Qテーブル保存・読み込み ---
function saveQTable() {
  // CPU共通Qテーブル（CPU1のを保存）
  if(players[1]) {
    localStorage.setItem('q_daifugo', JSON.stringify(players[1].qTable));
  }
}
function loadQTable() {
  const qStr = localStorage.getItem('q_daifugo');
  if(!qStr) return;
  const qTable = JSON.parse(qStr);
  players.forEach((p,i) => {
    if(i > 0) p.qTable = qTable;
  });
}

// --- UIリセット ---
function resetUI() {
  selectedCards = [];
  updateUI();
}

// --- イベント設定 ---
// HTML側で以下の関数をボタンに紐付けてください
window.startGame = startGame;
window.playerPutout = playerPutout;
window.playerPass = playerPass;
window.selectCard = selectCard;

// --- 最初のUI更新 ---
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
});
