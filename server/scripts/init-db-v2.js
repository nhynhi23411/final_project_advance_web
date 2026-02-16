/* server/scripts/init-db-v2.js */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI_V2;
const dbName = process.env.DB_NAME_V2 || "lost_found_v2";

if (!uri) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

function oidOrNull() {
  return { bsonType: ["objectId", "null"] };
}
function dateOrNull() {
  return { bsonType: ["date", "null"] };
}
function stringOrNull() {
  return { bsonType: ["string", "null"] };
}

async function ensureCollection(db, name, validator) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    await db.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
    console.log(`✅ created collection: ${name}`);
  } else {
    // update validator if collection already exists
    await db.command({
      collMod: name,
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
    console.log(`🔁 updated validator: ${name}`);
  }
}

async function ensureIndexes(db) {
  // USERS
  await db.collection("users").createIndex({ email: 1 }, {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } }
  });
  await db.collection("users").createIndex({ phone: 1 }, {
    unique: true,
    partialFilterExpression: { phone: { $type: "string" } }
  });
  await db.collection("users").createIndex({ status: 1 });
  await db.collection("users").createIndex({ role: 1 });

  // POSTS
  await db.collection("posts").createIndex({ status: 1, created_at: -1 });
  await db.collection("posts").createIndex({ created_by_user_id: 1, created_at: -1 });
  await db.collection("posts").createIndex({ dedupe_hash: 1 }, {
    partialFilterExpression: { dedupe_hash: { $type: "string" } }
  });
  await db.collection("posts").createIndex({ location: "2dsphere" }); // geo query

  // POST_IMAGES
  await db.collection("post_images").createIndex({ post_id: 1, created_at: -1 });

  // MODERATION
  await db.collection("moderation_runs").createIndex({ post_id: 1, created_at: -1 });
  await db.collection("moderation_findings").createIndex({ run_id: 1, created_at: -1 });

  // POST_REVIEWS
  await db.collection("post_reviews").createIndex({ post_id: 1, created_at: -1 });
  await db.collection("post_reviews").createIndex({ admin_user_id: 1, created_at: -1 });

  // CLAIMS
  await db.collection("claims").createIndex({ target_post_id: 1, status: 1, created_at: -1 });
  await db.collection("claims").createIndex({ claimant_user_id: 1, created_at: -1 });
  await db.collection("claims").createIndex({ reviewer_user_id: 1, created_at: -1 }, {
    partialFilterExpression: { reviewer_user_id: { $type: "objectId" } }
  });

  // Match “at most 1 UNDER_VERIFICATION per target_post_id”
  await db.collection("claims").createIndex(
    { target_post_id: 1 },
    {
      unique: true,
      partialFilterExpression: { status: "UNDER_VERIFICATION" }
    }
  );

  // CLAIM_EVIDENCE
  await db.collection("claim_evidence").createIndex({ claim_id: 1, created_at: -1 });
  await db.collection("claim_evidence").createIndex({ created_by_user_id: 1, created_at: -1 });

  // MATCHES
  await db.collection("matches").createIndex(
    { lost_post_id: 1, found_post_id: 1 },
    { unique: true }
  );
  await db.collection("matches").createIndex({ created_at: -1 });

  // AUDIT_LOGS
  await db.collection("audit_logs").createIndex({ entity_type: 1, entity_id: 1, created_at: -1 });
  await db.collection("audit_logs").createIndex({ actor_user_id: 1, created_at: -1 }, {
    partialFilterExpression: { actor_user_id: { $type: "objectId" } }
  });
  await db.collection("audit_logs").createIndex({ source: 1, created_at: -1 });

  console.log("✅ indexes ensured");
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log("✅ connected");

  const db = client.db(dbName);

  // ===== USERS =====
  await ensureCollection(db, "users", {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "phone", "role", "status", "warning_count", "created_at", "updated_at"],
      additionalProperties: true,
      properties: {
        _id: { bsonType: "objectId" },
        username: { bsonType: "string", minLength: 1, maxLength: 50 },
        email: { bsonType: "string", minLength: 3, maxLength: 255 },
        phone: { bsonType: "string", minLength: 6, maxLength: 20 },
        role: { enum: ["ADMIN", "OWNER", "FINDER"] },
        status: { enum: ["ACTIVE", "BANNED", "WARNED", "INACTIVE"] },
        warning_count: { bsonType: "int", minimum: 0 },
        banned_at: dateOrNull(),
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
      }
    }
  });

  // ===== POSTS =====
  await ensureCollection(db, "posts", {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "post_type", "title", "status", "active_claim_count",
        "created_by_user_id", "created_at", "updated_at",
        "category", "location", "metadata"
      ],
      additionalProperties: true,
      properties: {
        _id: { bsonType: "objectId" },
        post_type: { enum: ["LOST", "FOUND"] },
        title: { bsonType: "string", minLength: 1, maxLength: 255 },
        description: stringOrNull(),
        status: { enum: ["PENDING_SYSTEM", "PENDING_ADMIN", "APPROVED", "NEEDS_UPDATE", "RETURNED", "REJECTED", "ARCHIVED"] },
        active_claim_count: { bsonType: "int", minimum: 0 },
        dedupe_hash: stringOrNull(),
        scoring_value: { bsonType: ["int", "null"], minimum: 0 },
        approved_at: dateOrNull(),
        reject_reason: stringOrNull(),
        archived_reason: stringOrNull(),

        created_by_user_id: { bsonType: "objectId" },
        approved_by_user_id: oidOrNull(),

        category: { bsonType: "string", minLength: 1, maxLength: 100 },

        // GeoJSON (recommended for 2dsphere index)
        // location: { type: "Point", coordinates: [lon, lat], address: "..." }
        location: {
          bsonType: "object",
          required: ["type", "coordinates", "address"],
          properties: {
            type: { enum: ["Point"] },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: [{ bsonType: "double" }, { bsonType: "double" }]
            },
            address: { bsonType: "string", minLength: 1, maxLength: 255 }
          }
        },

        // Metadata “gói nhỏ theo category”
        // VD: { brand: "...", serial: "...", paperName: "...", ... }
        metadata: { bsonType: "object" },

        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
      }
    }
  });

  // ===== POST_IMAGES =====
  await ensureCollection(db, "post_images", {
    $jsonSchema: {
      bsonType: "object",
      required: ["post_id", "url", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        post_id: { bsonType: "objectId" },
        url: { bsonType: "string", minLength: 5 },
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== MODERATION_RUNS =====
  await ensureCollection(db, "moderation_runs", {
    $jsonSchema: {
      bsonType: "object",
      required: ["post_id", "result", "started_at", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        post_id: { bsonType: "objectId" },
        result: { enum: ["PASS", "FAIL"] },
        engine_version: stringOrNull(),
        started_at: { bsonType: "date" },
        finished_at: dateOrNull(),
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== MODERATION_FINDINGS =====
  await ensureCollection(db, "moderation_findings", {
    $jsonSchema: {
      bsonType: "object",
      required: ["run_id", "issue_type", "severity", "is_blocking", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        run_id: { bsonType: "objectId" },
        issue_type: { bsonType: "string", minLength: 1, maxLength: 30 },
        severity: { enum: ["LOW", "MEDIUM", "HIGH"] },
        is_blocking: { bsonType: "bool" },
        detail: { bsonType: ["object", "array", "string", "null"] },
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== POST_REVIEWS =====
  await ensureCollection(db, "post_reviews", {
    $jsonSchema: {
      bsonType: "object",
      required: ["post_id", "admin_user_id", "decision", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        post_id: { bsonType: "objectId" },
        admin_user_id: { bsonType: "objectId" },
        decision: { enum: ["APPROVED", "NEEDS_UPDATE", "REJECTED"] },
        note: stringOrNull(),
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== CLAIMS =====
  await ensureCollection(db, "claims", {
    $jsonSchema: {
      bsonType: "object",
      required: ["target_post_id", "claimant_user_id", "status", "max_claims_limit_snapshot", "created_at", "updated_at"],
      properties: {
        _id: { bsonType: "objectId" },

        target_post_id: { bsonType: "objectId" },
        claimant_user_id: { bsonType: "objectId" },
        reviewer_user_id: oidOrNull(),
        claimant_post_id: oidOrNull(), // optional (A4)

        status: { enum: ["PENDING", "UNDER_VERIFICATION", "SUCCESSFUL", "REJECTED", "CANCELLED"] },
        max_claims_limit_snapshot: { bsonType: "int", minimum: 1 },

        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },

        accepted_at: dateOrNull(),
        rejected_at: dateOrNull(),
        reject_reason: stringOrNull(),
        cancelled_at: dateOrNull(),
        successful_at: dateOrNull(),

        archived_reason: stringOrNull(),
      }
    }
  });

  // ===== CLAIM_EVIDENCE =====
  await ensureCollection(db, "claim_evidence", {
    $jsonSchema: {
      bsonType: "object",
      required: ["claim_id", "created_by_user_id", "evidence_type", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        claim_id: { bsonType: "objectId" },
        created_by_user_id: { bsonType: "objectId" },
        evidence_type: { enum: ["TEXT", "IMAGE", "FILE", "VIDEO"] },
        content_text: stringOrNull(),
        file_url: stringOrNull(),
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== MATCHES =====
  await ensureCollection(db, "matches", {
    $jsonSchema: {
      bsonType: "object",
      required: ["lost_post_id", "found_post_id", "score", "status", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        lost_post_id: { bsonType: "objectId" },
        found_post_id: { bsonType: "objectId" },
        score: { bsonType: "int", minimum: 0, maximum: 100 },
        score_detail: { bsonType: ["object", "null"] },
        status: { enum: ["ACTIVE", "DISMISSED"] },
        created_at: { bsonType: "date" },
      }
    }
  });

  // ===== AUDIT_LOGS =====
  await ensureCollection(db, "audit_logs", {
    $jsonSchema: {
      bsonType: "object",
      required: ["actor_type", "action", "entity_type", "entity_id", "created_at", "source"],
      properties: {
        _id: { bsonType: "objectId" },

        actor_type: { enum: ["SYSTEM", "USER", "ADMIN"] },
        actor_user_id: oidOrNull(), // SYSTEM => null

        action: { bsonType: "string", minLength: 1, maxLength: 50 }, // e.g. "POST_STATUS_CHANGED"
        entity_type: { enum: ["POST", "CLAIM", "USER", "MATCH"] },
        entity_id: { bsonType: "objectId" },

        from_status: stringOrNull(),
        to_status: stringOrNull(),

        source: { enum: ["API", "ADMIN_DASHBOARD", "CRON", "AUTO_MODERATION"] },
        payload: { bsonType: ["object", "null"] },
        created_at: { bsonType: "date" },
      }
    }
  });

  await ensureIndexes(db);

  console.log(`🎉 DONE init database: ${dbName}`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
