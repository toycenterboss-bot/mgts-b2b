const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const baseDir = path.join(__dirname, '..', 'temp', 'perplexity_ui');
  const userDataDir = path.join(baseDir, 'chrome_profile');
  const chromeHomeDir = path.join(baseDir, 'chrome_home');
  [baseDir, userDataDir, chromeHomeDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  const chromeXdgConfigDir = path.join(chromeHomeDir, '.config');
  const chromeXdgCacheDir = path.join(chromeHomeDir, '.cache');
  const chromeXdgDataDir = path.join(chromeHomeDir, '.local', 'share');
  [chromeXdgConfigDir, chromeXdgCacheDir, chromeXdgDataDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const puppeteerExecutablePath =
    typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null;
  const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    puppeteerExecutablePath,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ].filter(Boolean);
  const chromeExecutablePath = chromeCandidates.find(candidate => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
    env: {
      ...process.env,
      HOME: chromeHomeDir,
      XDG_CONFIG_HOME: chromeXdgConfigDir,
      XDG_CACHE_HOME: chromeXdgCacheDir,
      XDG_DATA_HOME: chromeXdgDataDir
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-crashpad',
      '--no-crashpad',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--no-crash-upload',
      '--disable-features=Crashpad,CrashpadUserStream',
      '--force-device-scale-factor=1',
      '--high-dpi-support=1',
      '--window-size=1400,900',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 1 }
  });

  const page = await browser.newPage();
  await page.goto('https://www.perplexity.ai/', { waitUntil: 'networkidle2', timeout: 60000 });
  const wsPath = path.join(baseDir, 'ws_endpoint.txt');
  fs.writeFileSync(wsPath, browser.wsEndpoint());
  console.log(`Perplexity UI opened. WS endpoint saved: ${wsPath}`);
  console.log('Log in if needed. Close the browser to exit.');

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
