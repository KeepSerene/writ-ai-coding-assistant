import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const dbUrl = process.env["DATABASE_URL"];

if (!dbUrl) {
  throw new Error("DATABASE_URL is missing in the environment");
}

const adapter = new PrismaPg({ connectionString: dbUrl });

export const db = new PrismaClient({ adapter });
