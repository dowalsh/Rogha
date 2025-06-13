// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma"; // ✅ key change necessary to beat bug

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
