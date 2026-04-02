// ── State ──────────────────────────────────────────────────────
let history = [];
try { history = JSON.parse(localStorage.getItem('sherlock_h') || '[]'); } catch {}

let activeRisks = new Set(['liquidation', 'smart-contract', 'impermanent-loss', 'oracle']);
let lastQuery = '';

// ── DOM ────────────────────────────────────────────────────────
const walletInput    = document.getElementById('walletInput');
const posDetails     = document.getElementById('positionDetails');
const scanBtn        = document.getElementById('scanBtn');
const scanBtnText    = document.getElementById('scanBtnText');
const emptyState     = document.getElementById('emptyState');
const loadingState   = document.getElementById('loadingState');
const resultsContent = document.getElementById('resultsContent');
const errorState     = document.getElementById('errorState');
const errorMsg       = document.getElementById('errorMsg');
const loadingText    = document.getElementById('loadingText');
const historyList    = document.getElementById('historyList');
const steps          = [1, 2, 3, 4].map(i => document.getElementById('step' + i));

// ── Risk toggles ───────────────────────────────────────────────
document.querySelectorAll('.risk-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const r = btn.dataset.risk;
    activeRisks.has(r) ? activeRisks.delete(r) : activeRisks.add(r);
    btn.classList.toggle('active', activeRisks.has(r));
  });
});

// ── Events ─────────────────────────────────────────────────────
scanBtn.addEventListener('click', runScan);
walletInput.addEventListener('keydown', e => e.key === 'Enter' && runScan());
document.getElementById('retryBtn')?.addEventListener('click', runScan);

