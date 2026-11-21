import { query } from "../src/lib/db.js";

async function main() {
  const pcols = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'photos'"
  );
  console.log("PHOTOS TABLE COLS:", pcols.rows.map((r) => r.column_name));

  const sample = await query("SELECT * FROM photos LIMIT 3");
  console.log("PHOTOS SAMPLE:", sample.rows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
