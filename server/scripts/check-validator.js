require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("No MONGO_URI in .env");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections({ name: "users" }).toArray();
    if (collections.length > 0) {
      console.log(JSON.stringify(collections[0].options.validator, null, 2));
    } else {
      console.log("Collection 'users' not found");
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
