const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const readline = require('readline');

function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

async function getBrowser() {
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

  return puppeteer.launch({
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
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function findFileInput(page) {
  await sleep(1000);
  const input = await page.$('input[type="file"]');
  if (input) return input;
  const buttons = await page.$$('button, [role="button"]');
  for (const btn of buttons) {
    const label = await btn.evaluate(el => el.getAttribute('aria-label') || el.textContent || '');
    if (label.toLowerCase().includes('attach') || label.includes('скреп')) {
      await btn.click();
      await sleep(500);
      const inputAfter = await page.$('input[type="file"]');
      if (inputAfter) return inputAfter;
    }
  }
  return null;
}

async function fillPrompt(page, prompt) {
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.click({ clickCount: 3 });
    await textarea.type(prompt, { delay: 2 });
    return true;
  }
  const editable = await page.$('[contenteditable="true"]');
  if (editable) {
    await editable.click({ clickCount: 3 });
    await editable.type(prompt, { delay: 2 });
    return true;
  }
  return false;
}

async function clickSend(page) {
  const candidates = await page.$$('button, [role="button"]');
  for (const btn of candidates) {
    const label = await btn.evaluate(el => el.getAttribute('aria-label') || el.textContent || '');
    const normalized = label.toLowerCase();
    if (normalized.includes('send') || normalized.includes('отправ') || normalized.includes('submit') || normalized.includes('enter')) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function getExistingBrowser() {
  const baseDir = path.join(__dirname, '..', 'temp', 'perplexity_ui');
  const wsPath = path.join(baseDir, 'ws_endpoint.txt');
  const wsEndpoint = process.env.PERPLEXITY_WS || (fs.existsSync(wsPath) ? fs.readFileSync(wsPath, 'utf-8').trim() : '');
  if (!wsEndpoint) return null;
  try {
    return await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
  } catch {
    return null;
  }
}

async function main() {
  const filesArg = process.argv.find(arg => arg.startsWith('--files='));
  const promptArg = process.argv.find(arg => arg.startsWith('--prompt='));
  if (!filesArg || !promptArg) {
    console.error('Usage: node scripts/perplexity-ui-upload.js --files=/path/to/files.txt --prompt=/path/to/prompt.txt');
    process.exit(1);
  }
  const filesPath = filesArg.replace('--files=', '');
  const promptPath = promptArg.replace('--prompt=', '');
  const files = readLines(filesPath);
  const prompt = fs.readFileSync(promptPath, 'utf-8');

  const browser = (await getExistingBrowser()) || (await getBrowser());
  const pages = await browser.pages();
  let page = pages.find(p => (p.url() || '').includes('perplexity.ai'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://www.perplexity.ai/', { waitUntil: 'networkidle2', timeout: 60000 });
  } else {
    await page.bringToFront();
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('Perplexity UI открыт. Заверши логин и открой новый чат, затем нажми Enter...\n', () => {
      rl.close();
      resolve();
    });
  });

  let fileInput = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    fileInput = await findFileInput(page);
    if (fileInput) break;
    await sleep(500);
  }
  if (!fileInput) {
    console.error('File input not found. Open Perplexity UI and make sure you are on the chat screen.');
    process.exit(2);
  }
  await fileInput.uploadFile(...files);
  await sleep(1000);

  const filled = await fillPrompt(page, prompt);
  if (!filled) {
    console.error('Prompt input not found. Click into the prompt field and try again.');
    process.exit(3);
  }

  await sleep(500);
  const sent = await clickSend(page);
  if (!sent) {
    console.error('Send button not found. Please send manually.');
    process.exit(4);
  }

  console.log('✅ Files uploaded, prompt filled, message sent.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
