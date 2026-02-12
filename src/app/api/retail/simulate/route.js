import { NextResponse } from "next/server";
import { allowedPurities, retailConfig } from "@/lib/config";
import { computeRetail, quoteTotal } from "@/lib/retailPricing";

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function validationError(message, details = null) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
    },
    { status: 400 }
  );
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  const purity = String(body.purity ?? "916").trim();
  const weightG = num(body.weight_g, 1);

  if (!allowedPurities.includes(purity)) {
    return validationError("purity must be one of 999, 916, 750", {
      allowed: allowedPurities,
    });
  }

  if (weightG <= 0 || weightG > retailConfig.maxWeightGrams) {
    return validationError("weight_g is out of range", {
      min: 0.01,
      max: retailConfig.maxWeightGrams,
    });
  }

  const market = {
    xauUsdPerOz: num(body.xau_usd_per_oz, 0),
    usdMyr: num(body.usd_myr, 0),
  };

  if (market.xauUsdPerOz <= 0 || market.usdMyr <= 0) {
    return validationError("xau_usd_per_oz and usd_myr must be positive numbers");
  }

  const profile = {
    premiumMyrPerGram: num(body.premium_myr_per_gram, 0),
    spreadPct: Math.max(0, num(body.spread_pct, 2)),
    makingChargeMyrPerGram: Math.max(0, num(body.making_charge_myr_per_gram, 0)),
    fixedFeeMyr: Math.max(0, num(body.fixed_fee_myr, 0)),
    factor999: num(body.factor_999, 0.999),
    factor916: num(body.factor_916, 0.916),
    factor750: num(body.factor_750, 0.75),
  };

  const retail = computeRetail(market.xauUsdPerOz, market.usdMyr, profile);
  const sellPerGram =
    purity === "999" ? retail.sell999 : purity === "750" ? retail.sell750 : retail.sell916;
  const buyBackPerGram =
    purity === "999" ? retail.buy999 : purity === "750" ? retail.buy750 : retail.buy916;

  const sale = quoteTotal(sellPerGram, weightG, profile);
  const costBasis = buyBackPerGram * weightG;
  const marginValue = sale.total - costBasis;
  const marginPct = costBasis > 0 ? (marginValue / costBasis) * 100 : 0;

  return NextResponse.json({
    input: {
      purity,
      weightG,
      market,
      profile,
    },
    ratesPerGram: {
      sellToCustomer: {
        "999": retail.sell999,
        "916": retail.sell916,
        "750": retail.sell750,
      },
      buyBackFromCustomer: {
        "999": retail.buy999,
        "916": retail.buy916,
        "750": retail.buy750,
      },
    },
    simulation: {
      sellPerGram,
      buyBackPerGram,
      saleSubtotal: sale.subtotal,
      making: sale.making,
      fixedFee: sale.fixedFee,
      grossSaleTotal: sale.total,
      costBasis,
      marginValue,
      marginPct,
    },
  });
}
