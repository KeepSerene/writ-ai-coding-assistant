import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import pkg from "../package.json" with { type: "json" };

const root = path.resolve(import.meta.dir, ".."); // packages/cli
const distDir = path.join(root, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const realDependencies = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => name !== "@writ/shared",
);

const result = await Bun.build({
  entrypoints: [path.join(root, "src/index.tsx")],
  outdir: distDir,
  target: "bun",
  format: "esm",
  external: realDependencies,
  banner: "#!/usr/bin/env bun",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const publishManifest = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  license: pkg.license,
  author: pkg.author,
  homepage: pkg.homepage,
  repository: pkg.repository,
  type: "module",
  bin: { writ: "./index.js" },
  engines: { bun: ">=1.3.14" },
  os: ["darwin", "linux"],
  dependencies: Object.fromEntries(
    realDependencies.map((name) => [
      name,
      (pkg.dependencies as Record<string, string>)[name],
    ]),
  ),
};

await Bun.write(
  path.join(distDir, "package.json"),
  JSON.stringify(publishManifest, null, 2),
);

try {
  await Bun.write(
    path.join(distDir, "LICENSE"),
    await Bun.file(path.resolve(root, "../../LICENSE")).text(),
  );
} catch (error) {
  console.warn(
    "Could not copy LICENSE file. Ensure it exists in the monorepo root.",
  );
}

await Bun.write(
  path.join(distDir, "README.md"),
  await Bun.file(path.join(root, "README.md")).text(),
);

console.log(`Built ${pkg.name}@${pkg.version} → packages/cli/dist`);
