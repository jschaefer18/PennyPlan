/***********************************************************
 * Penny Plan – app.js
 * Drop-in replacement
 ***********************************************************/

/* =======================
   Utilities
======================= */
const fmtMoney = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const pad2 = (n) => String(n).padStart(2, "0");
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* =======================
   Data generation
======================= */

const CATEGORIES = [
  "Housing", "Groceries", "Dining", "Gas", "Shopping",
  "Subscriptions", "Health", "Utilities", "Insurance", "Entertainment"
];

const MERCHANTS = {
  Housing: ["Rent"],
  Groceries: ["Walmart", "Costco", "WinCo", "Albertsons"],
  Dining: ["Chipotle", "Zupas", "Cafe Rio", "Chick-fil-A"],
  Gas: ["Chevron", "Shell", "Maverik"],
  Shopping: ["Amazon", "Target", "Best Buy"],
  Subscriptions: ["Spotify", "Netflix", "Apple"],
  Health: ["Gym", "Pharmacy"],
  Utilities: ["Power", "Internet", "Water"],
  Insurance: ["State Farm", "GEICO"],
  Entertainment: ["Movies", "Bowling", "Concert"]
};

function generateYearTransactions(year = 2026, count = 300) {
  const tx = [];

  // Fixed monthly expenses
  for (let m = 1; m <= 12; m++) {
    const month = pad2(m);

    tx.push({ date: `${year}-${month}-04`, merchant: "Rent", category: "Housing", amount: -950 });
    tx.push({ date: `${year}-${month}-08`, merchant: "Power", category: "Utilities", amount: -65 });
    tx.push({ date: `${year}-${month}-11`, merchant: "Internet", category: "Utilities", amount: -55 });
    tx.push({ date: `${year}-${month}-20`, merchant: "State Farm", category: "Insurance", amount: -92.5 });
    tx.push({ date: `${year}-${month}-07`, merchant: "Spotify", category: "Subscriptions", amount: -10.99 });
    tx.push({ date: `${year}-${month}-15`, merchant: "Netflix", category: "Subscriptions", amount: -15.49 });
  }

  while (tx.length < count) {
    const m = pad2(Math.floor(rand(1, 13)));
    const d = pad2(Math.floor(rand(1, 29))); // always valid
    const category = pick(CATEGORIES);
    const merchant = pick(MERCHANTS[category] || ["Merchant"]);

    let amount;
    switch (category) {
      case "Groceries": amount = -rand(20, 140); break;
      case "Dining": amount = -rand(8, 35); break;
      case "Gas": amount = -rand(25, 70); break;
      case "Shopping": amount = -rand(15, 180); break;
      case "Entertainment": amount = -rand(10, 75); break;
      case "Health": amount = -rand(10, 90); break;
      default: amount = -rand(10, 120);
    }

    tx.push({
      date: `${year}-${m}-${d}`,
      merchant,
      category,
      amount: Number(amount.toFixed(2))
    });
  }

  return tx.sort((a, b) => b.date.localeCompare(a.date));
}

function generateYearIncome(year = 2026) {
  const income = [];
  for (let m = 1; m <= 12; m++) {
    const month = pad2(m);
    income.push({ date: `${year}-${month}-01`, amount: 1800, source: "Paycheck" });
    income.push({ date: `${year}-${month}-15`, amount: 1800, source: "Paycheck" });
  }
  return income;
}

/* =======================
   Master dataset
======================= */
const pennyPlanYear = {
  year: 2026,
  transactions: generateYearTransactions(2026, 300),
  income: generateYearIncome(2026)
};

/* =======================
   Month filtering
======================= */
function filterByMonth(list, month) {
  return list.filter(x => x.date.startsWith(month));
}

function getMonthData(month) {
  return {
    month,
    transactions: filterByMonth(pennyPlanYear.transactions, month),
    income: filterByMonth(pennyPlanYear.income, month)
  };
}

/* =======================
   Analytics helpers
======================= */
function computeKPIs(data) {
  const income = data.income.reduce((s, i) => s + i.amount, 0);
  const spending = data.transactions.reduce((s, t) => s + (-t.amount), 0);
  const net = income - spending;
  const rate = income ? (net / income) * 100 : 0;
  return { income, spending, net, rate };
}

function dailySpend(transactions) {
  const map = {};
  transactions.forEach(t => {
    const day = Number(t.date.slice(8, 10));
    map[day] = (map[day] || 0) + (-t.amount);
  });
  const days = Object.keys(map).map(Number).sort((a,b)=>a-b);
  return { labels: days, values: days.map(d => map[d]) };
}

function spendByCategory(transactions) {
  const map = {};
  transactions.forEach(t => {
    map[t.category] = (map[t.category] || 0) + (-t.amount);
  });
  const labels = Object.keys(map).sort();
  return { labels, values: labels.map(l => map[l]) };
}

/* =======================
   Charts
======================= */
let trendChart, categoryChart, barChart;

function render(data) {
  const k = computeKPIs(data);

  document.getElementById("kpiIncome").textContent = fmtMoney(k.income);
  document.getElementById("kpiSpending").textContent = fmtMoney(k.spending);
  document.getElementById("kpiNet").textContent = fmtMoney(k.net);
  document.getElementById("kpiSavingsRate").textContent = `${k.rate.toFixed(1)}%`;

  trendChart?.destroy();
  categoryChart?.destroy();
  barChart?.destroy();

  const daily = dailySpend(data.transactions);
  const cats = spendByCategory(data.transactions);

  trendChart = new Chart(trendChartEl, {
    type: "line",
    data: { labels: daily.labels, datasets: [{ data: daily.values, tension: 0.35 }] },
    options: { plugins: { legend: { display: false } } }
  });

  categoryChart = new Chart(categoryChartEl, {
    type: "doughnut",
    data: { labels: cats.labels, datasets: [{ data: cats.values }] }
  });

  barChart = new Chart(barChartEl, {
    type: "bar",
    data: {
      labels: ["Income", "Spending", "Net"],
      datasets: [{ data: [k.income, k.spending, k.net] }]
    },
    options: { plugins: { legend: { display: false } } }
  });

  renderTable(data.transactions);
}

/* =======================
   Table
======================= */
function renderTable(transactions) {
  const rows = transactions.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.merchant}</td>
      <td><span class="pill">${t.category}</span></td>
      <td class="right neg">${fmtMoney(t.amount)}</td>
    </tr>
  `).join("");

  document.querySelector("#txTable tbody").innerHTML =
    rows || `<tr><td colspan="4" class="empty">No transactions</td></tr>`;
}

/* =======================
   Init + events
======================= */
const DEFAULT_MONTH = "2026-01";
let currentData = getMonthData(DEFAULT_MONTH);

const trendChartEl = document.getElementById("trendChart");
const categoryChartEl = document.getElementById("categoryChart");
const barChartEl = document.getElementById("barChart");

render(currentData);

document.getElementById("monthSelect").addEventListener("change", (e) => {
  currentData = getMonthData(e.target.value);
  render(currentData);
});
