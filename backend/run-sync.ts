import { PrismaClient } from '@prisma/client';
import { CatalogSyncService } from './src/integrations/catalog/provider-sync';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Registering GitHub Free Sports Channels provider...');
    const provider = await prisma.provider.upsert({
      where: { name: 'GitHub Free Sports Channels' },
      update: {
        baseUrl: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
        enabled: true,
      },
      create: {
        name: 'GitHub Free Sports Channels',
        baseUrl: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
        enabled: true,
      },
    });
    console.log('Provider registered successfully:', provider);

    console.log('\nRunning Catalog Sync for all enabled providers...');
    const syncService = new CatalogSyncService(prisma);
    const result = await syncService.syncAll();
    
    console.log('\nSync completed!');
    console.log('Result:', JSON.stringify(result, null, 2));

    const totalChannels = await prisma.channel.count();
    console.log(`\nTotal channels now in database: ${totalChannels}`);
  } catch (err) {
    console.error('Error during sync run:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
