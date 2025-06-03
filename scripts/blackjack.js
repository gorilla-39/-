// Blackjack game logic – improved version with correct rules, double‑down, and hand reveal
// Assumes the following DOM elements exist in fixed.html:
//  - #blackjack-bet (input)
//  - #start-button (開始)
//  - #hit-button (ヒット)
//  - #stand-button (スタンド)
//  - #double-button (ダブルアップ)
//  - #blackjack-result (div for hand + result text)
//  - metrics are updated via updateMetrics()

// ======= game state =======
let deck = [];
let playerHand = [];
let dealerHand = [];
let betAmount = 0;
let doubled = false; // true when player doubled‑down this round

// ======= helpers =======
function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = [
    { r: "A", v: 11 },
    { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 }, { r: "5", v: 5 },
    { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 }, { r: "9", v: 9 }, { r: "10", v: 10 },
    { r: "J", v: 10 }, { r: "Q", v: 10 }, { r: "K", v: 10 }
  ];
  let d = [];
  for (const s of suits) {
    for (const rk of ranks) {
      d.push({ rank: rk.r, suit: s, value: rk.v });
    }
  }
  // Fisher‑Yates shuffle
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  hand.forEach(card => {
    total += card.value;
    if (card.rank === "A") aces += 1;
  });
  // adjust Ace(s) from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10; // 11 -> 1
    aces -= 1;
  }
  return total;
}

function handToString(hand) {
  return hand.map(c => `${c.suit}${c.rank}`).join(" ");
}

function revealHands(showDealerAll) {
  const dealerDisplay = showDealerAll ? handToString(dealerHand) : `${dealerHand[0].suit}${dealerHand[0].rank} ??`;
  const dealerTotal = showDealerAll ? handValue(dealerHand) : "?";
  const playerDisplay = handToString(playerHand);
  const playerTotal = handValue(playerHand);
  document.getElementById("blackjack-result").innerHTML =
    `ディーラー: ${dealerDisplay} (合計: ${dealerTotal})<br>` +
    `あなた: ${playerDisplay} (合計: ${playerTotal})`;
}

function endRound() {
  // Dealer reveals and draws to 17+
  while (handValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
  }
  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);
  let resultText = "";
  if (playerTotal > 21) {
    resultText = "負け";
  } else if (dealerTotal > 21) {
    resultText = "勝ち";
  } else if (playerTotal > dealerTotal) {
    resultText = "勝ち";
  } else if (playerTotal < dealerTotal) {
    resultText = "負け";
  } else {
    resultText = "引き分け";
  }

  const user = users[currentUser];
  if (resultText === "勝ち") {
    user.gleam += betAmount * 2;
  } else if (resultText === "引き分け") {
    user.gleam += betAmount; // 返却
  }
  saveUsers();
  updateMetrics();

  revealHands(true);
  document.getElementById("blackjack-result").innerHTML += `<br><strong>結果: ${resultText}</strong>`;

  // Reset UI buttons
  toggleActionButtons(false);
  document.getElementById("start-button").textContent = "もう一度";
}

function toggleActionButtons(show) {
  ["hit-button", "stand-button", "double-button"].forEach(id => {
    document.getElementById(id).classList.toggle("hidden", !show);
  });
}

// ======= button handlers =======
function startGame() {
  const betInput = document.getElementById("blackjack-bet").value.trim();
  betAmount = parseInt(betInput, 10);
  const user = users[currentUser];

  if (betInput === "" || isNaN(betAmount)) { alert("賭け金を入力してください"); return; }
  if (betAmount <= 0 || betAmount > user.gleam) { alert("有効な賭け金を入力してください"); return; }

  // take the bet
  user.gleam -= betAmount;
  saveUsers();
  updateMetrics();

  // initialise round
  deck = buildDeck();
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];
  doubled = false;

  revealHands(false);
  toggleActionButtons(true);
  document.getElementById("start-button").textContent = "リセット"; // allows cancel mid‑round
}

function hit() {
  playerHand.push(deck.pop());
  revealHands(false);
  if (handValue(playerHand) > 21) {
    endRound();
  }
}

function stand() {
  endRound();
}

function doubleDown() {
  const user = users[currentUser];
  if (playerHand.length !== 2) { alert("最初の2枚の後のみダブルアップ可能です"); return; }
  if (user.gleam < betAmount) { alert("残高不足でダブルアップできません"); return; }

  // double the bet and take one card then stand
  user.gleam -= betAmount;
  betAmount *= 2;
  doubled = true;
  saveUsers();
  updateMetrics();

  playerHand.push(deck.pop());
  revealHands(false);
  stand();
}

// Expose functions to HTML
window.startGame = startGame;
window.hit = hit;
window.stand = stand;
window.doubleDown = doubleDown;
