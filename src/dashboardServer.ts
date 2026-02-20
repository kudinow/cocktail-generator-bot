import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { UserData } from './types';

dotenv.config();

const PORT = parseInt(process.env.DASHBOARD_PORT || '3001');
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const DATA_PATH = path.join(process.cwd(), 'data/users.json');

// ─── Загрузка данных ───────────────────────────────────────────────────────

function loadUsers(): UserData[] {
  try {
    if (!fs.existsSync(DATA_PATH)) return [];
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as UserData[];
  } catch {
    return [];
  }
}

// ─── Подсчёт метрик ────────────────────────────────────────────────────────

function computeStats(users: UserData[]) {
  const now = Date.now();
  const DAY = 86_400_000;

  const activeDay = users.filter(u => now - new Date(u.lastActivity).getTime() < DAY).length;
  const activeWeek = users.filter(u => now - new Date(u.lastActivity).getTime() < 7 * DAY).length;
  const activeMonth = users.filter(u => now - new Date(u.lastActivity).getTime() < 30 * DAY).length;
  const churn = users.filter(
    u => now - new Date(u.lastActivity).getTime() >= 30 * DAY && u.ingredients.length > 0
  ).length;
  const dead = users.filter(
    u => now - new Date(u.lastActivity).getTime() >= 30 * DAY && u.ingredients.length === 0
  ).length;

  const totalIngredients = users.reduce((s, u) => s + u.ingredients.length, 0);
  const avgIngredients = users.length ? +(totalIngredients / users.length).toFixed(1) : 0;
  const zeroIngredients = users.filter(u => u.ingredients.length === 0).length;

  const searchTotal = users.reduce((s, u) => s + (u.searchCount ?? 0), 0);
  const avgSearches = users.length ? +(searchTotal / users.length).toFixed(1) : 0;

  // Топ ингредиентов — сколько пользователей имеют каждый ингредиент
  const ingredientCounts: Record<string, number> = {};
  users.forEach(u => {
    u.ingredients.forEach(ing => {
      const key = ing.toLowerCase();
      ingredientCounts[key] = (ingredientCounts[key] ?? 0) + 1;
    });
  });
  const topIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  // Новые пользователи за последние 7 дней (по createdAt)
  const newByDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY);
    const count = users.filter(u => {
      if (!u.createdAt) return false;
      const t = new Date(u.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    newByDay.push({
      date: dayStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      count,
    });
  }

  // Воронка
  const funnel = {
    registered: users.length,
    hasIngredients: users.filter(u => u.ingredients.length > 0).length,
    searched: users.filter(u => (u.searchCount ?? 0) > 0).length,
  };

  return {
    total: users.length,
    activeDay,
    activeWeek,
    activeMonth,
    churn,
    dead,
    avgIngredients,
    zeroIngredients,
    searchTotal,
    avgSearches,
    topIngredients,
    newByDay,
    funnel,
    updatedAt: new Date().toISOString(),
  };
}

// ─── HTML дашборд ──────────────────────────────────────────────────────────

function renderHTML(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cocktail Bot — Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0F1117;
    --surface: #1C1F26;
    --surface2: #252830;
    --border: #2C2F3A;
    --accent: #3ECF8E;
    --accent-dim: rgba(62,207,142,0.15);
    --text: #EDEDED;
    --muted: #8D9098;
    --danger: #F85149;
    --warning: #E3B341;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }
  header {
    border-bottom: 1px solid var(--border);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
  }
  header h1 {
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  header h1 span.dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 3px rgba(62,207,142,0.3);
    display: inline-block;
  }
  #updated {
    font-size: 12px;
    color: var(--muted);
  }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  /* KPI grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    transition: border-color 0.2s;
  }
  .kpi-card:hover { border-color: var(--accent); }
  .kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .kpi-value {
    font-size: 32px;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    margin-bottom: 4px;
  }
  .kpi-sub {
    font-size: 12px;
    color: var(--muted);
  }
  .kpi-value.accent { color: var(--accent); }
  .kpi-value.danger { color: var(--danger); }
  .kpi-value.warning { color: var(--warning); }
  /* Sections */
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
  }
  /* Funnel */
  .funnel {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .funnel-step {
    background: var(--surface);
    padding: 24px 20px;
    text-align: center;
  }
  .funnel-step-label {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 8px;
    font-weight: 600;
  }
  .funnel-step-value {
    font-size: 36px;
    font-weight: 800;
    color: var(--accent);
    margin-bottom: 4px;
  }
  .funnel-step-pct {
    font-size: 12px;
    color: var(--muted);
  }
  /* Top ingredients */
  .ingredients-list {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .ing-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
  }
  .ing-row:last-child { border-bottom: none; }
  .ing-rank {
    font-size: 12px;
    color: var(--muted);
    min-width: 20px;
    text-align: right;
  }
  .ing-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }
  .ing-bar-wrap {
    width: 120px;
    background: var(--border);
    border-radius: 4px;
    height: 6px;
    overflow: hidden;
  }
  .ing-bar {
    height: 6px;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.5s ease;
  }
  .ing-count {
    font-size: 12px;
    color: var(--muted);
    min-width: 28px;
    text-align: right;
  }
  /* Chart */
  .chart-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
  }
  canvas { max-height: 200px; }
  /* Two-col layout */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 768px) {
    .two-col { grid-template-columns: 1fr; }
    .funnel { grid-template-columns: 1fr; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>
<header>
  <h1><span class="dot"></span> Cocktail Bot — Analytics</h1>
  <div id="updated">Загрузка...</div>
</header>
<main>
  <!-- KPI -->
  <div>
    <div class="section-title">Обзор</div>
    <div class="kpi-grid" id="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Всего</div><div class="kpi-value" id="k-total">—</div><div class="kpi-sub">пользователей</div></div>
      <div class="kpi-card"><div class="kpi-label">DAU</div><div class="kpi-value accent" id="k-day">—</div><div class="kpi-sub">за 24 часа</div></div>
      <div class="kpi-card"><div class="kpi-label">WAU</div><div class="kpi-value accent" id="k-week">—</div><div class="kpi-sub">за 7 дней</div></div>
      <div class="kpi-card"><div class="kpi-label">MAU</div><div class="kpi-value accent" id="k-month">—</div><div class="kpi-sub">за 30 дней</div></div>
      <div class="kpi-card"><div class="kpi-label">Отток</div><div class="kpi-value warning" id="k-churn">—</div><div class="kpi-sub">неактивны &gt;30д, есть ингр.</div></div>
      <div class="kpi-card"><div class="kpi-label">Мёртвые</div><div class="kpi-value danger" id="k-dead">—</div><div class="kpi-sub">неактивны &gt;30д, 0 ингр.</div></div>
    </div>
  </div>

  <!-- Funnel + Chart -->
  <div class="two-col">
    <div>
      <div class="section-title">Воронка</div>
      <div class="funnel" id="funnel">
        <div class="funnel-step"><div class="funnel-step-label">Зарегистрировались</div><div class="funnel-step-value" id="f-reg">—</div><div class="funnel-step-pct">100%</div></div>
        <div class="funnel-step"><div class="funnel-step-label">Добавили ингредиент</div><div class="funnel-step-value" id="f-ing">—</div><div class="funnel-step-pct" id="f-ing-pct">—</div></div>
        <div class="funnel-step"><div class="funnel-step-label">Сделали поиск</div><div class="funnel-step-value" id="f-search">—</div><div class="funnel-step-pct" id="f-search-pct">—</div></div>
      </div>
      <!-- Extra KPI row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
        <div class="kpi-card"><div class="kpi-label">Среднее ингр.</div><div class="kpi-value" id="k-avg-ing">—</div><div class="kpi-sub">на пользователя</div></div>
        <div class="kpi-card"><div class="kpi-label">Поисков всего</div><div class="kpi-value" id="k-searches">—</div><div class="kpi-sub">среднее <span id="k-avg-search">—</span>/чел</div></div>
      </div>
    </div>
    <div>
      <div class="section-title">Новые пользователи (7 дней)</div>
      <div class="chart-box"><canvas id="newChart"></canvas></div>
    </div>
  </div>

  <!-- Top ingredients -->
  <div>
    <div class="section-title">Топ ингредиентов</div>
    <div class="ingredients-list" id="ing-list">
      <div class="ing-row" style="color:var(--muted)">Загрузка...</div>
    </div>
  </div>
</main>

<script>
let chart = null;

async function fetchStats() {
  const res = await fetch('/api/stats');
  if (!res.ok) return null;
  return res.json();
}

function pct(a, b) {
  if (!b) return '0%';
  return Math.round(a / b * 100) + '%';
}

function render(s) {
  document.getElementById('updated').textContent =
    'Обновлено ' + new Date(s.updatedAt).toLocaleTimeString('ru-RU');

  document.getElementById('k-total').textContent = s.total;
  document.getElementById('k-day').textContent = s.activeDay;
  document.getElementById('k-week').textContent = s.activeWeek;
  document.getElementById('k-month').textContent = s.activeMonth;
  document.getElementById('k-churn').textContent = s.churn;
  document.getElementById('k-dead').textContent = s.dead;
  document.getElementById('k-avg-ing').textContent = s.avgIngredients;
  document.getElementById('k-searches').textContent = s.searchTotal;
  document.getElementById('k-avg-search').textContent = s.avgSearches;

  document.getElementById('f-reg').textContent = s.funnel.registered;
  document.getElementById('f-ing').textContent = s.funnel.hasIngredients;
  document.getElementById('f-ing-pct').textContent = pct(s.funnel.hasIngredients, s.funnel.registered);
  document.getElementById('f-search').textContent = s.funnel.searched;
  document.getElementById('f-search-pct').textContent = pct(s.funnel.searched, s.funnel.registered);

  // Топ ингредиентов
  const maxCount = s.topIngredients[0]?.count || 1;
  const ingList = document.getElementById('ing-list');
  ingList.innerHTML = s.topIngredients.map((ing, i) => \`
    <div class="ing-row">
      <span class="ing-rank">\${i + 1}</span>
      <span class="ing-name">\${ing.name}</span>
      <div class="ing-bar-wrap"><div class="ing-bar" style="width:\${Math.round(ing.count/maxCount*100)}%"></div></div>
      <span class="ing-count">\${ing.count}</span>
    </div>
  \`).join('');

  // Chart
  const labels = s.newByDay.map(d => d.date);
  const data = s.newByDay.map(d => d.count);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  } else {
    const ctx = document.getElementById('newChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Новых',
          data,
          backgroundColor: 'rgba(62,207,142,0.3)',
          borderColor: '#3ECF8E',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8D9098' }, grid: { color: '#2C2F3A' } },
          y: { ticks: { color: '#8D9098', precision: 0 }, grid: { color: '#2C2F3A' }, beginAtZero: true }
        }
      }
    });
  }
}

async function refresh() {
  const s = await fetchStats();
  if (s) render(s);
}

refresh();
setInterval(refresh, 30000);
</script>
</body>
</html>`;
}

// ─── HTTP сервер ───────────────────────────────────────────────────────────

function checkAuth(req: http.IncomingMessage): boolean {
  if (!DASHBOARD_PASSWORD) return true; // без пароля — открытый доступ
  const expected = 'Basic ' + Buffer.from(`${DASHBOARD_USER}:${DASHBOARD_PASSWORD}`).toString('base64');
  return req.headers.authorization === expected;
}

const server = http.createServer((req, res) => {
  // Basic Auth
  if (!checkAuth(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Cocktail Bot Dashboard"');
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }

  const pathname = req.url?.split('?')[0] ?? '/';

  if (pathname === '/api/stats') {
    try {
      const users = loadUsers();
      const stats = computeStats(users);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.writeHead(200);
      res.end(JSON.stringify(stats, null, 2));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(renderHTML());
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[DASHBOARD] Сервер запущен на http://localhost:${PORT}`);
  if (!DASHBOARD_PASSWORD) {
    console.warn('[DASHBOARD] ⚠️  DASHBOARD_PASSWORD не задан — доступ без пароля!');
  }
});
