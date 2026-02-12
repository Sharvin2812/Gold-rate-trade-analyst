"use client";

import { useMemo, useState } from "react";

const CURRENCY = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value) {
  return CURRENCY.format(Number(value || 0));
}

export default function RetailRateCardPage() {
  const [weightG, setWeightG] = useState(10);
  const [purity, setPurity] = useState("916");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadQuote(nextWeight = weightG, nextPurity = purity) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/retail/quote?purity=${nextPurity}&weight_g=${nextWeight}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "Failed to fetch quote");
      setData(payload);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const whatsappText = useMemo(() => {
    if (!data) return "";
    return [
      `📌 Kedai Emas Rate Card (${new Date(data.ts).toLocaleString()})`,
      `Buy/g 999: ${money(data.ratesPerGram.buy["999"])}`,
      `Buy/g 916: ${money(data.ratesPerGram.buy["916"])}`,
      `Buy/g 750: ${money(data.ratesPerGram.buy["750"])}`,
      `Sell/g 999: ${money(data.ratesPerGram.sell["999"])}`,
      `Sell/g 916: ${money(data.ratesPerGram.sell["916"])}`,
      `Sell/g 750: ${money(data.ratesPerGram.sell["750"])}`,
      "Rates by ExchangeRate-API",
    ].join("\n");
  }, [data]);

  async function copyWhatsAppCard() {
    if (!whatsappText) return;
    await navigator.clipboard.writeText(whatsappText);
    alert("Rate card copied. You can paste into WhatsApp.");
  }

  return (
    <main style={{ maxWidth: 900, margin: "20px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Today&apos;s Kedai Rate Card</h1>
      <p>FX updates daily; gold spot updates live.</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Purity
          <select value={purity} onChange={(e) => setPurity(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="999">999</option>
            <option value="916">916</option>
            <option value="750">750</option>
          </select>
        </label>

        <label>
          Weight (g)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={weightG}
            onChange={(e) => setWeightG(e.target.value)}
            style={{ marginLeft: 8, width: 100 }}
          />
        </label>

        <button onClick={() => loadQuote(weightG, purity)} disabled={loading}>
          {loading ? "Loading..." : "Refresh Quote"}
        </button>

        <button onClick={copyWhatsAppCard} disabled={!data}>
          Copy for WhatsApp
        </button>
      </div>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {data ? (
        <section style={{ marginTop: 20 }}>
          <p>
            Source mode: <b>{data.snapshotSource}</b>
          </p>

          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Purity</th>
                <th>Buy / g</th>
                <th>Sell / g</th>
              </tr>
            </thead>
            <tbody>
              {["999", "916", "750"].map((p) => (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{money(data.ratesPerGram.buy[p])}</td>
                  <td>{money(data.ratesPerGram.sell[p])}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ marginTop: 16 }}>Price Calculator</h2>
          <ul>
            <li>Purity: {data.quote.purity}</li>
            <li>Weight: {data.quote.weightG} g</li>
            <li>Buy per gram: {money(data.quote.buyPerGram)}</li>
            <li>Subtotal: {money(data.quote.subtotal)}</li>
            <li>Making: {money(data.quote.making)}</li>
            <li>Fixed fee: {money(data.quote.fixedFee)}</li>
            <li>
              <b>Total: {money(data.quote.total)}</b>
            </li>
          </ul>
        </section>
      ) : null}

      <footer style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 10 }}>
        Rates by <a href="https://www.exchangerate-api.com" target="_blank">ExchangeRate-API</a>
      </footer>
    </main>
  );
}
