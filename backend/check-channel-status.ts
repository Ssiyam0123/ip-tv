import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const channels = await prisma.channel.findMany({
    include: {
      streamSources: true,
      streamHealthChecks: {
        orderBy: { checkedAt: 'desc' },
        take: 3,
      }
    }
  });

  console.log('--- CHANNEL STATUSES ---');
  for (const ch of channels) {
    console.log(`Channel: ${ch.title} | Status: ${ch.status}`);
    for (const src of ch.streamSources) {
      console.log(`  - Source URL: ${src.url} | Status: ${src.status}`);
    }
    console.log('  - Recent Health Checks:', ch.streamHealthChecks.map(c => ({
      status: c.httpStatus,
      latency: c.latencyMs,
      reason: c.failureReason,
    })));
  }
  await prisma.$disconnect();
}
main();
