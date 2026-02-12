function numEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const retailConfig = {
  cacheTtlSeconds: numEnv("RETAIL_CACHE_TTL_SECONDS", 180),
  persistIntervalSeconds: numEnv("RETAIL_PERSIST_INTERVAL_SECONDS", 300),
  maxWeightGrams: numEnv("RETAIL_MAX_WEIGHT_GRAMS", 1000),
  dataMode: (process.env.RETAIL_DATA_MODE || "hybrid").toLowerCase(), // live | snapshot | hybrid
};

export const allowedPurities = ["999", "916", "750"];
