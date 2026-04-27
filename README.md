# Yahoo Finance OHLC Explorer

This repository contains a React app (Vite) that:

- searches a ticker symbol
- lets the user choose start/end date
- lets the user choose timezone
- lets the user choose timeframe/interval
- fetches Yahoo Finance chart OHLCV data
- visualizes candles in a chart
- exports OHLCV rows as CSV

## CORS-safe Yahoo Finance access

Yahoo Finance blocks direct browser requests in many environments. This project now routes calls through same-origin `/api/yahoo/...`.

- Local dev/preview: configured in `vite.config.js` proxy.
- Vercel: configured in `vercel.json` rewrite.
- Netlify: configured in `netlify.toml` redirect.

You can also override the API base URL with `VITE_YAHOO_API_BASE`.

## Files

- `index.html`
- `package.json`
- `vite.config.js`
- `vercel.json`
- `netlify.toml`
- `src/main.jsx`
- `src/App.jsx`
- `src/styles.css`

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.
