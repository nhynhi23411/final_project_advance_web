require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI_V2;
const dbName = process.env.DB_NAME_V2 || "lost_found_v2";

if (!uri) {
  console.error("Missing MONGODB_URI_V2 in .env");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const now = new Date();

  // 1) USERS: default status ACTIVE if missing/null
  const r1 = await db.collection("users").updateMany(
    { $or: [{ status: { $exists: false } }, { status: null }] },
    { $set: { status: "ACTIVE", updated_at: now } }
  );

  // 2) USERS: map legacy statuses -> ACTIVE (preserve legacy_status)
  // Nếu bạn muốn INACTIVE -> BANNED thì báo mình, đổi 1 dòng.
  const r2 = await db.collection("users").updateMany(
    { status: { $in: ["WARNED", "INACTIVE"] } },
    [
      {
        $set: {
          legacy_status: "$status",
          status: "ACTIVE",
          updated_at: now
        }
      }
    ]
  );

  // 3) POSTS: default is_match_scored=false if missing/null
  const r3 = await db.collection("posts").updateMany(
    { $or: [{ is_match_scored: { $exists: false } }, { is_match_scored: null }] },
    { $set: { is_match_scored: false, updated_at: now } }
  );

  console.log("✅ users missing status -> ACTIVE:", r1.modifiedCount);
  console.log("✅ users WARNED/INACTIVE -> ACTIVE:", r2.modifiedCount);
  console.log("✅ posts missing is_match_scored -> false:", r3.modifiedCount);

  await client.close();
  console.log("🎉 DONE migrate defaults");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});