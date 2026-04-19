import { execFileSync } from "child_process";
import { exit } from "process";

const args = process.argv.slice(2);
const fixMode = args.includes("--fix");
let failed = false;

console.log(fixMode ? "Fixing JS/TS with ESLint..." : "Linting JS/TS with ESLint...");
try {
  execFileSync("npx", ["eslint", ".", ...(fixMode ? ["--fix"] : [])], { stdio: "inherit", cwd: process.cwd() });
} catch {
  failed = true;
}

const cssHtmlFiles = ["web/**/*.css", "web/**/*.html"];
console.log(fixMode ? "Fixing CSS/HTML with Prettier..." : "Checking CSS/HTML with Prettier...");
try {
  const prettierArgs = ["prettier", ...(fixMode ? ["--write"] : ["--check"]), "--cache", ...cssHtmlFiles];
  execFileSync("npx", prettierArgs, { stdio: "inherit", cwd: process.cwd() });
} catch {
  failed = true;
}

if (failed) {
  console.error("\nLint check failed.");
  exit(1);
}
