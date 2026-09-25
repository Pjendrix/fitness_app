// Screenshoty pro náhled na přihlašovací obrazovce (public/preview) + obrázek pro sdílení odkazu (public/og.jpg).
// Vše z ukázkových dat dema, takže je po každé změně UI jde jedním příkazem přegenerovat:
//
//   npm i -D playwright && npx playwright install chromium   (jen poprvé)
//   npm run previews
//
import { build, preview, createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const OUT = resolve(root, 'public/preview');
const TMP = resolve(root, 'node_modules/.forge-preview');
const SLIDES = ['workout', 'summary', 'stats', 'exercise', 'looks'];
const HIDE = '.demo-bar, .undo-btn, .sync-badge, .update-prompt, .toast { display: none !important; }';

// 1) Ukázková data z generátoru dema
const vs = await createServer({ root, server: { middlewareMode: true }, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const { generateDemo } = await vs.ssrLoadModule('/src/lib/demoData.js');
const demo = generateDemo();
await vs.close();

// 2) Demo build + lokální server
process.env.VITE_DEMO = '1';
await build({ root, logLevel: 'error', build: { outDir: TMP, emptyOutDir: true } });
const server = await preview({ root, logLevel: 'error', build: { outDir: TMP }, preview: { port: 4317, strictPort: true } });
const URL = 'http://localhost:4317/';

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const shots = {};

async function page(lang, data) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, locale: lang });
  await ctx.addInitScript(([d, l]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('forge:demo', d);
    localStorage.setItem('forge:demo-user', '1');
    localStorage.setItem('forge:lang', l);
    localStorage.setItem('forge:guide', JSON.stringify({ hidden: true }));
  }, [JSON.stringify(data), lang]);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.addStyleTag({ content: HIDE });
  await p.waitForTimeout(1200);
  return { p, ctx };
}
const shot = async (p, lang, n) => {
  await p.addStyleTag({ content: HIDE });
  await p.waitForTimeout(400);
  const path = `${OUT}/${lang}-${n + 1}-${SLIDES[n]}.jpg`;
  const buf = await p.screenshot({ path, type: 'jpeg', quality: 82 });
  shots[`${lang}-${SLIDES[n]}`] = buf.toString('base64');
};
const nav = async (p, i) => { await p.locator('.nav-item').nth(i).click(); await p.waitForTimeout(700); };

for (const lang of ['en', 'cs']) {
  const { p, ctx } = await page(lang, demo);
  // 1 – rozběhnutý trénink se spuštěnou pauzou
  await p.locator('.card-hero .btn-primary').click();
  await p.waitForTimeout(800);
  // realistická délka tréninku (~58 min) – upravit rozpracovaný trénink a načíst znovu
  await p.evaluate(() => {
    const k = 'forge:active:demo';
    const a = JSON.parse(localStorage.getItem(k));
    a.startedAt = Date.now() - 58 * 60000;
    localStorage.setItem(k, JSON.stringify(a));
  });
  await p.reload();
  await p.waitForTimeout(1000);
  await nav(p, 1); // po načtení je appka na Home → zpět do tréninku
  const checks = p.locator('.check');
  for (let i = 0; i < 8; i++) { await checks.nth(i).click(); await p.waitForTimeout(40); }
  await p.locator('.card.ex').nth(2).evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16 }));
  await shot(p, lang, 0);
  // 2 – souhrn s rekordem (první série bench +2,5 kg)
  const w = p.locator('.card.ex').first().locator('.numfield input').nth(1);
  const cur = Number((await w.inputValue()) || 0);
  await w.fill(String(cur + 2.5));
  const rest = await p.locator('.set:not(.is-done) .check').count();
  for (let i = 0; i < rest; i++) { await p.locator('.set:not(.is-done) .check').first().click(); await p.waitForTimeout(30); }
  await p.locator('.finish-bottom').click();
  await p.waitForTimeout(500);
  const dlgBtn = p.locator('.sheet-dialog .btn-primary');
  if (await dlgBtn.count()) { await dlgBtn.first().click(); await p.waitForTimeout(500); }
  await p.evaluate(() => window.scrollTo({ top: 0 }));
  await shot(p, lang, 1);
  await p.locator('.summary .btn-finish').click();
  await p.waitForTimeout(600);
  // 3 – statistiky
  await nav(p, 0);
  await p.locator('.stats').click();
  await p.waitForTimeout(900);
  await shot(p, lang, 2);
  // 4 – detail cviku
  await p.locator('.ms-lift').first().click();
  await p.waitForTimeout(900);
  await shot(p, lang, 3);
  await ctx.close();
  // 5 – vlastní vzhled (podbarvení + akcent)
  const tinted = { ...demo, settings: { ...(demo.settings || {}), appearance: { tint: '#e27aa3', strength: 80, accent: '#b83c6e' } } };
  const b = await page(lang, tinted);
  await shot(b.p, lang, 4);
  await b.ctx.close();
}

// 6) Obrázek pro sdílení odkazu (1200×630)
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const img = (k) => `data:image/jpeg;base64,${shots[k]}`;
await og.setContent(`<!doctype html><html><head><style>
  body{margin:0;width:1200px;height:630px;background:#000;color:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden;position:relative}
  .glow{position:absolute;inset:-300px;background:radial-gradient(circle at 30% 45%,rgba(255,255,255,.1),transparent 45%)}
  .copy{position:absolute;left:80px;top:150px;width:520px}
  .eyebrow{font:500 15px ui-monospace,monospace;letter-spacing:.2em;color:rgba(255,255,255,.55);text-transform:uppercase}
  h1{margin:18px 0 20px;font-size:84px;line-height:.95;letter-spacing:-.05em;font-weight:600;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.55));-webkit-background-clip:text;color:transparent}
  p{font-size:23px;line-height:1.4;color:rgba(255,255,255,.72);margin:0}
  .brand{position:absolute;left:80px;bottom:56px;font:500 15px ui-monospace,monospace;letter-spacing:.35em;color:rgba(255,255,255,.4)}
  .ph{position:absolute;width:250px;border-radius:34px;padding:8px;background:linear-gradient(160deg,#2a2a2a,#0c0c0c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 40px 80px -20px rgba(0,0,0,.9)}
  .ph img{width:100%;display:block;border-radius:27px}
  .a{left:690px;top:70px;transform:rotate(-6deg)} .b{left:900px;top:120px;transform:rotate(5deg)}
</style></head><body><div class="glow"></div>
  <div class="copy"><div class="eyebrow">Strength training log</div><h1>Train with<br>intent.</h1>
  <p>Log every set in seconds, see your last time and next goal, and watch the records roll in.</p></div>
  <div class="brand">FORGE</div>
  <div class="ph a"><img src="${img('en-workout')}"></div><div class="ph b"><img src="${img('en-summary')}"></div>
</body></html>`);
await og.waitForTimeout(300);
await og.screenshot({ path: resolve(root, 'public/og.jpg'), type: 'jpeg', quality: 85 });

await browser.close();
await new Promise((r) => server.httpServer.close(r));
rmSync(TMP, { recursive: true, force: true });
console.log('Previews saved to public/preview and public/og.jpg');
