/**
 * Practica 12 - Fase 2: profiling de la PWA en Chromium (CDP) con un telefono simulado (390x844, CPU a 4x mas lenta).
 * Uso: node e2e-wb/profiling.mjs <etiqueta>   (backend en BACKEND, PWA en APP)
 * Mide: tiempo por operacion, CPU (TaskDuration/tiempo real), memoria JS (inicial, maxima, final), nodos DOM y tareas largas (>50 ms).
 */
import { chromium } from 'playwright'; import fs from 'fs';
const tag = process.argv[2] || 'prueba'; const APP = process.env.APP || 'http://localhost:4300', API = (process.env.BACKEND || 'http://localhost:4100') + '/api';
const EMAIL = 'profiling@wb.test', PASS = 'clave1234';
await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Perfil App', email: EMAIL, password: PASS }) });
const login = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASS }) })).json();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
await ctx.addInitScript(([t, u]) => { localStorage.setItem('cineadapt_token', t); localStorage.setItem('cineadapt_user', JSON.stringify(u));
  window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch {} }, [login.token, login.user]);
const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
let heapMax = 0; const muestreo = setInterval(async () => { try { const x = await m(); heapMax = Math.max(heapMax, x.JSHeapUsedSize); } catch {} }, 200);
const r1 = (x) => Math.round(x * 10) / 10; const ops = {};
const op = async (nombre, fn) => { const t0 = Date.now(); const a = await m(); await fn(); const b = await m(); ops[nombre] = { ms: Date.now() - t0, cpu_s: r1(b.TaskDuration - a.TaskDuration), script_s: r1(b.ScriptDuration - a.ScriptDuration), layout_s: r1((b.LayoutDuration - a.LayoutDuration) + (b.RecalcStyleDuration - a.RecalcStyleDuration)) }; };
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
await page.goto(APP + '/tabs/home', { waitUntil: 'commit' }); await page.locator('app-movie-card').first().waitFor(); await page.waitForLoadState('networkidle');
const ini = await m(); const t00 = Date.now(); const cpu00 = ini.TaskDuration;
// 1. Consulta repetida: recargar el inicio 5 veces
const cargas = []; for (let i = 0; i < 5; i++) { const t0 = Date.now(); await page.reload({ waitUntil: 'commit' }); await page.locator('app-movie-card').first().waitFor(); cargas.push(Date.now() - t0); await page.waitForLoadState('networkidle'); }
ops.consulta_inicio = { repeticiones: 5, primera_tarjeta_ms: cargas, mediana_ms: med(cargas) };
// 2. Escritura: agregar y quitar de Mi lista 5 veces
const cid = (await (await fetch(API + '/content?status=published', { headers: { Authorization: 'Bearer ' + login.token } })).json())[0].id;
await page.goto(`${APP}/detail/${cid}`); await page.locator('app-detail h2').waitFor(); const btn = page.locator('app-detail ion-button').filter({ hasText: /mi lista/i }).first(); const esc = [];
for (let i = 0; i < 5; i++) { for (const [de, a] of [[/\+ Mi lista/, /✓/], [/✓/, /\+ Mi lista/]]) { const t0 = Date.now(); await btn.click(); await page.waitForFunction(([r]) => new RegExp(r).test(document.body.innerText), [a.source]); esc.push(Date.now() - t0); } }
ops.escritura_mi_lista = { operaciones: esc.length, mediana_ms: med(esc), max_ms: Math.max(...esc) };
// 3. Navegacion entre pantallas principales
await page.goto(APP + '/tabs/home'); await page.locator('app-movie-card').first().waitFor(); const nav = {};
for (const [tab, sel] of [['search', 'ion-searchbar'], ['mylist', 'app-mylist'], ['profile', 'app-profile'], ['home', 'app-home']]) { const t0 = Date.now(); await page.locator(`ion-tab-button[tab="${tab}"]`).click(); await page.locator(`app-${tab === 'search' ? 'search' : tab}:visible, ${sel}:visible`).first().waitFor(); await page.waitForTimeout(50); nav[tab] = Date.now() - t0; }
ops.navegacion_ms = nav;
// 4. Procesamiento de datos: filtrar el catalogo cargado al escribir en Buscar
await page.locator('ion-tab-button[tab="search"]').click(); await page.locator('ion-searchbar input').waitFor();
const busq = []; const sel = 'app-search app-movie-card';
for (const q of ['Carga 123', 'Drama', 'Carga 4999', 'xyz']) { const a = await m(); const t0 = Date.now(); const entrada = page.locator('ion-searchbar input'); await entrada.fill(''); await entrada.fill(q);
  // el resultado esta listo cuando el numero de tarjetas deja de cambiar durante 1200 ms; el tiempo es el del ultimo cambio
  let prev = -1, tCambio = Date.now(); while (Date.now() - tCambio < 1200 && Date.now() - t0 < 20000) { const c = await page.locator(sel).count(); if (c !== prev) { prev = c; tCambio = Date.now(); } await page.waitForTimeout(40); }
  busq.push({ consulta: q, ms: tCambio - t0, tarjetas: prev, cpu_s: r1((await m()).TaskDuration - a.TaskDuration) }); }
ops.busqueda = busq;
clearInterval(muestreo); const fin = await m(); const lt = await page.evaluate(() => window.__lt);
const res = { etiqueta: tag, fecha: new Date().toISOString(), emulacion: 'Chromium, 390x844, CPU 4x mas lenta, red local', ...{ operaciones: ops },
  cpu: { tiempo_real_s: r1((Date.now() - t00) / 1000), cpu_promedio_pct: r1(((fin.TaskDuration - cpu00) / ((Date.now() - t00) / 1000)) * 100), script_s: r1(fin.ScriptDuration - ini.ScriptDuration), layout_s: r1((fin.LayoutDuration - ini.LayoutDuration) + (fin.RecalcStyleDuration - ini.RecalcStyleDuration)) },
  memoria_mb: { inicial: r1(ini.JSHeapUsedSize / 1048576), maxima: r1(heapMax / 1048576), final: r1(fin.JSHeapUsedSize / 1048576) }, nodos_dom_final: fin.Nodes,
  tareas_largas: { cantidad: lt.length, total_ms: Math.round(lt.reduce((a, b) => a + b, 0)), maxima_ms: Math.round(Math.max(0, ...lt)) } };
console.log(JSON.stringify(res, null, 1)); fs.mkdirSync('evidencias', { recursive: true }); fs.writeFileSync(`evidencias/profiling-app-${tag}.json`, JSON.stringify(res, null, 2)); await browser.close();
