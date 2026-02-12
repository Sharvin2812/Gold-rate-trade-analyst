export class FreeProvider {
  async getGoldXauUsdPerOz() {
    // gold-api: https://api.gold-api.com/price/XAU
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Gold API error: ${res.status}`);
    const j = await res.json();

    // common fields (seen in public examples): price, updatedAt
    const price = Number(j.price ?? j.USD ?? j.usd ?? j.value);
    const ts = new Date(j.updatedAt ?? j.updated_at ?? Date.now());

    if (!Number.isFinite(price)) throw new Error("Gold API: invalid price");
    return { price, ts };
  }

  async getUsdMyr() {
    // open access FX: https://open.er-api.com/v6/latest/USD
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`FX API error: ${res.status}`);
    const j = await res.json();

    const rate = Number(j?.rates?.MYR);
    const ts = new Date(j.time_last_update_utc ?? Date.now());

    if (!Number.isFinite(rate)) throw new Error("FX API: missing MYR");
    return { rate, ts };
  }

  async getSnapshot() {
    const [gold, fx] = await Promise.all([
      this.getGoldXauUsdPerOz(),
      this.getUsdMyr(),
    ]);
    const ts = gold.ts > fx.ts ? gold.ts : fx.ts;

    return {
      ts,
      xauUsdPerOz: gold.price,
      usdMyr: fx.rate,
    };
  }
}
