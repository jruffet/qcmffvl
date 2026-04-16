import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);

const changelogPath = path.resolve(__dir, '../web/json/changelog.json');
const versionsOutPath = path.resolve(__dir, '../web/generated/versions.json');

if (!fs.existsSync(changelogPath)) {
  console.error('Error: changelog.json not found at', changelogPath);
  process.exit(1);
}

let changelog;
try {
  changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
} catch (err) {
  console.error('Error: Failed to parse changelog.json:', err.message);
  process.exit(1);
}

if (!Array.isArray(changelog) || changelog.length === 0) {
  console.error('Error: changelog.json must be a non-empty array');
  process.exit(1);
}

const appVersion = changelog[0].version;
if (!appVersion) {
  console.error('Error: First entry in changelog.json missing "version" field');
  process.exit(1);
}

let qcmVersion = null;
for (const entry of changelog) {
  if (entry.qcm && entry.qcm.version) {
    qcmVersion = entry.qcm.version;
    break;
  }
}

if (!qcmVersion) {
  console.error('Error: No changelog entry with "qcm.version" found');
  process.exit(1);
}

fs.mkdirSync(path.dirname(versionsOutPath), { recursive: true });
fs.writeFileSync(versionsOutPath, JSON.stringify({ app_version: appVersion, qcm_version: qcmVersion }, null, 2) + '\n');
console.log(`Generated versions.json: app_version="${appVersion}", qcm_version="${qcmVersion}"`);
