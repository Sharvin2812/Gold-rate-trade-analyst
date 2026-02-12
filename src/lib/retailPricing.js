const OUNCE_TO_GRAM = 31.1034768;

export function computeRetail(xauUsdPerOz, usdMyr, p) {
  // Spot MYR per oz then per gram for fine gold (999)
  const spotMyrPerOz = xauUsdPerOz * usdMyr;
  const spotMyrPerGramFine = spotMyrPerOz / OUNCE_TO_GRAM;

  const baseBuyFine = spotMyrPerGramFine + p.premiumMyrPerGram;

  // Spread logic:
  // - "Buy" = what shop sells to customer (higher)
  // - "Sell" = what shop buys back from customer (lower)
  const sellMultiplier = 1 - p.spreadPct / 100;

  const buy999 = baseBuyFine * p.factor999;
  const sell999 = buy999 * sellMultiplier;

  const buy916 = baseBuyFine * p.factor916;
  const sell916 = buy916 * sellMultiplier;

  const buy750 = baseBuyFine * p.factor750;
  const sell750 = buy750 * sellMultiplier;

  return {
    spotMyrPerGramFine,
    buy999,
    sell999,
    buy916,
    sell916,
    buy750,
    sell750,
  };
}

export function quoteTotal(perGram, weightG, p) {
  const subtotal = perGram * weightG;
  const making = p.makingChargeMyrPerGram * weightG;
  const total = subtotal + making + p.fixedFeeMyr;
  return { subtotal, making, fixedFee: p.fixedFeeMyr, total };
}
