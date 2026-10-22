import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, "wrangler.json");
const wranglerPath = join(root, "node_modules/wrangler/bin/wrangler.js");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const database = config.d1_databases?.find(({ binding }) => binding === "DB");

if (!database) {
  throw new Error("The DB binding is missing from wrangler.json.");
}

let migrationsConfigPath = configPath;

if (!database.database_id) {
  // Workers Builds can provision D1 without writing its ID back to the fork.
  // Wrangler's remote migration command still requires that ID in its config.
  const output = execFileSync(process.execPath, [wranglerPath, "d1", "list", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  const matches = JSON.parse(output).filter(({ name }) => name === database.database_name);

  if (matches.length !== 1 || !matches[0].uuid) {
    throw new Error(
      `Could not uniquely find the provisioned D1 database ${database.database_name}.`,
    );
  }

  migrationsConfigPath = join(root, `.wrangler.migrations-${process.pid}.json`);
  writeFileSync(
    migrationsConfigPath,
    JSON.stringify({
      ...config,
      d1_databases: config.d1_databases.map((entry) =>
        entry.binding === "DB" ? { ...entry, database_id: matches[0].uuid } : entry,
      ),
    }),
  );
}

try {
  const result = spawnSync(
    process.execPath,
    [wranglerPath, "d1", "migrations", "apply", "DB", "--remote", "--config", migrationsConfigPath],
    { cwd: root, stdio: "inherit" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  if (migrationsConfigPath !== configPath) unlinkSync(migrationsConfigPath);
}
