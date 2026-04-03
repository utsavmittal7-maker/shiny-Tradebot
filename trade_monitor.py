"""
Polymarket Trade Monitor
========================
Watches a list of whale wallets (from the scanner) for new positions
and prints an alert whenever one opens or sizes up.

Usage:
    # Use wallets from a previous scan:
    python trade_monitor.py --file top_wallets.json

    # Or pass addresses directly:
    python trade_monitor.py --wallets 0xABC...123 0xDEF...456

    # Custom poll interval (default 30 s):
    python trade_monitor.py --file top_wallets.json --interval 60
"""

import argparse
import json
import logging
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import requests
from colorama import Fore, Style, init as colorama_init

from config import DATA_API_BASE, GAMMA_API_BASE, POLL_INTERVAL_SECONDS

colorama_init(autoreset=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers.update({"Accept": "application/json", "User-Agent": "polymarket-monitor/1.0"})


# ─────────────────────────────────────────────
# HTTP helpers (mirrors scanner)
# ─────────────────────────────────────────────

def _get(url: str, params: dict = None, retries: int = 3, backoff: float = 1.5) -> dict | list | None:
    for attempt in range(retries):
        try:
            resp = SESSION.get(url, params=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            log.debug("HTTP %s for %s (attempt %d)", e.response.status_code, url, attempt + 1)
        except requests.RequestException as e:
            log.debug("Request error %s: %s (attempt %d)", url, e, attempt + 1)
        if attempt < retries - 1:
            time.sleep(backoff ** attempt)
    return None


# ─────────────────────────────────────────────
# Position / activity fetchers
# ─────────────────────────────────────────────

def fetch_positions(address: str) -> list[dict]:
    """
    Fetch current open positions for a wallet.
    GET /positions?user=<address>&sizeThreshold=0.01
    """
    url = f"{DATA_API_BASE}/positions"
    data = _get(url, params={"user": address.lower(), "sizeThreshold": "0.01", "limit": 200})
    if not data:
        return []
    if isinstance(data, list):
        return data
    for key in ("data", "results", "positions"):
        if isinstance(data, dict) and key in data and isinstance(data[key], list):
            return data[key]
    return []


def fetch_recent_activity(address: str, limit: int = 20) -> list[dict]:
    """
    Fetch the most recent trades for a wallet.
    GET /activity?user=<address>&limit=20
    """
    url = f"{DATA_API_BASE}/activity"
    data = _get(url, params={"user": address.lower(), "limit": limit})
    if not data:
        return []
    if isinstance(data, list):
        return data
    for key in ("data", "results", "activity"):
        if isinstance(data, dict) and key in data and isinstance(data[key], list):
            return data[key]
    return []


def fetch_market_info(condition_id: str) -> dict:
    """
    Enrich an alert with the market title via the Gamma API.
    GET https://gamma-api.polymarket.com/markets?conditionIds=<id>
    """
    url = f"{GAMMA_API_BASE}/markets"
    data = _get(url, params={"conditionIds": condition_id})
    if isinstance(data, list) and data:
        return data[0]
    return {}


# ─────────────────────────────────────────────
# Position key / snapshot helpers
# ─────────────────────────────────────────────

def _position_key(pos: dict) -> str:
    """Stable unique key for a position record."""
    return (
        pos.get("conditionId")
        or pos.get("marketId")
        or pos.get("tokenId")
        or pos.get("id")
        or json.dumps(pos, sort_keys=True)
    )


def _position_size(pos: dict) -> float:
    for field in ("size", "amount", "quantity", "balance", "currentValue"):
        if field in pos:
            try:
                return float(pos[field])
            except (TypeError, ValueError):
                pass
    return 0.0


def _position_outcome(pos: dict) -> str:
    return (
        pos.get("outcome")
        or pos.get("side")
        or pos.get("tokenName")
        or "UNKNOWN"
    ).upper()


def _position_price(pos: dict) -> Optional[float]:
    for field in ("price", "avgPrice", "avgEntryPrice", "lastPrice"):
        if field in pos:
            try:
                return float(pos[field])
            except (TypeError, ValueError):
                pass
    return None


# ─────────────────────────────────────────────
# Alert formatting
# ─────────────────────────────────────────────

def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _short(addr: str) -> str:
    return addr[:8] + "…" + addr[-6:]


def _format_alert(kind: str, wallet: str, pos: dict, market_title: str = "") -> str:
    icon = {"NEW": "🟢", "SIZED_UP": "🔵", "CLOSED": "🔴"}.get(kind, "⚪")
    outcome = _position_outcome(pos)
    size = _position_size(pos)
    price = _position_price(pos)
    title = market_title or pos.get("market") or pos.get("marketSlug") or _position_key(pos)

    price_str = f" @ ${price:.4f}" if price else ""
    size_str = f"${size:,.2f}" if size >= 1 else f"{size:.4f}"

    line1 = (f"{icon} [{_ts()}]  {kind}  {_short(wallet)}"
             f"  │  {outcome}{price_str}  │  size: {size_str}")
    line2 = f"   Market : {title}"
    line3 = f"   Wallet : {wallet}"

    color = {
        "NEW": Fore.GREEN,
        "SIZED_UP": Fore.CYAN,
        "CLOSED": Fore.RED,
    }.get(kind, Fore.WHITE)

    return (
        f"\n{color}{Style.BRIGHT}{'─'*78}\n"
        f"{line1}\n"
        f"{Style.NORMAL}{line2}\n"
        f"{line3}\n"
        f"{color}{Style.BRIGHT}{'─'*78}{Style.RESET_ALL}"
    )


# ─────────────────────────────────────────────
# Alert callbacks
# ─────────────────────────────────────────────

def alert_console(kind: str, wallet: str, pos: dict, market_title: str = ""):
    print(_format_alert(kind, wallet, pos, market_title))


def alert_json_log(kind: str, wallet: str, pos: dict, market_title: str = "", logfile: str = "alerts.jsonl"):
    record = {
        "ts": _ts(),
        "kind": kind,
        "wallet": wallet,
        "market": market_title or _position_key(pos),
        "outcome": _position_outcome(pos),
        "size": _position_size(pos),
        "price": _position_price(pos),
        "raw": pos,
    }
    with open(logfile, "a") as f:
        f.write(json.dumps(record) + "\n")


# ─────────────────────────────────────────────
# Per-wallet state
# ─────────────────────────────────────────────

@dataclass
class WalletState:
    address: str
    # key -> position dict snapshot
    positions: dict = field(default_factory=dict)
    last_checked: Optional[float] = None
    consecutive_errors: int = 0


# ─────────────────────────────────────────────
# Monitor core
# ─────────────────────────────────────────────

class TradeMonitor:
    def __init__(
        self,
        wallets: list[str],
        poll_interval: int = POLL_INTERVAL_SECONDS,
        enrich_markets: bool = True,
        json_log: bool = True,
    ):
        self.states: dict[str, WalletState] = {
            addr.lower(): WalletState(address=addr.lower()) for addr in wallets
        }
        self.poll_interval = poll_interval
        self.enrich_markets = enrich_markets
        self.json_log = json_log
        self._market_cache: dict[str, str] = {}  # conditionId -> title

    # ── helpers ──────────────────────────────────────────────────────────

    def _get_market_title(self, pos: dict) -> str:
        if not self.enrich_markets:
            return ""
        cid = pos.get("conditionId") or pos.get("marketId") or pos.get("tokenId") or ""
        if not cid:
            return ""
        if cid in self._market_cache:
            return self._market_cache[cid]
        info = fetch_market_info(cid)
        title = info.get("question") or info.get("title") or info.get("slug") or cid
        self._market_cache[cid] = title
        return title

    def _emit(self, kind: str, wallet: str, pos: dict):
        title = self._get_market_title(pos)
        alert_console(kind, wallet, pos, title)
        if self.json_log:
            alert_json_log(kind, wallet, pos, title)

    # ── per-wallet poll ───────────────────────────────────────────────────

    def _poll_wallet(self, state: WalletState):
        new_positions_raw = fetch_positions(state.address)
        if new_positions_raw is None:
            state.consecutive_errors += 1
            log.warning("No data for %s (errors: %d)", state.address, state.consecutive_errors)
            return

        state.consecutive_errors = 0
        state.last_checked = time.time()

        # Build new snapshot
        new_snapshot: dict[str, dict] = {}
        for pos in new_positions_raw:
            key = _position_key(pos)
            if key:
                new_snapshot[key] = pos

        old_snapshot = state.positions

        # ── detect new positions ──────────────────────────────────────────
        for key, pos in new_snapshot.items():
            if key not in old_snapshot:
                self._emit("NEW", state.address, pos)
            else:
                old_size = _position_size(old_snapshot[key])
                new_size = _position_size(pos)
                # Significant size increase (>10%)
                if new_size > old_size * 1.10 and new_size - old_size > 1.0:
                    self._emit("SIZED_UP", state.address, pos)

        # ── detect closed positions ───────────────────────────────────────
        for key, pos in old_snapshot.items():
            if key not in new_snapshot:
                self._emit("CLOSED", state.address, pos)

        state.positions = new_snapshot

    # ── initial snapshot (silent) ─────────────────────────────────────────

    def _seed_wallet(self, state: WalletState):
        """Take an initial silent snapshot so we don't false-alert on existing positions."""
        positions_raw = fetch_positions(state.address)
        if positions_raw:
            state.positions = {
                _position_key(p): p
                for p in positions_raw
                if _position_key(p)
            }
        state.last_checked = time.time()
        log.info("  %s — seeded with %d open positions", _short(state.address), len(state.positions))

    # ── main loop ─────────────────────────────────────────────────────────

    def run(self):
        print(Fore.CYAN + Style.BRIGHT + f"\n{'═'*78}")
        print(Fore.CYAN + Style.BRIGHT + f"  POLYMARKET TRADE MONITOR  │  watching {len(self.states)} wallets  │  poll every {self.poll_interval}s")
        print(Fore.CYAN + Style.BRIGHT + f"{'═'*78}\n")

        # Seed initial state
        log.info("Taking initial position snapshots …")
        for state in self.states.values():
            self._seed_wallet(state)
            time.sleep(0.2)

        log.info("Monitoring started. Press Ctrl+C to stop.\n")

        while True:
            cycle_start = time.time()

            for state in self.states.values():
                try:
                    self._poll_wallet(state)
                except Exception as e:
                    log.error("Unexpected error polling %s: %s", state.address, e)
                time.sleep(0.15)  # gentle rate limiting per wallet

            elapsed = time.time() - cycle_start
            sleep_for = max(0, self.poll_interval - elapsed)
            log.debug("Cycle done in %.1fs — sleeping %.1fs", elapsed, sleep_for)
            time.sleep(sleep_for)


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

def _load_wallets_from_file(path: str) -> list[str]:
    with open(path) as f:
        data = json.load(f)
    # Support both a plain list of addresses and a list of wallet dicts
    if isinstance(data, list):
        addresses = []
        for item in data:
            if isinstance(item, str):
                addresses.append(item)
            elif isinstance(item, dict):
                addr = item.get("address") or item.get("user") or item.get("id") or ""
                if addr:
                    addresses.append(addr)
        return addresses
    raise ValueError(f"Unexpected format in {path}")


def main():
    parser = argparse.ArgumentParser(
        description="Watch Polymarket whale wallets for new positions."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--file", "-f",
        help="Path to JSON file produced by polymarket_scanner.py (top_wallets.json)",
    )
    group.add_argument(
        "--wallets", "-w",
        nargs="+",
        help="One or more wallet addresses to monitor directly",
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=POLL_INTERVAL_SECONDS,
        help=f"Poll interval in seconds (default: {POLL_INTERVAL_SECONDS})",
    )
    parser.add_argument(
        "--no-enrich",
        action="store_true",
        help="Skip fetching market titles (faster but less readable alerts)",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Do not write alerts to alerts.jsonl",
    )
    args = parser.parse_args()

    if args.file:
        try:
            wallets = _load_wallets_from_file(args.file)
        except (FileNotFoundError, ValueError) as e:
            print(Fore.RED + f"Error loading wallets: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        wallets = args.wallets

    if not wallets:
        print(Fore.RED + "No wallet addresses found.", file=sys.stderr)
        sys.exit(1)

    print(Fore.YELLOW + f"Loaded {len(wallets)} wallet(s) to monitor.")

    monitor = TradeMonitor(
        wallets=wallets,
        poll_interval=args.interval,
        enrich_markets=not args.no_enrich,
        json_log=not args.no_log,
    )

    try:
        monitor.run()
    except KeyboardInterrupt:
        print(Fore.YELLOW + "\nMonitor stopped.")


if __name__ == "__main__":
    main()
