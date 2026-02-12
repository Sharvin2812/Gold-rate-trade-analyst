import { db } from "../src/lib/db.js";
import { retailProfiles } from "../src/lib/schema.js";

async function main() {
  await db
    .insert(retailProfiles)
    .values({
      name: "MY Default (916 focus)",
      premiumMyrPerGram: "3.50", // you tune this
      spreadPct: "2.20", // typical shop spread
      makingChargeMyrPerGram: "8.00", // workmanship
      fixedFeeMyr: "0",
      factor999: "0.999",
      factor916: "0.916",
      factor750: "0.750",
      isDefault: true,
    })
    .onConflictDoNothing();

  console.log("✅ Retail profile seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
