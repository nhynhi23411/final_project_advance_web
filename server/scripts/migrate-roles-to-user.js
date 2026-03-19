require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || process.env.MONGODB_URI_V2;

if (!uri) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log("Connected to DB:", db.databaseName);

  const now = new Date();

  const r = await db.collection("users").updateMany(
    { role: { $in: ["FINDER", "OWNER"] } },
    { $set: { role: "USER", updated_at: now } }
  );

  console.log(`✅ Legacy roles migrated. Modified ${r.modifiedCount} users from FINDER/OWNER to USER.`);

  await client.close();
  console.log("🎉 DONE migrate-roles-to-user");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
