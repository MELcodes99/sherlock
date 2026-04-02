# 🕵️ Sherlock — DeFi Risk Analyzer

Sherlock is a portfolio risk scanner that analyzes DeFi positions and flags potential risks using AI-powered encrypted queries 
via the SolRouter SDK. Enter a wallet address, protocol, or position and get back a detailed risk report with a score, risk 
flags, and actionable recommendations.

---

## What it does

- Accepts a wallet address, protocol name, or any DeFi position as input
- Sends an encrypted query to the AI via SolRouter
- Returns a structured risk report including:
  - A **risk score** from 0 to 100
  - A **risk level** (LOW / MEDIUM / HIGH / CRITICAL)
  - A **summary** of the position and key risks
  - **Risk flags** grouped by severity (critical, high, medium, low)
  - An actionable **recommendation**
- Saves scan history locally in the browser
- Lets you filter which risk categories to include (liquidation, smart contract, oracle, etc.)

---

## Tech stack

- **Frontend** — Vanilla JS, HTML, CSS (glass morphism UI)
- **Backend** — Node.js + Express
- **AI** — [SolRouter SDK](https://solrouter.com) (`@solrouter/sdk`)

---

## Project structure

```
sherlock/
├── index.html        # Main UI
├── app.js            # Frontend logic
├── styles.css        # Glass UI styles
├── server.js         # Express backend + SolRouter integration
├── package.json
└── package-lock.json
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/MELcodes99/sherlock.git
cd sherlock
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your SolRouter API key

Open `server.js` and replace the placeholder with your real key:

```js
const API_KEY = 'sk_solrouter_YOUR_KEY_HERE';
```

You can get a key at [solrouter.com](https://solrouter.com).

### 4. Run the app

```bash
node server.js
```

Then open your browser and go to:

```
http://localhost:3000
```

---

## How to use

1. Enter a wallet address, protocol, or position in the first field
   - Examples: `0xAbc123...`, `ETH/USDC on Uniswap v3`, `AAVE wBTC loan 70% LTV`
2. Optionally add context in the second field
   - Examples: `$50k position, leveraged 3x`, `entered at ETH $2,400`
3. Select which risk categories to analyze using the toggle buttons on the left
4. Click **ANALYZE POSITION** and wait for the report

---

## Requirements

- Node.js v18 or higher
- A SolRouter API key

---

## License

MIT
