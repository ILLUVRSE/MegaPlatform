import { runAllJobs } from '@/lib/jobs/run';
import { prisma } from '@/lib/prisma';

async function main() {
  const result = await runAllJobs();
  console.log('Jobs complete:', result);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
