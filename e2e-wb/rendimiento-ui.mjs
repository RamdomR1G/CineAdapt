/**
 * Practica 11 - WB-06: rendimiento de la interfaz (carga de la pantalla Inicio) con Chromium.
 * Mide, en 5 repeticiones: tiempo hasta la primera tarjeta, tiempo hasta que no hay actividad de red, nodos DOM y memoria JS.
 */
import { chromium } from 'playwright'; import fs from 'fs';
const APP = process.env.APP || 'http://localhost:4300', API = (process.env.BACKEND || 'http://localhost:4100') + '/api';
const login = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.E2E_EMAIL || 'interrupcion@wb.test', password: 'clave1234' }) })).json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const stats = (a) => ({ min: Math.min(...a), prom: a.reduce((t, v) => t + v, 0) / a.length, max: Math.max(...a) });
const r = (x) => Math.round(x);
const out = [];
for (let i = 0; i < 5; i++) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([t, u]) => { localStorage.setItem('cineadapt_token', t); localStorage.setItem('cineadapt_user', JSON.stringify(u)); }, [login.token, login.user]);
  const p = await ctx.newPage(); let bytes = 0; p.on('response', async (res) => { if (res.url().includes('/api/content')) bytes = (await res.body().catch(() => Buffer.alloc(0))).length; });
  const t0 = Date.now(); await p.goto(APP + '/tabs/home', { waitUntil: 'commit' });
  await p.locator('app-movie-card').first().waitFor(); const tCard = Date.now() - t0;
  await p.waitForLoadState('networkidle'); const tIdle = Date.now() - t0;
  const m = await p.evaluate(() => ({ nodos: document.getElementsByTagName('*').length, tarjetas: document.querySelectorAll('app-movie-card').length, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
  out.push({ tCard, tIdle, bytes, ...m }); await ctx.close();
}
await browser.close();
const res = { repeticiones: out, primera_tarjeta_ms: Object.fromEntries(Object.entries(stats(out.map((x) => x.tCard))).map(([k, v]) => [k, r(v)])), red_inactiva_ms: Object.fromEntries(Object.entries(stats(out.map((x) => x.tIdle))).map(([k, v]) => [k, r(v)])), nodos_dom: out[0].nodos, tarjetas: out[0].tarjetas, bytes_catalogo: out[0].bytes, heap_mb: Math.round(out[0].heap / 1048576 * 10) / 10 };
console.log(JSON.stringify({ ...res, repeticiones: undefined }, null, 2));
fs.mkdirSync('evidencias', { recursive: true }); fs.writeFileSync(process.argv[2] || 'evidencias/rendimiento-ui.json', JSON.stringify(res, null, 2));
