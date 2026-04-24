import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const providerEnv = process.env.DATABASE_PROVIDER || "postgresql";
const provider = providerEnv === "memory" ? "sqlite" : providerEnv;

const schemaPath = path.resolve("prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

const updated = schema.replace(
  /(datasource\s+\w+\s*\{[\s\S]*?provider\s*=\s*")[^"]+("[\s\S]*?\})/m,
  (_, prefix, suffix) => `${prefix}${provider}${suffix}`,
);

fs.writeFileSync(schemaPath, updated);

console.log(`Prisma datasource provider set to ${provider}`);
