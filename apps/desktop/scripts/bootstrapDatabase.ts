import { ensureDatabaseSchema } from "../src/infrastructure/db/bootstrapSql.js";
import { prisma } from "../src/infrastructure/db/prismaClient.js";

await ensureDatabaseSchema(prisma);
await prisma.$disconnect();

console.log("SQLite schema is ready.");
