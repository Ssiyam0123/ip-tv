/**
 * Minimal M3U/M3U8 playlist parser.
 * Handles #EXTM3U header, #EXTINF metadata, and #EXTGRP grouping.
 */

export interface M3UEntry {
  title: string;
  url: string;
  duration: number;
  group?: string;
  logo?: string;
  language?: string;
  country?: string;
}

export function parseM3U(content: string): M3UEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: M3UEntry[] = [];

  let currentExtinf: Partial<M3UEntry> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line === '#EXTM3U') {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Format: #EXTINF:-1 tvg-id="" tvg-logo="" group-title="",Channel Name
      const infoPart = line.slice(8); // Remove '#EXTINF:'
      const commaIndex = infoPart.indexOf(',');
      if (commaIndex === -1) continue;

      const attributes = infoPart.slice(0, commaIndex);
      const title = infoPart.slice(commaIndex + 1).trim();

      const durationMatch = attributes.match(/^(-?\d+\.?\d*)/);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : -1;

      const logoMatch = attributes.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch ? logoMatch[1] : undefined;

      const groupMatch = attributes.match(/group-title="([^"]*)"/);
      const group = groupMatch ? groupMatch[1] : undefined;

      currentExtinf = { title, duration, logo, group };
      continue;
    }

    if (line.startsWith('#EXTGRP:')) {
      const group = line.slice(8).trim();
      if (group) {
        currentExtinf.group = group;
      }
      continue;
    }

    // Skip other tags
    if (line.startsWith('#')) {
      continue;
    }

    // This is a URL line
    if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentExtinf.title) {
        entries.push({
          url: line,
          title: currentExtinf.title,
          duration: currentExtinf.duration ?? -1,
          group: currentExtinf.group,
          logo: currentExtinf.logo,
          language: currentExtinf.language,
          country: currentExtinf.country,
        });
      }
      currentExtinf = {};
    }
  }

  return entries;
}
