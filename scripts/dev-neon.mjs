// `npm run dev:neon` — run the app on http://localhost:3001 against the Neon database,
// without editing .env.local. Settings in .env.neon win over .env.local
// (Next.js never overrides a value that is already set).
import { spawn } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

if (!fs.existsSync(".env.neon")) {
  console.error("Missing .env.neon - create it with one line: DATABASE_URL=<your Neon connection string>");
  process.exit(1);
}
const neon = dotenv.parse(fs.readFileSync(".env.neon"));
console.log(`Using Neon database: ${new URL(neon.DATABASE_URL).host}`);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3001"], {
  stdio: "inherit",
  env: { ...process.env, ...neon },
});
child.on("exit", (code) => process.exit(code ?? 0));
