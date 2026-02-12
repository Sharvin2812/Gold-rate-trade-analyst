import { desc } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import { retailProfiles, retailQuotes } from "../src/lib/schema.js";
import { FreeProvider } from "../src/lib/providers/freeProvider.js";
import { computeRetail } from "../src/lib/retailPricing.js";
import { retailConfig } from "../src/lib/config.js";

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function getDefaultProfile() {
  const rows = await db
    .select()
    .from(retailProfiles)
    .orderBy(desc(retailProfiles.isDefault))
    .limit(1);
  return rows[0] || null;
}

async function persistOneSnapshot() {
  const profileRow = await getDefaultProfile();
  if (!profileRow) throw new Error("No retail profile configured");

  const profile = {
    premiumMyrPerGram: num(profileRow.premiumMyrPerGram),
    spreadPct: num(profileRow.spreadPct),
    makingChargeMyrPerGram: num(profileRow.makingChargeMyrPerGram),
    fixedFeeMyr: num(profileRow.fixedFeeMyr),
    factor999: num(profileRow.factor999),
    factor916: num(profileRow.factor916),
    factor750: num(profileRow.factor750),
  };

  const provider = new FreeProvider();
  const snapshot = await provider.getSnapshot();
  const retail = computeRetail(snapshot.xauUsdPerOz, snapshot.usdMyr, profile);

  await db
    .insert(retailQuotes)
    .values({
      profileId: profileRow.id,
      ts: new Date(),
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

  console.log("snapshot stored", new Date().toISOString());
}

const intervalMs = Math.max(60, retailConfig.persistIntervalSeconds) * 1000;

persistOneSnapshot().catch((e) => {
  console.error(e);
  process.exit(1);
});

if (process.env.RETAIL_POLLER_LOOP === "1") {
  setInterval(() => {
    persistOneSnapshot().catch((e) => console.error("poller error", e));
  }, intervalMs);
}
