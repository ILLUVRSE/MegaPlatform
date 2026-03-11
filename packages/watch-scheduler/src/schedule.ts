import { prisma } from "@illuvrse/db";
import { generateSchedules } from "./lib";

generateSchedules(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
