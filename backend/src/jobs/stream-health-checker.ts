import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';

interface HealthCheckResult {
  httpStatus: number | null;
  latencyMs: number | null;
  contentType: string | null;
  failureReason: string | null;
}

const RECENT_WINDOW_COUNT = 3; // number of recent checks to consider
const DEGRADED_THRESHOLD = 0.5; // 50% failure rate = degraded
const OFFLINE_THRESHOLD = 0.8; // 80% failure rate = offline

/**
 * Background job that periodically checks the health of stream sources.
 * Uses HTTP GET with bounded response size to validate manifests.
 * Derives channel status from recent health check history.
 */
export class StreamHealthChecker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly concurrencyLimit = 5;
  private readonly checkTimeout = 10000; // 10s

  constructor(private readonly prisma: PrismaClient) {}

  start(intervalMs = 300000): void {
    logger.info({ intervalMs }, 'Stream health checker started');
    this.check(); // immediate first check
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Stream health checker stopped');
  }

  private async check(): Promise<void> {
    try {
      // Get active sources that need checking
      const sources = await this.prisma.streamSource.findMany({
        where: { status: { in: ['active', 'degraded'] } },
        orderBy: { priority: 'asc' },
        take: 50, // limit per check cycle
      });

      logger.info({ sourceCount: sources.length }, 'Starting health check cycle');

      // Process with bounded concurrency
      const batches: typeof sources[] = [];
      for (let i = 0; i < sources.length; i += this.concurrencyLimit) {
        batches.push(sources.slice(i, i + this.concurrencyLimit));
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map((source) => this.checkSource(source.id, source.url, source.channelId)),
        );

        for (const result of results) {
          if (result.status === 'rejected') {
            logger.error({ err: result.reason }, 'Health check failed');
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Health check cycle failed');
    }
  }

  private async checkSource(
    sourceId: string,
    url: string,
    channelId: string,
  ): Promise<void> {
    const result = await this.performCheck(url);

    // Record health check
    await this.prisma.streamHealthCheck.create({
      data: {
        streamSourceId: sourceId,
        channelId,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        contentType: result.contentType,
        failureReason: result.failureReason,
      },
    });

    // Derive new status from recent checks
    const recentChecks = await this.prisma.streamHealthCheck.findMany({
      where: { streamSourceId: sourceId },
      orderBy: { checkedAt: 'desc' },
      take: RECENT_WINDOW_COUNT,
    });

    const failures = recentChecks.filter((c) => c.failureReason !== null || (c.httpStatus !== null && c.httpStatus >= 400)).length;
    const failureRate = failures / recentChecks.length;

    let newStatus: string;
    if (failureRate >= OFFLINE_THRESHOLD) {
      newStatus = 'offline';
    } else if (failureRate >= DEGRADED_THRESHOLD) {
      newStatus = 'degraded';
    } else {
      newStatus = 'active';
    }

    // Update source status if changed
    await this.prisma.streamSource.update({
      where: { id: sourceId },
      data: { status: newStatus },
    });

    // Derive channel status from all its sources
    const channelSources = await this.prisma.streamSource.findMany({
      where: { channelId },
      select: { status: true },
    });

    const sourceStatuses = channelSources.map((s) => s.status);
    let channelStatus: string;
    if (sourceStatuses.some((s) => s === 'active')) {
      channelStatus = 'active';
    } else if (sourceStatuses.some((s) => s === 'degraded')) {
      channelStatus = 'degraded';
    } else if (sourceStatuses.every((s) => s === 'offline' || s === 'disabled')) {
      channelStatus = 'offline';
    } else {
      channelStatus = 'degraded';
    }

    await this.prisma.channel.update({
      where: { id: channelId },
      data: { status: channelStatus },
    });
  }

  private async performCheck(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.checkTimeout),
        headers: {
          'User-Agent': 'IPTV-HealthChecker/1.0',
          'Accept': '*/*',
        },
      });

      const latencyMs = Date.now() - startTime;

      // Only read enough to validate it's a playlist/manifest
      const text = await response.text();
      const contentType = response.headers.get('content-type');

      // Check that it looks like a valid media manifest
      const isValidManifest =
        text.includes('#EXTM3U') ||
        text.includes('#EXTINF') ||
        contentType?.includes('mpegurl') ||
        contentType?.includes('vnd.apple.mpegurl');

      if (!isValidManifest && text.length > 0) {
        // Might still be valid (some providers return plain HLS)
        // Just check that it's not binary garbage
      }

      return {
        httpStatus: response.status,
        latencyMs,
        contentType,
        failureReason: response.status >= 400 ? `HTTP ${response.status}` : null,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const failureReason = err instanceof Error ? err.message : 'Unknown error';
      return {
        httpStatus: null,
        latencyMs,
        contentType: null,
        failureReason,
      };
    }
  }
}
