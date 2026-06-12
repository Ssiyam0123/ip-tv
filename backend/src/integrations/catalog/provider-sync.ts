import { PrismaClient } from '@prisma/client';
import { parseM3U } from './m3u-parser';
import { logger } from '../../observability/logger';

interface SyncResult {
  runId: string;
  channelsFound: number;
  channelsAdded: number;
  channelsUpdated: number;
  failures: number;
  durationMs: number;
  error?: string;
}

export class CatalogSyncService {
  private readonly fetchTimeout = 30000; // 30s
  private readonly maxSizeBytes = 50 * 1024 * 1024; // 50MB

  constructor(private readonly prisma: PrismaClient) {}

  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();

    // Use PostgreSQL advisory lock to prevent concurrent sync runs
    const lockResult = await this.prisma.$queryRaw<
      Array<{ pg_try_advisory_lock: boolean }>
    >`SELECT pg_try_advisory_lock(123456789) as pg_try_advisory_lock`;

    const acquired = lockResult[0]?.pg_try_advisory_lock;
    if (!acquired) {
      throw new Error('Another sync run is already in progress.');
    }

    // Create sync run record
    const syncRun = await this.prisma.syncRun.create({
      data: { status: 'running' },
    });

    try {
      // Get all enabled providers
      const providers = await this.prisma.provider.findMany({
        where: { enabled: true },
      });

      if (providers.length === 0) {
        const result: SyncResult = {
          runId: syncRun.id,
          channelsFound: 0,
          channelsAdded: 0,
          channelsUpdated: 0,
          failures: 0,
          durationMs: Date.now() - startTime,
        };

        await this.prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            ...result,
          },
        });

        return result;
      }

      let totalFound = 0;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalFailures = 0;

      for (const provider of providers) {
        try {
          const result = await this.syncProvider(provider.id, provider.baseUrl);
          totalFound += result.channelsFound;
          totalAdded += result.channelsAdded;
          totalUpdated += result.channelsUpdated;
          totalFailures += result.failures;
        } catch (err) {
          logger.error({ err, providerId: provider.id }, 'Provider sync failed');
          totalFailures++;
        }
      }

      const result: SyncResult = {
        runId: syncRun.id,
        channelsFound: totalFound,
        channelsAdded: totalAdded,
        channelsUpdated: totalUpdated,
        failures: totalFailures,
        durationMs: Date.now() - startTime,
      };

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: totalFailures > 0 ? 'failed' : 'completed',
          completedAt: new Date(),
          channelsFound: totalFound,
          channelsAdded: totalAdded,
          channelsUpdated: totalUpdated,
          failures: totalFailures,
          durationMs: result.durationMs,
        },
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });

      return {
        runId: syncRun.id,
        channelsFound: 0,
        channelsAdded: 0,
        channelsUpdated: 0,
        failures: 1,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    } finally {
      // Release advisory lock
      try {
        await this.prisma.$queryRaw`SELECT pg_advisory_unlock(123456789)`;
      } catch {
        // Best-effort unlock
      }
    }
  }

  private async syncProvider(
    providerId: string,
    baseUrl: string | null,
  ): Promise<{ channelsFound: number; channelsAdded: number; channelsUpdated: number; failures: number }> {
    if (!baseUrl) {
      return { channelsFound: 0, channelsAdded: 0, channelsUpdated: 0, failures: 0 };
    }

    // Fetch playlist
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(this.fetchTimeout),
      headers: { 'Accept': 'audio/x-mpegurl, application/vnd.apple.mpegurl' },
    });

    if (!response.ok) {
      throw new Error(`Provider returned status ${response.status}`);
    }

    // Check content size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.maxSizeBytes) {
      throw new Error(`Provider response too large: ${contentLength} bytes`);
    }

    const content = await response.text();

    if (content.length > this.maxSizeBytes) {
      throw new Error(`Provider content too large: ${content.length} bytes`);
    }

    // Parse M3U
    const entries = parseM3U(content);

    // Process entries
    let added = 0;
    let updated = 0;

    for (const entry of entries) {
      try {
        // Find or create category
        const targetCategory = this.determineCategory(entry.title, entry.group);

        let category = await this.prisma.category.findUnique({
          where: { slug: targetCategory.slug },
        });

        if (!category) {
          category = await this.prisma.category.create({
            data: { name: targetCategory.name, slug: targetCategory.slug },
          });
        }

        // Upsert channel by provider external ID (use URL hash as ID)
        const externalId = this.hashString(entry.url);
        const channelSlug = this.slugify(entry.title) + '-' + externalId.slice(0, 8);

        const existingChannel = await prismaChannelFindByExternalId(
          this.prisma, externalId,
        );

        if (existingChannel) {
          // Update existing channel
          await this.prisma.channel.update({
            where: { id: existingChannel.id },
            data: {
              title: entry.title,
              logoUrl: entry.logo || existingChannel.logoUrl,
              categoryId: category.id,
            },
          });
          updated++;
        } else {
          // Create new channel
          const channel = await this.prisma.channel.create({
            data: {
              title: entry.title,
              slug: channelSlug,
              categoryId: category.id,
              logoUrl: entry.logo,
              externalId,
            },
          });

          // Create stream source for this channel
          await this.prisma.streamSource.create({
            data: {
              channelId: channel.id,
              providerId,
              url: entry.url,
              quality: 'auto',
              priority: 0,
              status: 'active',
              licenseStatus: 'quarantined', // requires review
            },
          });

          added++;
        }
      } catch (err) {
        logger.error({ err, entryTitle: entry.title }, 'Failed to process M3U entry');
      }
    }

    return {
      channelsFound: entries.length,
      channelsAdded: added,
      channelsUpdated: updated,
      failures: 0,
    };
  }

  private determineCategory(title: string, groupName?: string): { name: string; slug: string } {
    const rawGroupName = groupName || '';
    const groups = rawGroupName.split(';').map(g => g.trim().toLowerCase()).filter(Boolean);
    const normalizedTitle = title.toLowerCase().trim();

    // If it's a sports channel or group-title contains Sports
    const isSports = groups.includes('sports') || 
                     groups.some(g => g.includes('sport')) ||
                     normalizedTitle.includes('sport') || 
                     normalizedTitle.includes('sports');

    if (isSports) {
      if (normalizedTitle.includes('cricket') || normalizedTitle.includes('ipl')) {
        return { name: 'Cricket', slug: 'cricket' };
      }
      if (
        normalizedTitle.includes('football') ||
        normalizedTitle.includes('soccer') ||
        normalizedTitle.includes('laliga') ||
        normalizedTitle.includes('serie a') ||
        normalizedTitle.includes('bundesliga') ||
        normalizedTitle.includes('premier league') ||
        normalizedTitle.includes('fifa') ||
        normalizedTitle.includes('uefa') ||
        normalizedTitle.includes('fc barcelona') ||
        normalizedTitle.includes('real madrid') ||
        normalizedTitle.includes('chelsea') ||
        normalizedTitle.includes('liverpool') ||
        normalizedTitle.includes('fc')
      ) {
        return { name: 'Football', slug: 'football' };
      }
      if (normalizedTitle.includes('golf')) {
        return { name: 'Golf', slug: 'golf' };
      }
      if (normalizedTitle.includes('tennis') || normalizedTitle.includes('wimbledon')) {
        return { name: 'Tennis', slug: 'tennis' };
      }
      if (
        normalizedTitle.includes('motor') ||
        normalizedTitle.includes('f1') ||
        normalizedTitle.includes('formula 1') ||
        normalizedTitle.includes('racing') ||
        normalizedTitle.includes('nascar') ||
        normalizedTitle.includes('moto gp')
      ) {
        return { name: 'Motorsports', slug: 'motorsports' };
      }
      if (
        normalizedTitle.includes('fight') ||
        normalizedTitle.includes('boxing') ||
        normalizedTitle.includes('ufc') ||
        normalizedTitle.includes('wwe') ||
        normalizedTitle.includes('wrestling') ||
        normalizedTitle.includes('mma')
      ) {
        return { name: 'Combat Sports', slug: 'combat-sports' };
      }
      return { name: 'Sports', slug: 'sports' };
    }

    // Default to the first group in M3U group title to avoid semicolons
    const firstGroup = rawGroupName.split(';')[0]?.trim();
    const categoryName = firstGroup || 'Uncategorized';
    return { name: categoryName, slug: this.slugify(categoryName) };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'untitled';
  }

  private hashString(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Helper to find channel by external ID across all channels
async function prismaChannelFindByExternalId(
  prisma: PrismaClient,
  externalId: string,
) {
  const channels = await prisma.channel.findMany({
    where: { externalId },
    take: 1,
  });
  return channels[0] || null;
}
