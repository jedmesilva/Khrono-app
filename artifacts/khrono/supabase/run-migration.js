#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const https = require("https");

const PROJECT_REF = "hbekmqzdoxcsznykuxdj";
const ACCESS_TOKEN = process.env.EXPO_SUPABASE_ACCESS_TOKEN;
const MIGRATION_FILE = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error("EXPO_SUPABASE_ACCESS_TOKEN not set");
  process.exit(1);
}

if (!MIGRATION_FILE) {
  console.error("Usage: node run-migration.js <sql-file>");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(MIGRATION_FILE), "utf8").trim();
console.log("Running migration:", MIGRATION_FILE);
console.log("SQL:", sql);

const body = JSON.stringify({ query: sql });
const options = {
  hostname: "api.supabase.com",
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: "POST",
  headers: {
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("Migration applied successfully:", data);
    } else {
      console.error("Migration failed:", res.statusCode, data);
      process.exit(1);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  process.exit(1);
});

req.write(body);
req.end();
