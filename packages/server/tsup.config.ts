import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    instrument: "src/instrument.ts",
  },
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  noExternal: ["@writ/db", "@writ/shared"],
  external: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "pg",
    "@sentry/profiling-node",
    "import-in-the-middle",
    "dotenv",
  ],
  clean: true,
  sourcemap: true,
});
