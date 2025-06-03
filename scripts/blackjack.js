//  this code is running tintiro in one display modal.
let p1_value = 0; let p2_value=0;
let betAmount

function drawCard() {
  const betInput = document.getElementById("blackjack-bet").value.trim();
  betAmount = parseInt(betInput, 10);
  user = users[currentUser];

  if (betInput === "" || isNaN(betAmount)) {alert("賭け金を入力してください");return;}
  if (betAmount <= 0 || betAmount > user.gleam) {alert("有効な賭け金を入力してください");return;}


  cardNum = Math.floor(Math.random()*13) +1;
  if (p1_value + cardNum >= 22) {
    if (cardNum==13) cardNum=1;
    if (p1_value + cardNum >= 22) {check();return;}
  }
  p1_value += cardNum;

  cardNum = Math.floor(Math.random()*13) +1;
  if (p2_value + cardNum >= 22) {
    if (cardNum==13) cardNum=1;
    if (p2_value + cardNum >= 22) {check();return;}
  }
  p2_value += cardNum;
  
  document.getElementById("blackjack-result").innerHTML = `自分のカード合計： ${p1_value}`;
}

function GetWinner() {
  if (p1_value>=22) {
    if (p2_value>=22) return 0;
    return 1;
  } else if (p2_value>=22) {
    return 2;
  }
  if (p1_value > p2_value) {
    return 2;
  } else if(p1_value == p2_value) {
    return 0;
  }
  return 1;
}

function check() {
  const winner = GetWinner();
  let payout;

  if (winner==2) payout=betAmount*2;
  if (winner==1) payout=0;
  if (winner==0) payout=betAmount;

  user.gleam += payout - betAmount;
  p1_value = 0; p2_value=0;
  if (user.gleam < 0) user.gleam = 0;
  saveUsers();
  updateMetrics();
  const win_player = (winner==0 ? "引き分け" : (winner==1 ? "負け" : "勝ち"));
  document.getElementById("blackjack-result").innerHTML = win_player;
}