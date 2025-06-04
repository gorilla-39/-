//  this code is running tintiro in one display modal.
function rollDice() {
  user = users[currentUser];
  const betInput = document.getElementById("tintiro-bet").value.trim();
  const bet = parseInt(betInput, 10);

  if (betInput === "" || isNaN(bet)) {
    alert("賭け金を入力してください");
    return;
  }

  if (bet <= 0 || bet > user.gleam) {
    alert("有効な賭け金を入力してください");
    return;
  }

  const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
  let result = `出目: ${dice.join(", ")}<br>`;
  const sorted = [...dice].sort();
  let payout = 0;

  //個人的にはここは別関数にして「どんな出目か」とかを返してもらった上でswith-caseでやったほうが綺麗な気がする
  //賛成でごわす
  if (dice[0] === dice[1] && dice[1] === dice[2]) {
    payout = dice[0] === 1 ? bet * 6 : bet * 4; // ピンゾロ5倍、ゾロ目3倍
    result += dice[0] === 1 ? "ピンゾロ！5倍！" : "ゾロ目！3倍！";
  } else if (sorted.join() === "1,2,3") {
    payout = -bet; // ヒフミ-2倍
    result += "ヒフミ！マイナス2倍！";
  } else if (sorted.join() === "4,5,6") {
    payout = bet * 3; // シゴロ2倍
    result += "シゴロ！2倍！";
  } else if (new Set(dice).size === 2) {
    payout = bet*2; // ワンペア等倍
    result += "ワンペア！1倍！";
  } else {
    payout = 0; // 目無し0倍
    result += "ノミ（バラバラ）！マイナス1倍！";
  }
  users[currentUser].debt += Math.ceil(val * 1.01);
  user.gleam += payout - bet;
  if (user.gleam < 0) user.gleam = 0;
  saveUsers();
  updateMetrics();
  document.getElementById("tintiro-result").innerHTML = result;
}
