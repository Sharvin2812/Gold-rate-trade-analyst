import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Retail pricing profile (your “Kedai Emas settings”)
export const retailProfiles = pgTable("retail_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "KL Standard", "Penang Premium"

  // Premium/discount vs spot (MYR per gram)
  premiumMyrPerGram: numeric("premium_myr_per_gram", {
    precision: 18,
    scale: 6,
  })
    .notNull()
    .default("0"),

  // Spread in percentage (sell price = buy price * (1 - spreadPct/100))
  spreadPct: numeric("spread_pct", { precision: 10, scale: 4 })
    .notNull()
    .default("2.0"),

  // Making charge MYR per gram (optional)
  makingChargeMyrPerGram: numeric("making_charge_myr_per_gram", {
    precision: 18,
    scale: 6,
  })
    .notNull()
    .default("0"),

  // Fixed fee MYR (optional)
  fixedFeeMyr: numeric("fixed_fee_myr", { precision: 18, scale: 2 })
    .notNull()
    .default("0"),

  // Purity factors
  factor999: numeric("factor_999", { precision: 10, scale: 6 })
    .notNull()
    .default("0.999"),
  factor916: numeric("factor_916", { precision: 10, scale: 6 })
    .notNull()
    .default("0.916"),
  factor750: numeric("factor_750", { precision: 10, scale: 6 })
    .notNull()
    .default("0.750"),

  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Optional: store computed retail quotes for auditing / history
export const retailQuotes = pgTable(
  "retail_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => retailProfiles.id),
    ts: timestamp("ts", { withTimezone: true }).notNull(),

    fxUsdMyr: numeric("fx_usd_myr", { precision: 18, scale: 8 }).notNull(),
    xauUsdPerOz: numeric("xau_usd_per_oz", {
      precision: 18,
      scale: 8,
    }).notNull(),

    // computed spot MYR/gram (999 fine-equivalent)
    spotMyrPerGram: numeric("spot_myr_per_gram", {
      precision: 18,
      scale: 8,
    }).notNull(),

    // retail per-gram prices
    buy999: numeric("buy_999", { precision: 18, scale: 8 }).notNull(),
    sell999: numeric("sell_999", { precision: 18, scale: 8 }).notNull(),
    buy916: numeric("buy_916", { precision: 18, scale: 8 }).notNull(),
    sell916: numeric("sell_916", { precision: 18, scale: 8 }).notNull(),
    buy750: numeric("buy_750", { precision: 18, scale: 8 }).notNull(),
    sell750: numeric("sell_750", { precision: 18, scale: 8 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    idx: uniqueIndex("retail_quotes_unique_ts").on(t.profileId, t.ts),
  })
);
