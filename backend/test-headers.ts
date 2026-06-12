async function testUrl(name: string, url: string) {
  const userAgents = {
    'Default (IPTV-HealthChecker)': 'IPTV-HealthChecker/1.0',
    'Chrome (Windows)': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  console.log(`\nTesting: ${name} (${url})`);
  for (const [uaName, uaValue] of Object.entries(userAgents)) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': uaValue,
          'Accept': '*/*',
        }
      });
      const text = await res.text();
      console.log(`  - User-Agent: ${uaName}`);
      console.log(`    Status: ${res.status}`);
      console.log(`    Length: ${text.length} bytes`);
      console.log(`    Preview: ${text.slice(0, 100).replace(/\r?\n/g, ' ')}...`);
    } catch (err: any) {
      console.log(`  - User-Agent: ${uaName} | Error: ${err.message}`);
    }
  }
}

async function main() {
  await testUrl('NASA TV', 'https://ntv1.akamaized.net/hls/live/2014027/NASA-NTV1-Public/master.m3u8');
  await testUrl('Sintel', 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8');
}
main();
