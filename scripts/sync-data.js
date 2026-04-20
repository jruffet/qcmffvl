import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function syncData() {
  console.log("[+] Starting data synchronization...");

  try {
    // 1. Sync CSV to JSON
    console.log("[+] Running csvref2json.py...");
    const versionsPath = path.resolve(process.cwd(), "web/json/versions.json");
    const versions = JSON.parse(fs.readFileSync(versionsPath, "utf8"));
    const qcmVersion = versions.qcm_version;

    // Use execSync for simplicity and to avoid the execa dependency issue
    execSync(
      "python3 scripts/csvref2json.py data/csv/qcm_ffvl.csv web/generated/qcm_ffvl.json " + qcmVersion,
      { stdio: "inherit" },
    );
    console.log("[+] CSV synced to JSON.");
  } catch (error) {
    console.error("[!] Data synchronization failed:");
    console.error(error.message);
    process.exit(1);
  }
}

syncData();
