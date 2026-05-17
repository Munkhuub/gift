import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function verify() {
  try {
    await prisma.client.findFirst({
      select: { id: true },
    });
    console.log("✅ Connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
