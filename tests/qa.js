// QA suite for TIV2 Storm Chaser: plays the real game in headless Chromium and checks every
// main feature. Run with `node tests/qa.js` (needs the `playwright` package and Chromium).
// The page is opened with ?qa, which exposes the game state as window.__qa.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a small static server for the repository, so the service worker and fetches behave like the web
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let browser, base;
const results = [];
function check(cond, msg) { if (!cond) throw new Error(msg); }

// a fresh page with its own storage; quality Low unless a test asks otherwise
async function open(opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 720 }, deviceScaleFactor: opts.scale || 1 });
  const page = await context.newPage();
  const gfx = opts.gfx || 'low';
  await page.addInitScript((g) => {
    if (!sessionStorage.getItem('qa-init')) {
      sessionStorage.setItem('qa-init', '1');
      localStorage.setItem('tiv2-gfx-auto', 'false');
      localStorage.setItem('tiv2-gfx', JSON.stringify(g));
    }
  }, gfx);
  page.errors = [];
  page.requests = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) page.errors.push(m.text()); });
  page.on('request', (r) => page.requests.push(r.url()));
  await page.goto(`${opts.host || base}/index.html?qa`);
  await page.waitForFunction(() => window.__qa && typeof THREE !== 'undefined', null, { timeout: 30000 });
  return page;
}
const close = (page) => page.context().close();
const q = (page, fn, arg) => page.evaluate(fn, arg);
async function until(page, fn, arg, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await sleep(250); }
  throw new Error(`timed out waiting for ${fn.toString().slice(0, 80)}`);
}
async function startAndBase(page) { await page.click('#btnStart'); await page.waitForSelector('#baseOverlay:not([hidden])'); }
async function pickVehicle(page, i) { await page.click('#baseTabs [data-tab="garage"]'); await page.locator('#vehSeg button').nth(i).click(); }
async function deploy(page) { await page.click('#btnDeploy'); await until(page, () => __qa.G.phase === 'calm'); }
// skip the forecast wait: a supercell drops an EF tornado right next to the truck
async function forceTornado(page, ef, dx = 40, dz = 300) {
  await q(page, ([ef, dx, dz]) => { const g = __qa.G, c = g.car; Object.assign(g.plan, { gx: c.x + dx, gz: c.z + dz, ef, speed: 0.5 }); g.phase = 'build'; g.phaseT = 0.05; }, [ef, dx, dz]);
  await until(page, () => __qa.T.active && __qa.T.inten > 0.5, null, 90000);
  await q(page, () => { __qa.T.life = 1e5; __qa.T.morphTo = null; });
}
const money = (page) => q(page, () => __qa.career.money);

