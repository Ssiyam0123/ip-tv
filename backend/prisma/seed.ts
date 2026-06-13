import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ─────────────────────────────────────────────────────────────
  const adminEmail = 'admin@iptv.com';
  const adminPassword = 'AdminPass123!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    console.log('👥 Creating default admin user...');
    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await prisma.user.create({
      data: {
        email: adminEmail,
        displayName: 'Admin User',
        role: 'admin',
        authIdentities: {
          create: {
            provider: 'local',
            providerId: adminEmail,
            passwordHash,
          },
        },
      },
    });
    console.log(`✅ Admin user seeded: ${adminEmail} (Password: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // ─── Providers (iptv-org GitHub sources) ────────────────────────────────────

  const providers = [
    {
      name: 'iptv-org Sports',
      baseUrl: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
      enabled: true,
    },
    {
      name: 'iptv-org Football',
      baseUrl: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uk.m3u',
      enabled: false, // disabled by default — admin can enable per-region
    },
  ];

  for (const p of providers) {
    const provider = await prisma.provider.upsert({
      where: { name: p.name },
      update: { baseUrl: p.baseUrl, enabled: p.enabled },
      create: p,
    });
    console.log(`✅ Provider: ${provider.name}`);
  }

  // Get primary provider for stream sources
  const primaryProvider = await prisma.provider.findFirst({
    where: { name: 'iptv-org Sports' },
  });
  if (!primaryProvider) throw new Error('Primary provider not found');

  // ─── Categories ─────────────────────────────────────────────────────────────

  const categoriesData = [
    { name: 'Sports', slug: 'sports', sortOrder: 1 },
    { name: 'Football', slug: 'football', sortOrder: 2 },
    { name: 'Cricket', slug: 'cricket', sortOrder: 3 },
    { name: 'Tennis', slug: 'tennis', sortOrder: 4 },
    { name: 'Motorsports', slug: 'motorsports', sortOrder: 5 },
    { name: 'Combat Sports', slug: 'combat-sports', sortOrder: 6 },
    { name: 'News', slug: 'news', sortOrder: 7 },
    { name: 'Entertainment', slug: 'entertainment', sortOrder: 8 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap[cat.slug] = category.id;
    console.log(`✅ Category: ${category.name}`);
  }

  // ─── Demo Channels (authorized, publicly available) ──────────────────────────

  const demoChannels: Array<{
    title: string;
    slug: string;
    description: string;
    logoUrl: string;
    categorySlug: string;
    language: string;
    countryCode: string;
    streamUrl: string;
  }> = [
    {
      title: 'NASA TV',
      slug: 'nasa-tv',
      description: 'Live coverage of NASA missions, launches, and space science.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
      categorySlug: 'news',
      language: 'English',
      countryCode: 'US',
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014027/NASA-NTV1-Public/master.m3u8',
    },
    {
      title: 'Al Jazeera English',
      slug: 'al-jazeera-english',
      description: 'International news channel broadcasting from Doha, Qatar.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Aljazeera_eng.svg',
      categorySlug: 'news',
      language: 'English',
      countryCode: 'QA',
      streamUrl: 'https://live-amg01212-aljazeeraeng-aljazeera-default.amagi.tv/playlist.m3u8',
    },
    {
      title: 'Red Bull TV',
      slug: 'red-bull-tv',
      description: 'Live sports, music, and entertainment from Red Bull.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Red_Bull_TV_logo.svg/200px-Red_Bull_TV_logo.svg.png',
      categorySlug: 'sports',
      language: 'English',
      countryCode: 'AT',
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    },
    {
      title: 'Eurosport 1 (Demo)',
      slug: 'eurosport-1-demo',
      description: 'Pan-European sports channel covering motorsports, tennis, cycling and more.',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Eurosport_1_International_logo_2015.svg/200px-Eurosport_1_International_logo_2015.svg.png',
      categorySlug: 'sports',
      language: 'English',
      countryCode: 'EU',
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', // placeholder, replaced on sync
    },
  ];

  for (const item of demoChannels) {
    const { streamUrl, categorySlug, ...channelFields } = item;
    const categoryId = categoryMap[categorySlug];
    if (!categoryId) continue;

    const externalId = `seed-${channelFields.slug}`;

    const channel = await prisma.channel.upsert({
      where: { slug: channelFields.slug },
      update: {
        title: channelFields.title,
        description: channelFields.description,
        logoUrl: channelFields.logoUrl,
        categoryId,
        language: channelFields.language,
        countryCode: channelFields.countryCode,
        externalId,
      },
      create: {
        ...channelFields,
        categoryId,
        externalId,
        status: 'active',
      },
    });

    // Upsert stream source
    const existingSource = await prisma.streamSource.findFirst({
      where: { channelId: channel.id, url: streamUrl },
    });

    if (!existingSource) {
      await prisma.streamSource.create({
        data: {
          channelId: channel.id,
          providerId: primaryProvider.id,
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
        data: { status: 'active', licenseStatus: 'authorized' },
      });
    }

    console.log(`✅ Channel: ${channel.title}`);
  }

  console.log('\n🎉 Seeding finished successfully.');
  console.log('💡 Tip: Trigger a sync from the admin panel to import sports channels from iptv-org.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
