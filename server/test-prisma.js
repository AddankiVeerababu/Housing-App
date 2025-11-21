const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
console.log("Models on client:", Object.keys(prisma));
process.exit(0);