async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`PASS  ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: e.message }); console.log(`FAIL  ${name}: ${e.message}`); }
}

const TESTS = [
  ['boots with no errors and loads nothing from the internet', async () => {
    const page = await open();
    await sleep(1500);
    check(await page.isVisible('#startOverlay'), 'start screen not shown');
    const external = page.requests.filter((u) => !u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:'));
    check(external.length === 0, 'external requests: ' + external.join(', '));
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['base, shop prices and field supplies', async () => {
    const page = await open();
    await startAndBase(page);
    await page.click('#baseTabs [data-tab="shop"]');
    const buy = async (title) => page.locator('.shop-card', { has: page.locator('b', { hasText: new RegExp(`^${title}$`) }) }).locator('.buy').click();
    await buy('Probe rack'); await buy('Probe'); await buy('Repair kit'); await buy('Fuel can');
    check(await money(page) === 1500 - 800 - 150 - 300 - 120, 'money after purchases: ' + await money(page));
    const c = await q(page, () => ({ p: __qa.career.probes, k: __qa.career.kits, f: __qa.career.cans }));
    check(c.p === 4 && c.k === 1 && c.f === 1, 'stock: ' + JSON.stringify(c));
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['admin panel: PIN, add money, unlimited money', async () => {
    const page = await open();
    await startAndBase(page);
    await page.click('#baseTabs [data-tab="shop"]'); await page.click('#btnAdmin');
    await page.fill('#adminPin', '1234'); await page.click('#btnAdminUnlock');
    check(await page.isVisible('#adminPanel'), 'panel did not unlock');
    await page.click('[data-add="100000"]');
    check(await money(page) === 101500, 'add money');
    await page.fill('#adminAmount', '42000'); await page.click('#btnAdminSet');
    check(await money(page) === 42000, 'set money');
    await page.check('#adminUnlimited'); await page.click('#btnAdminClose');
    await page.click('#baseTabs [data-tab="garage"]'); await page.locator('#upgradeList .buy').first().click();
    check(await money(page) === 42000 && (await page.textContent('#baseMoney')) === '$∞', 'unlimited money charged');
    await page.click('#baseTabs [data-tab="shop"]'); await page.click('#btnAdmin');
    await page.fill('#adminPin', '0000'); await page.click('#btnAdminUnlock');
    check(await page.isHidden('#adminPanel'), 'wrong PIN unlocked the panel');
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['every vehicle locks down and drives its spikes into the ground', async () => {
    const page = await open();
    await startAndBase(page);
    const n = await q(page, () => __qa.VEHICLES.length);
    for (let i = 0; i < n; i++) {
      await pickVehicle(page, i); await deploy(page);
      await page.keyboard.press('KeyR');
      await until(page, () => __qa.G.hyd.state === __qa.HYD.LOCKED && __qa.G.hyd.spike === 1);
      await page.keyboard.press('KeyP'); await page.click('#btnReturn');
      await page.waitForSelector('#baseOverlay:not([hidden])');
    }
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['storm cycle and radar products', async () => {
    const page = await open();
    await startAndBase(page); await deploy(page);
    await forceTornado(page, 3);
    await sleep(1500);
    await page.keyboard.press('KeyM');
    await page.waitForSelector('#radarOverlay:not([hidden])');
    const filled = (prod) => q(page, (prod) => {
      const c = __qa.RAD[prod], d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    }, prod);
    check(await filled('refl') > 30, 'reflectivity is empty');
    check(await filled('vel') > 30, 'velocity is empty');
    await page.click('#productSeg [data-prod="vel"]');
    check((await page.textContent('#radarInfo')).includes('velocity'), 'velocity product not selected');
    check((await page.textContent('#tornadoDetails')).includes('Estimated winds'), 'tornado details missing');
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['all ten tornado types render', async () => {
    const page = await open();
    await startAndBase(page); await deploy(page);
    await forceTornado(page, 4);
    const types = await q(page, () => Object.keys(__qa.TORNADO_TYPES));
    check(types.length === 10, 'expected 10 types, got ' + types.length);
    for (const t of types) {
      await q(page, (t) => Object.assign(__qa.T, { type: t, prevType: t, blend: 1 }), t);
      await sleep(400);
    }
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['wind threshold: Radar Truck torn loose by an EF4, TIV2 holds an EF5', async () => {
    for (const [veh, ef, shouldHold] of [[3, 4, false], [0, 5, true]]) {
      const page = await open();
      await startAndBase(page); await pickVehicle(page, veh); await deploy(page);
      await page.keyboard.press('KeyR');
      await until(page, () => __qa.G.hyd.state === __qa.HYD.LOCKED);
      await q(page, (ef) => { const g = __qa.G, c = g.car; Object.assign(__qa.T, { active: true, ef, inten: 1, age: 10, life: 1e5, type: 'cone', prevType: 'cone', blend: 1, ground: 1, speed: 0, R0: 14 + ef * 7, x: c.x + 14 + ef * 7, z: c.z }); g.phase = 'active'; }, ef);
      await sleep(3000);
      const held = await q(page, () => __qa.G.hyd.state === __qa.HYD.LOCKED);
      check(held === shouldHold, `vehicle ${veh} at EF${ef}: locked=${held}`);
      check(page.errors.length === 0, page.errors.join(' | '));
      await close(page);
    }
  }],
  ['storm ends, summary shows, data is paid at base', async () => {
    const page = await open();
    await startAndBase(page); await deploy(page);
    await forceTornado(page, 2);
    await q(page, () => { __qa.G.stormScore += 500; __qa.T.age = __qa.T.life - 0.2; });
    await page.waitForSelector('#summaryOverlay:not([hidden])', { timeout: 30000 });
    await page.click('#btnNext');
    await page.waitForSelector('#baseOverlay:not([hidden])');
    check(await money(page) >= 1750, 'paid ' + (await money(page) - 1500));
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['field supplies work during a chase', async () => {
    const page = await open();
    await startAndBase(page);
    await page.click('#baseTabs [data-tab="shop"]');
    await page.locator('.shop-card', { has: page.locator('b', { hasText: /^Repair kit$/ }) }).locator('.buy').click();
    await page.locator('.shop-card', { has: page.locator('b', { hasText: /^Fuel can$/ }) }).locator('.buy').click();
    await deploy(page);
    await q(page, () => { __qa.G.car.armor = 40; __qa.G.fuel = 10; });
    await page.keyboard.press('KeyP');
    await page.click('#btnUseKit'); await page.click('#btnUseCan');
    const s = await q(page, () => ({ a: Math.round(__qa.G.car.armor), f: Math.round(__qa.G.fuel), k: __qa.career.kits, c: __qa.career.cans }));
    check(s.a === 75 && s.f === 40 && s.k === 0 && s.c === 0, JSON.stringify(s));
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['graphics levels, including Ultra Full HD', async () => {
    const page = await open({ gfx: 'low' });
    await startAndBase(page); await deploy(page);
    for (const [lv, name] of [[3, 'ultra'], [2, 'high'], [1, 'medium'], [0, 'low']]) {
      await q(page, (lv) => __qa.setGfx(lv), lv);
      await sleep(800);
      const s = await q(page, () => ({ lv: __qa.gfx, tone: __qa.toneMapped, h: document.getElementById('game').height }));
      check(s.lv === lv, `${name}: level ${s.lv}`);
      if (lv === 3) check(s.tone && s.h >= 1080, `ultra: tone mapping ${s.tone}, ${s.h} px tall`);
    }
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['phone layout: gauges stay clear of the buttons and can be hidden', async () => {
    const page = await open({ viewport: { width: 844, height: 390 }, scale: 2 });
    await startAndBase(page); await deploy(page);
    const box = (sel) => page.locator(sel).boundingBox();
    const g = await box('#gauges');
    for (const sel of ['#btnCam', '#btnProbe', '#btnHyd', '#stick']) {
      const b = await box(sel);
      const overlap = !(g.x + g.width <= b.x || b.x + b.width <= g.x || g.y + g.height <= b.y || b.y + b.height <= g.y);
      check(!overlap, `gauges overlap ${sel}`);
    }
    await page.click('#btnGauges');
    check(await page.isHidden('#gaugeBody'), 'gauges did not hide');
    await page.reload(); await page.waitForFunction(() => window.__qa);
    check(await page.isHidden('#gaugeBody'), 'hidden gauges not remembered');
    check(page.errors.length === 0, page.errors.join(' | '));
    await close(page);
  }],
  ['progress is saved across a reload', async () => {
    const page = await open();
    await startAndBase(page);
    await page.click('#baseTabs [data-tab="shop"]');
    await page.locator('.shop-card', { has: page.locator('b', { hasText: /^IMAX lens$/ }) }).locator('.buy').click();
    await page.reload(); await page.waitForFunction(() => window.__qa);
    check(await money(page) === 300 && await q(page, () => __qa.career.lens === 1), 'career not saved');
    await close(page);
  }],
  ['works offline after the first visit (service worker)', async () => {
    const host = base.replace('127.0.0.1', 'localhost');
    const page = await open({ host });
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== undefined);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await sleep(1500);
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForFunction(() => window.__qa && typeof THREE !== 'undefined', null, { timeout: 30000 });
    check(await page.isVisible('#startOverlay'), 'did not load offline');
    await close(page);
  }]
];

(async () => {
  const server = await serve();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ args: ARGS });
  const only = process.argv[2];
  for (const [name, fn] of TESTS) if (!only || name.includes(only)) await test(name, fn);
  await browser.close(); server.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'qa-report.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
