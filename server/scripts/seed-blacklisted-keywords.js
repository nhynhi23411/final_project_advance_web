/* server/scripts/seed-blacklisted-keywords.js */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI_V2;
const dbName = process.env.DB_NAME_V2 || "lost_found_v2";

if (!uri) {
  console.error("Missing MONGODB_URI_V2 in .env");
  process.exit(1);
}

function normalizeKeyword(s) {
  return String(s).trim().toLowerCase();
}

function loadBlacklistJson() {
  const filePath = path.join(__dirname, "..", "src", "common", "blacklist.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  // Your format: { blacklist: [ { word: "..." } ] }
  const arr = Array.isArray(parsed?.blacklist) ? parsed.blacklist : [];

  const keywords = arr
    .map((x) => (x && typeof x === "object" ? x.word : null))
    .filter(Boolean)
    .map(normalizeKeyword)
    .filter((s) => s.length > 0);

  // unique
  return [...new Set(keywords)];
}

async function main() {
  const keywords = loadBlacklistJson();
  console.log(`✅ Loaded ${keywords.length} keywords from blacklist.json`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const now = new Date();

  // bulk upsert for speed
  const ops = keywords.map((kw) => ({
    updateOne: {
      filter: { keyword: kw },
      update: {
        $setOnInsert: { created_at: now },
        $set: {
          keyword: kw,
          keyword_raw: kw, // optional (same as kw after normalize); you can remove
          is_active: true,
          updated_at: now,
        },
      },
      upsert: true,
    },
  }));

  if (ops.length === 0) {
    console.log("⚠️ No keywords found. Check blacklist.json format.");
    await client.close();
    return;
  }

  const result = await db.collection("blacklisted_keywords").bulkWrite(ops, { ordered: false });

  console.log("🎉 DONE seed blacklisted_keywords");
  console.log({
    insertedCount: result.insertedCount,
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
  });

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});