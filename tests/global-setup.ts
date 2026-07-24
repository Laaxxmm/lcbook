import { execFileSync } from "node:child_process";

// Apply migrations to the test DB once before the suite. `migrate deploy` needs no
// shadow DB, so it proves the migrations apply cleanly to a fresh database.
// Static args, no shell — execFile avoids any injection surface.
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://lc:lcpass@localhost:5432/lc_publications_test";
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
