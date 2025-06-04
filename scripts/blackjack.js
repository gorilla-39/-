// Blackjack game logic – Hit / Stand / Double‑Down / Surrender 対応版
// DOM 要素は fixed.html（上記）に対応

let deck = [];
let playerHand = [];
let dealerHand = [];
let betAmount = 0;
let doubled = false;

// ======= ヘルパー =======
function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = [
    { r: "A", v: 11 },
    { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
    { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 }, { r: "10", v: 10 },
    { r: "J", v: 10 }, { r: "Q", v: 10 }, { r: "K", v: 10 }
  ];
  const d = [];
  for (const s of suits) {
    for (const rk of ranks) d.push({ rank: rk.r, suit: s, value: rk.v });
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach(c => {
    total += c.value;
    if (c.rank === "A") aces += 1;
  });
  while (total > 21 && aces) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function handToString(hand) {
  return hand.map(c => `${c.suit}${c.rank}`).join(" ");
}

function revealHands(showDealerAll) {
  const dealerDisp  = showDealerAll ? handToString(dealerHand) : `${dealerHand[0].suit}${dealerHand[0].rank} ??`;
  const dealerTotal = showDealerAll ? handValue(dealerHand) : "?";
  const playerDisp  = handToString(playerHand);
  const playerTotal = handValue(playerHand);
  document.getElementById("blackjack-result").innerHTML =
    `ディーラー: ${dealerDisp} (合計: ${dealerTotal})<br>` +
    `あなた: ${playerDisp} (合計: ${playerTotal})`;
}

function toggleActionButtons(show) {
  ["hit-button", "stand-button", "double-button", "surrender-button"].forEach(id =>
    document.getElementById(id).classList.toggle("hidden", !show)
  );
}

function finishRound(extraText = "") {
  toggleActionButtons(false);
  document.getElementById("start-button").textContent = "もう一度";
  if (extraText) {
    document.getElementById("blackjack-result").innerHTML += `<br><strong>${extraText}</strong>`;
  }
}

// ======= ゲームフロー =======
function startGame() {
  const input = document.getElementById("blackjack-bet").value.trim();
  betAmount = parseInt(input, 10);
  const user = users[currentUser];
  if (input === "" || isNaN(betAmount)) { alert("賭け金を入力してください"); return; }
  if (betAmount <= 0 || betAmount > user.gleam) { alert("有効な賭け金を入力してください"); return; }

  user.gleam -= betAmount;
  saveUsers();
  updateMetrics();

  deck        = buildDeck();
  playerHand  = [deck.pop(), deck.pop()];
  dealerHand  = [deck.pop(), deck.pop()];
  doubled     = false;

  revealHands(false);
  toggleActionButtons(true);
  document.getElementById("start-button").textContent = "もう一度"; // ラウンド途中の中断用
}

function hit() {
  playerHand.push(deck.pop());
  revealHands(false);
  if (handValue(playerHand) > 21) endRound();
}

function stand() { endRound(); }

function doubleDown() {
  const user = users[currentUser];
  if (playerHand.length !== 2) { alert("最初の 2 枚の後のみダブルダウン可能です"); return; }
  if (user.gleam < betAmount) { alert("残高不足でダブルダウンできません"); return; }

  user.gleam -= betAmount;
  betAmount  *= 2;
  doubled     = true;
  saveUsers();
  updateMetrics();

  playerHand.push(deck.pop());
  revealHands(false);
  stand();
}

function surrender() {
  const user = users[currentUser];
  if (playerHand.length !== 2) { alert("サレンダーは最初の 2 枚の後のみ選択できます"); return; }

  // 返金：賭け金の半額
  const refund = Math.floor(betAmount / 2);
  user.gleam += refund;
  saveUsers();
  updateMetrics();

  revealHands(true);
  finishRound(`サレンダー ‑ ${betAmount - refund} Gleam 失いました`);
}

function endRound() {
  while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());

  const p = handValue(playerHand);
  const d = handValue(dealerHand);
  let result = "";
  if (p > 21)           result = "負け";
  else if (d > 21)      result = "勝ち";
  else if (p > d)       result = "勝ち";
  else if (p < d)       result = "負け";
  else                  result = "引き分け";

  const user = users[currentUser];
  if (result === "勝ち")      user.gleam += betAmount * 2;
  else if (result === "引き分け") user.gleam += betAmount;
  
  saveUsers();
  updateMetrics();

  revealHands(true);
  finishRound(`結果: ${result}`);
}

// ==== グローバル公開 ====
window.startGame   = startGame;
window.hit         = hit;
window.stand       = stand;
window.doubleDown  = doubleDown;
window.surrender   = surrender;
