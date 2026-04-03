# Polymarket Wallet Scanner + Trade Monitor

Two Python tools for tracking smart money on Polymarket.

## Tools

| File | Purpose |
|------|---------|
| `polymarket_scanner.py` | Fetch top 20 wallets by 30-day profit, filtered by win rate ≥ 55% and ≥ 50 trades |
| `trade_monitor.py` | Watch those wallets for new/closed positions in real time |
| `config.py` | Thresholds and API base URLs |

## Setup

```bash
pip install -r requirements.txt
```

## Usage

### 1 — Scan for top wallets

```bash
python polymarket_scanner.py
```

Outputs a ranked table and writes `top_wallets.json`.

### 2 — Monitor those wallets

```bash
# Use scan output
python trade_monitor.py --file top_wallets.json

# Custom poll interval (seconds)
python trade_monitor.py --file top_wallets.json --interval 60

# Pass addresses directly
python trade_monitor.py --wallets 0xABC...123 0xDEF...456

# Faster (no market title enrichment)
python trade_monitor.py --file top_wallets.json --no-enrich
```

Alerts print to console and are appended to `alerts.jsonl`.

## API endpoints used

| Source | Endpoint | Purpose |
|--------|----------|---------|
| Data API | `GET /leaderboard?window=1m&sortBy=profit` | Top traders leaderboard |
| Data API | `GET /activity?user=<addr>` | Per-wallet trade history |
| Data API | `GET /positions?user=<addr>` | Open positions (monitor) |
| Gamma API | `GET /markets?conditionIds=<id>` | Market title enrichment |
| Subgraph | GraphQL `users` query | Fallback if Data API unavailable |

## Config (`config.py`)

```python
MIN_WIN_RATE = 0.55          # 55%
MIN_TRADES   = 50
TOP_N_WALLETS = 20
LOOKBACK_DAYS = 30
POLL_INTERVAL_SECONDS = 30
```

## Alert types

| Icon | Meaning |
|------|---------|
| 🟢 NEW | Wallet opened a position not seen before |
| 🔵 SIZED_UP | Wallet increased an existing position by >10% |
| 🔴 CLOSED | Position disappeared from wallet |
