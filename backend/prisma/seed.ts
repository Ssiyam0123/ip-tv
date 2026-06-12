import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create a default provider
  const provider = await prisma.provider.upsert({
    where: { name: 'Default Free IPTV Provider' },
    update: {},
    create: {
      name: 'Default Free IPTV Provider',
      baseUrl: 'https://example.com/playlist.m3u',
      enabled: true,
    },
  });
  console.log('Created provider:', provider.name);

  // 2. Create categories
  const categoriesData = [
    { name: 'News', slug: 'news', sortOrder: 1 },
    { name: 'Sports', slug: 'sports', sortOrder: 2 },
    { name: 'Entertainment', slug: 'entertainment', sortOrder: 3 },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder },
    });
    categories.push(category);
  }
  console.log(`Created/updated ${categories.length} categories.`);

  // Delete existing channels, health checks, and stream sources to ensure a fresh seed
  await prisma.streamHealthCheck.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.streamSource.deleteMany();
  await prisma.channel.deleteMany();

  const newsCategory = categories.find((c) => c.slug === 'news')!;
  const sportsCategory = categories.find((c) => c.slug === 'sports')!;
  const entCategory = categories.find((c) => c.slug === 'entertainment')!;

  // 3. Channels & Stream Sources
  const channelsData = [
    {
      title: 'NASA TV',
      slug: 'nasa-tv',
      description: 'Live coverage of NASA missions, launches, and space science.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
      categoryId: newsCategory.id,
      status: 'active',
      language: 'English',
      countryCode: 'US',
      externalId: 'nasa-tv-external',
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014027/NASA-NTV1-Public/master.m3u8',
    },
    {
      title: 'Al Jazeera English',
      slug: 'al-jazeera-english',
      description: 'International news channel broadcasting from Doha, Qatar.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Aljazeera_eng.svg',
      categoryId: newsCategory.id,
      status: 'active',
      language: 'English',
      countryCode: 'QA',
      externalId: 'al-jazeera-english-external',
      streamUrl: 'https://live-amg01212-aljazeeraeng-aljazeera-default.amagi.tv/playlist.m3u8',
    },
  ];

  for (const item of channelsData) {
    const { streamUrl, ...channelFields } = item;
    
    // Upsert Channel
    const channel = await prisma.channel.upsert({
      where: { slug: channelFields.slug },
      update: {
        title: channelFields.title,
        description: channelFields.description,
        logoUrl: channelFields.logoUrl,
        categoryId: channelFields.categoryId,
        status: channelFields.status,
        language: channelFields.language,
        countryCode: channelFields.countryCode,
        externalId: channelFields.externalId,
      },
      create: channelFields,
    });

    // Upsert Stream Source for the channel
    const existingSource = await prisma.streamSource.findFirst({
      where: { channelId: channel.id, url: streamUrl },
    });

    if (!existingSource) {
      await prisma.streamSource.create({
        data: {
          channelId: channel.id,
          providerId: provider.id,
          url: streamUrl,
          quality: 'auto',
          priority: 0,
          status: 'active',
          licenseStatus: 'authorized',
        },
      });
    } else {
      await prisma.streamSource.update({
        where: { id: existingSource.id },
        data: {
          status: 'active',
          licenseStatus: 'authorized',
        },
      });
    }
    
    console.log(`Seeded channel: ${channel.title}`);
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
