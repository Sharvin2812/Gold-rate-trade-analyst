import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { retailProfiles, retailQuotes } from "@/lib/schema";
import { FreeProvider } from "@/lib/providers/freeProvider";
import { computeRetail, quoteTotal } from "@/lib/retailPricing";
import { allowedPurities, retailConfig } from "@/lib/config";

const memoryCache = {
  snapshot: null,
  expiresAt: 0,
};

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function errorResponse(status, code, message, details = null) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

function getWeight(searchParams) {
  const raw = searchParams.get("weight_g") ?? "1";
  const weight = Number(raw);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { error: "weight_g must be a positive number" };
  }

  if (weight > retailConfig.maxWeightGrams) {
    return {
      error: `weight_g exceeds max allowed ${retailConfig.maxWeightGrams}g`,
    };
  }

  return { value: Math.max(0.01, weight) };
}

async function getDefaultProfile() {
  const prof = await db
    .select()
    .from(retailProfiles)
    .orderBy(desc(retailProfiles.isDefault))
    .limit(1);

  return prof[0] || null;
}

async function getLatestStoredQuote(profileId) {
  const rows = await db
    .select()
    .from(retailQuotes)
    .where(eq(retailQuotes.profileId, profileId))
    .orderBy(desc(retailQuotes.ts))
    .limit(1);

  return rows[0] || null;
}

async function maybePersistSnapshot(profileId, snapshot, retail) {
  const latest = await getLatestStoredQuote(profileId);
  const nowMs = Date.now();

  if (latest?.ts) {
    const latestTs = new Date(latest.ts).getTime();
    const ageSeconds = (nowMs - latestTs) / 1000;
    if (ageSeconds < retailConfig.persistIntervalSeconds) {
      return;
    }
  }

  const ts = new Date(nowMs);
  await db
    .insert(retailQuotes)
    .values({
      profileId,
      ts,
      fxUsdMyr: snapshot.usdMyr.toString(),
      xauUsdPerOz: snapshot.xauUsdPerOz.toString(),
      spotMyrPerGram: retail.spotMyrPerGramFine.toString(),
      buy999: retail.buy999.toString(),
      sell999: retail.sell999.toString(),
      buy916: retail.buy916.toString(),
      sell916: retail.sell916.toString(),
      buy750: retail.buy750.toString(),
      sell750: retail.sell750.toString(),
    })
    .onConflictDoNothing();
}

function quoteFromStoredRow(row) {
  return {
    ts: new Date(row.ts),
    xauUsdPerOz: num(row.xauUsdPerOz),
    usdMyr: num(row.fxUsdMyr),
    spotMyrPerGramFine: num(row.spotMyrPerGram),
    buy999: num(row.buy999),
    sell999: num(row.sell999),
    buy916: num(row.buy916),
    sell916: num(row.sell916),
    buy750: num(row.buy750),
    sell750: num(row.sell750),
    source: "snapshot",
  };
}

async function resolveSnapshot(profileId) {
  const now = Date.now();
  if (memoryCache.snapshot && now < memoryCache.expiresAt) {
    return memoryCache.snapshot;
  }

  const provider = new FreeProvider();
  const mode = retailConfig.dataMode;

  if (mode === "snapshot") {
    const stored = await getLatestStoredQuote(profileId);
    if (!stored) {
      throw new Error("No stored snapshot available while RETAIL_DATA_MODE=snapshot");
    }
    const snapshot = quoteFromStoredRow(stored);
    memoryCache.snapshot = snapshot;
    memoryCache.expiresAt = now + retailConfig.cacheTtlSeconds * 1000;
    return snapshot;
  }

  try {
    const live = await provider.getSnapshot();
    const snapshot = {
      ts: live.ts,
      xauUsdPerOz: live.xauUsdPerOz,
      usdMyr: live.usdMyr,
      source: "live",
    };
    memoryCache.snapshot = snapshot;
    memoryCache.expiresAt = now + retailConfig.cacheTtlSeconds * 1000;
    return snapshot;
  } catch (error) {
    if (mode === "live") throw error;

    const stored = await getLatestStoredQuote(profileId);
    if (!stored) throw error;

    const snapshot = quoteFromStoredRow(stored);
    memoryCache.snapshot = snapshot;
    memoryCache.expiresAt = now + retailConfig.cacheTtlSeconds * 1000;
    return snapshot;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const purity = (searchParams.get("purity") ?? "916").trim();
  const weightResult = getWeight(searchParams);

  if (!allowedPurities.includes(purity)) {
    return errorResponse(400, "INVALID_PURITY", "purity must be one of 999, 916, 750", {
      allowed: allowedPurities,
    });
  }

  if (weightResult.error) {
    return errorResponse(400, "INVALID_WEIGHT", weightResult.error, {
      maxWeightGrams: retailConfig.maxWeightGrams,
    });
  }

  const weightG = weightResult.value;
  const profileRow = await getDefaultProfile();
  if (!profileRow) {
    return errorResponse(500, "PROFILE_NOT_FOUND", "No retail profile configured");
  }

  const profile = {
    premiumMyrPerGram: num(profileRow.premiumMyrPerGram),
    spreadPct: num(profileRow.spreadPct),
    makingChargeMyrPerGram: num(profileRow.makingChargeMyrPerGram),
    fixedFeeMyr: num(profileRow.fixedFeeMyr),
    factor999: num(profileRow.factor999),
    factor916: num(profileRow.factor916),
    factor750: num(profileRow.factor750),
  };

  try {
    const snapshot = await resolveSnapshot(profileRow.id);
    const retail = computeRetail(snapshot.xauUsdPerOz, snapshot.usdMyr, profile);
    await maybePersistSnapshot(profileRow.id, snapshot, retail);

    const buyPerGram =
      purity === "999" ? retail.buy999 : purity === "750" ? retail.buy750 : retail.buy916;

    const totals = quoteTotal(buyPerGram, weightG, profile);

    return NextResponse.json({
      ts: new Date(),
      snapshotSource: snapshot.source,
      cache: {
        ttlSeconds: retailConfig.cacheTtlSeconds,
        dataMode: retailConfig.dataMode,
      },
      sources: {
        gold: "gold-api.com (XAU USD/oz)",
        fx: "open.er-api.com (USD base)",
        fx_attribution_required: true,
      },
      snapshot: {
        xauUsdPerOz: snapshot.xauUsdPerOz,
        usdMyr: snapshot.usdMyr,
        spotMyrPerGramFine: retail.spotMyrPerGramFine,
      },
      profile: {
        name: profileRow.name,
        premiumMyrPerGram: profile.premiumMyrPerGram,
        spreadPct: profile.spreadPct,
        makingChargeMyrPerGram: profile.makingChargeMyrPerGram,
        fixedFeeMyr: profile.fixedFeeMyr,
      },
      ratesPerGram: {
        buy: {
          "999": retail.buy999,
          "916": retail.buy916,
          "750": retail.buy750,
        },
        sell: {
          "999": retail.sell999,
          "916": retail.sell916,
          "750": retail.sell750,
        },
      },
      quote: {
        purity,
        weightG,
        buyPerGram,
        subtotal: totals.subtotal,
        making: totals.making,
        fixedFee: totals.fixedFee,
        total: totals.total,
      },
    });
  } catch (error) {
    return errorResponse(502, "SNAPSHOT_UNAVAILABLE", "Unable to load live or stored rates", {
      dataMode: retailConfig.dataMode,
      reason: String(error.message || error),
    });
  }
}