// ── Main scan ──────────────────────────────────────────────────
async function runScan() {
  const wallet = walletInput.value.trim();
  if (!wallet) { shake(walletInput); walletInput.focus(); return; }

  lastQuery = wallet;
  const details = posDetails?.value.trim() || '';
  const risks = [...activeRisks].join(', ') || 'all DeFi risks';

  setState('loading');
  animateSteps();

  const prompt = buildPrompt(wallet, details, risks);

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned non-JSON (HTTP ${res.status}). Check server logs.`);
    }

    if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);

    const text = data.message || '';
    if (!text) throw new Error('AI returned an empty response. Try again.');

    // Strip markdown fences then extract JSON
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw AI text:', text);
      throw new Error('AI returned unexpected format. Raw response logged to console.');
    }

    let report;
    try {
      report = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('JSON parse failed on:', jsonMatch[0]);
      throw new Error('Could not parse AI response. Try again.');
    }

    renderResults(report, wallet);
    saveHistory(wallet, report);

  } catch (err) {
    console.error('Sherlock error:', err);
    setState('error');
    if (errorMsg) errorMsg.textContent = err.message;
  }
}

// ── Prompt builder (short = fast) ─────────────────────────────
function buildPrompt(wallet, details, risks) {
  return `You are a DeFi risk analyst named Sherlock. Analyze this position and respond ONLY with valid JSON, no markdown, no 
extra text.

POSITION: ${wallet}
${details ? `DETAILS: ${details}` : ''}
RISKS: ${risks}

Respond with ONLY this JSON structure:
{"riskScore":<0-100>,"riskLevel":"<LOW|MEDIUM|HIGH|CRITICAL>","summary":"<2-3 
sentences>","flags":[{"severity":"<critical|high|medium|low>","title":"<name>","description":"<1-2 
sentences>"}],"recommendation":"<1-2 sentences>"}

Rules: 0-24=LOW, 25-49=MEDIUM, 50-74=HIGH, 75-100=CRITICAL. At least 3 flags. Real protocol names. JSON only.`;
}

// ── Render results ─────────────────────────────────────────────
function renderResults(r, query) {
  setState('results');

  const score = Math.min(100, Math.max(0, r.riskScore ?? 0));
  const level = (r.riskLevel || 'LOW').toUpperCase();

  const scoreEl = document.getElementById('scoreValue');
  if (scoreEl) {
    scoreEl.textContent = `${score} / 100`;
    scoreEl.style.color = scoreColor(score);
  }

  setTimeout(() => {
    const fill = document.getElementById('barFill');
    if (fill) {
      fill.style.width = score + '%';
      fill.style.background = scoreGradient(score);
    }
  }, 80);

  const summaryBox = document.getElementById('summaryBox');
  if (summaryBox) summaryBox.textContent = r.summary || '';

  const flagsList = document.getElementById('flagsList');
  if (flagsList) {
    flagsList.innerHTML = '';
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = (r.flags || []).sort(
      (a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4)
    );
    sorted.forEach((f, i) => {
      const el = document.createElement('div');
      el.className = `flag ${f.severity || 'low'}`;
      el.style.animationDelay = `${i * 70}ms`;
      el.innerHTML = `
        <div class="flag-dot"></div>
        <div>
          <div class="flag-title">${(f.severity || '').toUpperCase()} — ${escapeHtml(f.title)}</div>
          <div class="flag-desc">${escapeHtml(f.description)}</div>
        </div>`;
      flagsList.appendChild(el);
    });
  }

  const recBox = document.getElementById('recBox');
  const recText = document.getElementById('recText');
  if (recBox && recText) {
    if (r.recommendation) {
      recText.textContent = r.recommendation;
      recBox.classList.remove('hidden');
    } else {
      recBox.classList.add('hidden');
    }
  }

  const meta = document.getElementById('reportMeta');
  if (meta) meta.textContent = `${new Date().toLocaleString()} · ${level} RISK · Score ${score}/100`;
}

// ── State manager ──────────────────────────────────────────────
function setState(s) {
  if (scanBtn) scanBtn.disabled = s === 'loading';
  if (scanBtnText) scanBtnText.textContent = s === 'loading' ? 'SCANNING...' : 'ANALYZE POSITION';
  emptyState?.classList.toggle('hidden',     s !== 'empty');
  loadingState?.classList.toggle('hidden',   s !== 'loading');
  resultsContent?.classList.toggle('hidden', s !== 'results');
  errorState?.classList.toggle('hidden',     s !== 'error');
}

// ── Loading steps animation ────────────────────────────────────
function animateSteps() {
  const msgs = ['ENCRYPTING QUERY...', 'ROUTING TO AI...', 'ANALYZING RISKS...', 'BUILDING REPORT...'];
  const delays = [0, 1200, 2800, 4500];
  steps.forEach(s => s?.classList.remove('active', 'done'));

  delays.forEach((d, i) => {
    setTimeout(() => {
      steps.forEach(s => s?.classList.remove('active'));
      steps[i]?.classList.add('active');
      if (i > 0) steps[i - 1]?.classList.add('done');
      if (loadingText) loadingText.textContent = msgs[i];
    }, d);
  });
}

// ── History ────────────────────────────────────────────────────
function saveHistory(query, report) {
  history.unshift({
    id: Date.now(),
    query,
    score: report.riskScore,
    level: report.riskLevel,
    time: new Date().toLocaleTimeString()
  });
  if (history.length > 15) history.pop();
  try { localStorage.setItem('sherlock_h', JSON.stringify(history)); } catch {}
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">No scans yet</div>';
    return;
  }
  historyList.innerHTML = history.map(e => `
    <div class="history-item" onclick="loadHistory(${e.id})">
      <div class="h-query">${escapeHtml(e.query)}</div>
      <div class="h-meta">
        <span>${e.time}</span>
        <span class="h-badge h-${(e.level || 'low').toLowerCase()}">${e.level || 'N/A'}</span>
      </div>
    </div>`).join('');
}

window.loadHistory = function (id) {
  const entry = history.find(e => e.id === id);
  if (entry && walletInput) { walletInput.value = entry.query; walletInput.focus(); }
};

// ── Helpers ────────────────────────────────────────────────────
function scoreColor(s) {
  if (s < 25) return '#00ffaa';
  if (s < 50) return '#ffd060';
  if (s < 75) return '#ff943c';
  return '#ff4d6d';
}

function scoreGradient(s) {
  if (s < 25) return 'linear-gradient(90deg,#00ffaa,#00d4a0)';
  if (s < 50) return 'linear-gradient(90deg,#ffd060,#ffaa00)';
  if (s < 75) return 'linear-gradient(90deg,#ff943c,#ff6020)';
  return            'linear-gradient(90deg,#ff4d6d,#ff1a45)';
}

function shake(el) {
  el.animate([
    { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }
  ], { duration: 400, easing: 'ease' });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ───────────────────────────────────────────────────────
setState('empty');
renderHistory();
