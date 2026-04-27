import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  Cell,
} from 'recharts';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '60m', '1d', '1wk', '1mo'];
const YAHOO_API_BASE = import.meta.env.VITE_YAHOO_API_BASE || '/api/yahoo';

function toUnixSeconds(dateString, timeZone, endOfDay = false) {
  const base = `${dateString}T${endOfDay ? '23:59:59' : '00:00:00'}`;
  const date = new Date(base);
  const shifted = new Date(date.toLocaleString('en-US', { timeZone }));
  const diffMs = shifted.getTime() - date.getTime();
  return Math.floor((date.getTime() - diffMs) / 1000);
}

function buildCsv(rows) {
  const header = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
  const lines = rows.map((r) =>
    [r.timestamp, r.open, r.high, r.low, r.close, r.volume]
      .map((v) => `${v ?? ''}`)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-04-01');
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [interval, setInterval] = useState('1d');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasData = rows.length > 0;

  const selectedZoneOptions = useMemo(
    () => ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'],
    []
  );

  const fetchCandles = async (event) => {
    event.preventDefault();
    setError('');

    if (!symbol.trim()) {
      setError('Please enter a symbol.');
      return;
    }

    if (!startDate || !endDate || startDate > endDate) {
      setError('Please provide a valid date range.');
      return;
    }

    setLoading(true);
    try {
      const period1 = toUnixSeconds(startDate, timeZone, false);
      const period2 = toUnixSeconds(endDate, timeZone, true);
      const query = new URLSearchParams({
        period1: String(period1),
        period2: String(period2),
        interval,
        includePrePost: 'false',
        events: 'div,splits',
      });

      const url = `${YAHOO_API_BASE}/v8/finance/chart/${encodeURIComponent(
        symbol.trim().toUpperCase()
      )}?${query.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}.`);
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const timestamps = result?.timestamp || [];

      if (!quote || timestamps.length === 0) {
        throw new Error('No data returned for this selection.');
      }

      const parsed = timestamps
        .map((ts, i) => ({
          timestamp: new Date(ts * 1000).toLocaleString('en-US', { timeZone }),
          open: quote.open?.[i],
          high: quote.high?.[i],
          low: quote.low?.[i],
          close: quote.close?.[i],
          volume: quote.volume?.[i],
        }))
        .filter((r) => [r.open, r.high, r.low, r.close].every((n) => typeof n === 'number'));

      if (parsed.length === 0) {
        throw new Error('No complete OHLC candles found for this timeframe/date range.');
      }

      setRows(parsed);
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error
          ? `${err.message} If this is a CORS issue in production, deploy with the provided proxy rules or set VITE_YAHOO_API_BASE to your server endpoint.`
          : 'Unknown error while fetching data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${symbol.toUpperCase()}_${startDate}_${endDate}_${interval}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <h1>Yahoo Finance OHLC Explorer</h1>
      <form className="controls" onSubmit={fetchCandles}>
        <label>
          Symbol
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL" />
        </label>
        <label>
          Start Date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Timezone
          <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
            {selectedZoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timeframe
          <select value={interval} onChange={(e) => setInterval(e.target.value)}>
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading} type="submit">
          {loading ? 'Loading…' : 'Fetch Candles'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {hasData ? (
        <>
          <div className="actions">
            <button onClick={downloadCsv}>Download OHLC CSV</button>
            <span>{rows.length} candles</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={430}>
              <ComposedChart data={rows} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" minTickGap={48} />
                <YAxis domain={['dataMin', 'dataMax']} />
                <Tooltip />
                <Bar dataKey="high" barSize={2} fill="#64748b" />
                <Bar dataKey="low" barSize={2} fill="#64748b" />
                <Bar dataKey="close" barSize={9}>
                  {rows.map((entry, i) => {
                    const color = entry.close >= entry.open ? '#16a34a' : '#dc2626';
                    return <Cell key={`cell-${i}`} fill={color} />;
                  })}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="hint">Search a symbol and select your range to view OHLC candles.</p>
      )}
    </div>
  );
}

export default App;
