# Ledgerline — Crypto Tax Calculator

A multi-country crypto tax calculator prototype. Ingest exchange/wallet statements, track
holdings across wallets, networks and platforms, and estimate capital gains + income tax for
**United States, United Kingdom, Australia, India and Ireland**. Ireland is modelled to
filing-grade detail (salary-aware income tax + USC + PRSI, CGT with the €1,270 exemption, and a
4-week-rule flag).

> ⚠️ Estimates for planning only — not tax filing advice. Verify with a qualified professional.

## Run locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To build a production bundle:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built bundle locally
```

## What's inside

- **Ingestion** — drag in CSV / Excel (`.xlsx`) / JSON from any exchange or wallet. Columns are
  auto-detected and normalized. Label each batch and assign it to a tax year.
- **Connect accounts** — the connection surface for API-key / OAuth / public-address sources.
  Sync is **simulated** in this client-only build (see note below).
- **Tax engine** — per-country cost basis (FIFO, HIFO, or UK Section 104 pooling), crypto-to-crypto
  swaps as disposals, staking/airdrops as income, non-taxable wallet transfers, and missing-cost-basis
  flagging.
- **Dashboard** — realized/unrealized P/L, allocation, holdings by wallet/network/platform, a
  filterable transaction ledger, and a lot-by-lot disposal audit trail you can export to CSV.

## Note on live exchange sync

Live exchange/on-chain sync is intentionally **not** performed in the browser: API secret keys must
be held server-side, exchanges block browser-origin requests (CORS), and OAuth needs a server
callback. The **Connect accounts** tab shows the real connection flow and loads demo data. A
production build adds a backend: encrypted key vault, per-exchange connectors, keyed on-chain
indexers (Etherscan/RPC), and a background sync job that stamps each transaction with its
historical fiat value.

## Tech

React 18 + Vite. Charts via Recharts, parsing via PapaParse + SheetJS, icons via lucide-react.

## Deploy

The `dist/` folder is static — deploy to GitHub Pages, Netlify, Vercel, or Cloudflare Pages.
For Vercel/Netlify, point the project at this repo and use build command `npm run build` with
output directory `dist`.
