import "dotenv/config";
import "temporal-polyfill/full/global";

import postgres from "@prisma/orm-postgres/runtime";

import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

// Cria o cliente Prisma conectado ao PostgreSQL
export const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});
