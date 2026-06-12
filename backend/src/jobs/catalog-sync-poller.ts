import { PrismaClient } from '@prisma/client';
import { CatalogSyncService } from '../integrations/catalog/provider-sync';
import { logger } from '../observability/logger';

/**
 * Background job that periodically syncs the channel catalog from all enabled providers.
 * Utilizes the CatalogSyncService to parse M3U playlists and update the database.
 */
export class CatalogSyncPoller {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(private readonly prisma: PrismaClient) {}

  start(intervalMs = 3600000): void { // Default to 1 hour
    logger.info({ intervalMs }, 'Catalog sync poller started');
    // Run first sync in the background on startup
    this.sync();
    this.timer = setInterval(() => this.sync(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Catalog sync poller stopped');
  }

  private async sync(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Catalog sync is already in progress, skipping this run');
      return;
    }

    this.isRunning = true;
    try {
      logger.info('Starting background catalog sync...');
      const syncService = new CatalogSyncService(this.prisma);
      const result = await syncService.syncAll();
      logger.info(
        {
          channelsFound: result.channelsFound,
          channelsAdded: result.channelsAdded,
          channelsUpdated: result.channelsUpdated,
          failures: result.failures,
          durationMs: result.durationMs,
        },
        'Background catalog sync completed successfully'
      );
    } catch (err) {
      logger.error({ err }, 'Background catalog sync failed');
    } finally {
      this.isRunning = false;
    }
  }
}
