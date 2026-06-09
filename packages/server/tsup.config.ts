import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // instrument must be a separate output file because the start command
    // uses --import ./dist/instrument.js — it must load before index.js
    instrument: "src/instrument.ts",
  },
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  external: [
    // Prisma uses dynamic requires and ships native binaries — never bundle it
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "pg",
    // Sentry profiling is a native Node.js addon — must stay external
    "@sentry/profiling-node",
    // import-in-the-middle is used by Sentry's instrumentation hooks at
    // runtime — bundling it breaks the module interception mechanism
    "import-in-the-middle",
  ],
  clean: true, // wipes dist/ before each build
  sourcemap: true,
});
