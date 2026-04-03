"""
Polymarket Wallet Scanner
=========================
Fetches the top 20 wallets by profit over the last 30 days, filtered by:
  - Win rate >= 55%
  - At least 50 trades

Data sources:
  1. Polymarket Data API  (https://data-api.polymarket.com)
  2. Polymarket Subgraph  (The Graph / Polygon)  — used as fallback / enrichment
"""

import time
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from tabulate import tabulate
from colorama import Fore, Style, init as colorama_init

from config import (
    DATA_API_BASE,
    SUBGRAPH_URL,
    MIN_WIN_RATE,
    MIN_TRADES,
    TOP_N_WALLETS,
    LOOKBACK_DAYS,
)

colorama_init(autoreset=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# HTTP helpers
# ─────────────────────────────────────────────

SESSION = requests.Session()
SESSION.headers.update({"Accept": "application/json", "User-Agent": "polymarket-scanner/1.0"})


def _get(url: str, params: dict = None, retries: int = 3, backoff: float = 1.5) -> dict | list | None:
    """GET with retry/backoff. Returns parsed JSON or None on failure."""
    for attempt in range(retries):
        try:
            resp = SESSION.get(url, params=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            log.warning("HTTP %s for %s (attempt %d/%d)", e.response.status_code, url, attempt + 1, retries)
        except requests.RequestException as e:
            log.warning("Request error for %s: %s (attempt %d/%d)", url, e, attempt + 1, retries)
        if attempt < retries - 1:
            time.sleep(backoff ** attempt)
    return None


def _post_graph(query: str, variables: dict = None, retries: int = 3, backoff: float = 1.5) -> dict | None:
    """POST a GraphQL query to the Polymarket subgraph."""
    payload = {"query": query, "variables": variables or {}}
    for attempt in range(retries):
        try:
            resp = SESSION.post(SUBGRAPH_URL, json=payload, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                log.warning("GraphQL errors: %s", data["errors"])
                return None
            return data.get("data")
        except requests.RequestException as e:
            log.warning("Subgraph error: %s (attempt %d/%d)", e, attempt + 1, retries)
        if attempt < retries - 1:
            time.sleep(backoff ** attempt)
    return None


# ─────────────────────────────────────────────
# Data API: leaderboard / top traders
# ─────────────────────────────────────────────

def fetch_leaderboard_data_api(limit: int = 200) -> list[dict]:
    """
    Fetch top traders from the Polymarket Data API leaderboard.

    Endpoint: GET /leaderboard
    Query params:
        window   - time window: '1d' | '1w' | '1m' | 'all'
        limit    - number of results
        offset   - pagination offset
        sortBy   - 'profit' | 'volume' | 'roi'
    """
    url = f"{DATA_API_BASE}/leaderboard"
    params = {
        "window": "1m",   # last 30 days
        "limit": limit,
        "offset": 0,
        "sortBy": "profit",
    }
    log.info("Fetching leaderboard from Data API …")
    data = _get(url, params=params)
    if not data:
        return []

    # Normalise — the API may return a list directly or {"data": [...]}
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "results", "leaderboard", "users"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


# ─────────────────────────────────────────────
# Data API: per-user activity
# ─────────────────────────────────────────────

def fetch_user_activity(address: str, limit: int = 500) -> list[dict]:
    """
    Fetch individual trade history for a wallet.

    Endpoint: GET /activity
    Returns a list of trade/position events.
    """
    url = f"{DATA_API_BASE}/activity"
    params = {"user": address.lower(), "limit": limit}
    data = _get(url, params=params)
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "results", "activity"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


def fetch_user_profit(address: str) -> dict:
    """
    Fetch profit/PnL summary for a wallet.

    Endpoint: GET /profits
    """
    url = f"{DATA_API_BASE}/profits"
    params = {"user": address.lower()}
    data = _get(url, params=params)
    if isinstance(data, dict):
        return data
    return {}


def fetch_user_positions(address: str) -> list[dict]:
    """
    Fetch open / resolved positions for a wallet.

    Endpoint: GET /positions
    """
    url = f"{DATA_API_BASE}/positions"
    params = {"user": address.lower(), "limit": 500}
    data = _get(url, params=params)
    if not data:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "results", "positions"):
            if key in data and isinstance(data[key], list):
                return data[key]
    return []


# ─────────────────────────────────────────────
# Subgraph: batch user stats (fallback)
# ─────────────────────────────────────────────

SUBGRAPH_TOP_USERS_QUERY = """
query TopUsers($first: Int!, $skip: Int!, $since: BigInt!) {
  users(
    first: $first
    skip: $skip
    orderBy: profit
    orderDirection: desc
    where: { lastTradeTimestamp_gte: $since }
  ) {
    id
    profit
    numTrades
    numWins
    volume
    lastTradeTimestamp
  }
}
"""


def fetch_top_users_subgraph(limit: int = 200) -> list[dict]:
    """Fallback: fetch top users by profit from the Polymarket subgraph."""
    since_ts = int((datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).timestamp())
    variables = {"first": min(limit, 1000), "skip": 0, "since": str(since_ts)}
    log.info("Fetching top users from subgraph …")
    data = _post_graph(SUBGRAPH_TOP_USERS_QUERY, variables)
    if not data:
        return []
    return data.get("users", [])


# ─────────────────────────────────────────────
# Stats computation
# ─────────────────────────────────────────────

def compute_stats_from_activity(activity: list[dict]) -> dict:
    """
    Derive win_rate and trade_count from raw activity records.

    Activity records are expected to have:
      - 'side' or 'type': BUY/SELL
      - 'outcome': WIN / LOSS  (or inferred from profit field)
      - 'profit' or 'pnl': numeric
      - 'timestamp': Unix seconds
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    cutoff_ts = cutoff.timestamp()

    trades = 0
    wins = 0
    total_profit = 0.0

    for record in activity:
        ts = record.get("timestamp") or record.get("createdAt") or record.get("time") or 0
        try:
            ts = float(ts)
        except (TypeError, ValueError):
            ts = 0.0
        if ts and ts < cutoff_ts:
            continue

        # Count any executed trade (buy or sell that closes a position)
        trade_type = (record.get("type") or record.get("side") or "").upper()
        if trade_type not in ("BUY", "SELL", "TRADE", "ORDER_FILLED"):
            continue

        trades += 1

        # Determine win
        outcome = (record.get("outcome") or "").upper()
        profit = 0.0
        for field in ("profit", "pnl", "realizedPnl", "realized_pnl"):
            if field in record:
                try:
                    profit = float(record[field])
                    break
                except (TypeError, ValueError):
                    pass

        if outcome == "WIN" or profit > 0:
            wins += 1
        total_profit += profit

    win_rate = (wins / trades) if trades > 0 else 0.0
    return {
        "trade_count": trades,
        "win_count": wins,
        "win_rate": win_rate,
        "profit_30d": total_profit,
    }


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalise_leaderboard_row(row: dict) -> dict:
    """Map various API field shapes to a canonical dict."""
    address = (
        row.get("address")
        or row.get("user")
        or row.get("id")
        or row.get("proxyWallet")
        or ""
    ).lower()

    profit = _safe_float(
        row.get("profit") or row.get("totalProfit") or row.get("pnl") or row.get("realizedPnl")
    )
    volume = _safe_float(row.get("volume") or row.get("totalVolume"))
    num_trades = int(_safe_float(row.get("numTrades") or row.get("tradeCount") or row.get("trades") or 0))
    num_wins = int(_safe_float(row.get("numWins") or row.get("winCount") or row.get("wins") or 0))

    # Win rate: prefer pre-computed field, otherwise calculate
    raw_wr = row.get("winRate") or row.get("win_rate")
    if raw_wr is not None:
        win_rate = _safe_float(raw_wr)
        # Normalise — some APIs return 0–100, others 0–1
        if win_rate > 1:
            win_rate /= 100
    elif num_trades > 0:
        win_rate = num_wins / num_trades
    else:
        win_rate = 0.0

    return {
        "address": address,
        "profit": profit,
        "volume": volume,
        "trade_count": num_trades,
        "win_count": num_wins,
        "win_rate": win_rate,
    }


# ─────────────────────────────────────────────
# Main scanner logic
# ─────────────────────────────────────────────

def enrich_with_activity(wallet: dict) -> dict:
    """
    If win_rate or trade_count are missing/zero, pull individual activity
    and compute them from raw trades.
    """
    if wallet["trade_count"] >= MIN_TRADES and wallet["win_rate"] > 0:
        return wallet  # already have enough info

    activity = fetch_user_activity(wallet["address"])
    if not activity:
        return wallet

    stats = compute_stats_from_activity(activity)
    # Only overwrite if the activity gives more data
    if stats["trade_count"] > wallet["trade_count"]:
        wallet.update(stats)
    return wallet


def scan_top_wallets() -> list[dict]:
    """
    Main entry point.  Returns up to TOP_N_WALLETS wallets sorted by 30-day
    profit, filtered for MIN_WIN_RATE and MIN_TRADES.
    """
    log.info("=== Polymarket Wallet Scanner ===")
    log.info("Filters: win_rate >= %.0f%%, trades >= %d, lookback = %d days",
             MIN_WIN_RATE * 100, MIN_TRADES, LOOKBACK_DAYS)

    # ── 1. Fetch candidate wallets ────────────────────────────────────────
    rows = fetch_leaderboard_data_api(limit=200)

    if not rows:
        log.warning("Data API returned nothing — falling back to subgraph …")
        rows = fetch_top_users_subgraph(limit=200)

    if not rows:
        log.error("No data from any source. Check your internet connection and API availability.")
        return []

    log.info("Fetched %d candidate wallets", len(rows))

    # ── 2. Normalise ─────────────────────────────────────────────────────
    wallets = [_normalise_leaderboard_row(r) for r in rows]
    wallets = [w for w in wallets if w["address"]]

    # ── 3. Enrich wallets that lack stats ────────────────────────────────
    log.info("Enriching wallets with activity data (this may take a moment) …")
    enriched = []
    for i, w in enumerate(wallets[:100], 1):  # limit enrichment calls to top 100 candidates
        log.debug("[%d/%d] enriching %s", i, min(len(wallets), 100), w["address"])
        enriched.append(enrich_with_activity(w))
        time.sleep(0.1)  # polite rate limiting

    # ── 4. Filter ─────────────────────────────────────────────────────────
    filtered = [
        w for w in enriched
        if w["win_rate"] >= MIN_WIN_RATE and w["trade_count"] >= MIN_TRADES
    ]
    log.info("%d wallets pass filters (win_rate >= %.0f%%, trades >= %d)",
             len(filtered), MIN_WIN_RATE * 100, MIN_TRADES)

    # ── 5. Sort by profit, take top N ─────────────────────────────────────
    top = sorted(filtered, key=lambda w: w["profit"], reverse=True)[:TOP_N_WALLETS]

    return top


# ─────────────────────────────────────────────
# Display
# ─────────────────────────────────────────────

def print_results(wallets: list[dict]) -> None:
    if not wallets:
        print(Fore.RED + "No wallets matched the criteria.")
        return

    print(Fore.CYAN + Style.BRIGHT + f"\n{'─'*80}")
    print(Fore.CYAN + Style.BRIGHT + f"  TOP {len(wallets)} POLYMARKET WALLETS  │  "
          f"30-day profit  │  Win rate ≥ {MIN_WIN_RATE*100:.0f}%  │  Trades ≥ {MIN_TRADES}")
    print(Fore.CYAN + Style.BRIGHT + f"{'─'*80}\n")

    table = []
    for rank, w in enumerate(wallets, 1):
        profit_str = f"${w['profit']:,.2f}"
        wr_str = f"{w['win_rate']*100:.1f}%"
        table.append([
            rank,
            w["address"][:10] + "…" + w["address"][-6:],
            profit_str,
            wr_str,
            w["trade_count"],
            f"${w['volume']:,.0f}" if w["volume"] else "—",
        ])

    headers = ["#", "Address", "Profit (30d)", "Win Rate", "Trades", "Volume"]
    print(tabulate(table, headers=headers, tablefmt="rounded_outline"))
    print()


def save_results(wallets: list[dict], path: str = "top_wallets.json") -> None:
    with open(path, "w") as f:
        json.dump(wallets, f, indent=2)
    log.info("Results saved to %s", path)


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    top_wallets = scan_top_wallets()
    print_results(top_wallets)
    if top_wallets:
        save_results(top_wallets)
        print(Fore.GREEN + f"Saved {len(top_wallets)} wallets to top_wallets.json")
