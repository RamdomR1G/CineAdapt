/**
 * Practica 12 - Fase 5: escenarios RES-01 a RES-08 sobre la PWA real (Chromium + Playwright), con fallos provocados en la red del navegador.
 * Uso: node e2e-wb/resiliencia.mjs <etiqueta>. Backend en BACKEND (4100), PWA en APP (4300), PostgreSQL de pruebas (E2E_PGHOST/PORT/DB).
 * Despues de cada paso se consulta la base de datos directamente para saber que se guardo realmente.
 */
import { chromium } from 'playwright'; import fs from 'fs'; import pg from 'pg';
const tag = process.argv[2] || 'prueba'; const APP = process.env.APP || 'http://localhost:4300', API = (process.env.BACKEND || 'http://localhost:4100') + '/api';
const EMAIL = 'resiliencia@wb.test', PASS = 'clave1234'; const res = [];
const nota = (id, escenario, esperado, observado, ok, ms) => { res.push({ id, escenario, esperado, observado, ok, ...(ms != null ? { tiempo_ms: ms } : {}) }); console.log(ok ? 'OK ' : 'DEF', id, '|', observado, ms != null ? `(${ms} ms)` : ''); };
const db = new pg.Client({ host: process.env.E2E_PGHOST || '/tmp', port: Number(process.env.E2E_PGPORT || 5433), user: 'postgres', database: process.env.E2E_PGDB || 'cineadapt_wb' }); await db.connect();
await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Prueba Resiliencia', email: EMAIL, password: PASS }) });
const login = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASS }) })).json(); const uid = login.user.id;
// Catalogo pequeno para estas pruebas: el filtro ?limit se ignora si el backend es el original
const cid = (await db.query("SELECT id FROM content WHERE status='published' ORDER BY id LIMIT 1")).rows[0].id;
await db.query('DELETE FROM watchlist WHERE user_id=$1', [uid]); await db.query("DELETE FROM reports WHERE created_by=$1", [uid]);
const filasLista = async () => (await db.query('SELECT count(*)::int n FROM watchlist WHERE user_id=$1 AND content_id=$2', [uid, cid])).rows[0].n;
const filasRep = async (t) => (await db.query('SELECT count(*)::int n FROM reports WHERE created_by=$1 AND title=$2', [uid, t])).rows[0].n;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Los avisos de red del navegador (Failed to load resource) no se cuentan como excepciones de la app
async function nuevo() { const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([t, u]) => { localStorage.setItem('cineadapt_token', t); localStorage.setItem('cineadapt_user', JSON.stringify(u)); }, [login.token, login.user]);
  const page = await ctx.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push(m.text()); }); return { ctx, page, errores }; }
const hayError = (p) => p.getByText(/No se pudo cargar|sin conexi|no se pudo|error/i).first();
const esperar = async (loc, ms) => { const t0 = Date.now(); try { await loc.waitFor({ timeout: ms }); return Date.now() - t0; } catch { return null; } };
const API_CATALOGO = '**/api/content?*'; const VENTANA = 40000;

// RES-01 Perdida de Internet durante una consulta
{ const { ctx, page } = await nuevo(); await page.route(API_CATALOGO, (r) => r.abort('internetdisconnected')); const t0 = Date.now(); await page.goto(APP + '/tabs/home', { waitUntil: 'commit' });
  const ms = await esperar(page.getByText(/No se pudo cargar/i), VENTANA); const reint = await page.getByRole('button', { name: /reintentar/i }).count();
  nota('RES-01', 'Perdida de Internet durante una consulta (catalogo)', 'Error controlado con opcion de reintentar', ms != null ? `Mensaje de error a los ${ms} ms; boton Reintentar: ${reint ? 'si' : 'no'}` : 'Sin mensaje en ' + VENTANA / 1000 + ' s', ms != null && reint > 0, ms); await ctx.close(); }
// RES-02 Perdida de Internet durante una escritura
{ const { ctx, page, errores } = await nuevo(); await page.goto(`${APP}/detail/${cid}`); await page.locator('app-detail h2').waitFor(); const btn = page.locator('app-detail ion-button').filter({ hasText: /mi lista/i }).first();
  await ctx.setOffline(true); errores.length = 0; await btn.click(); await page.waitForTimeout(1500); const ui = ((await btn.textContent()) || '').trim(); const aviso = await page.getByText(/sin conexi|no se pudo|error|intenta/i).count();
  nota('RES-02', 'Perdida de Internet durante una escritura (Mi lista)', 'No confirmar falsamente y avisar al usuario', `Boton="${ui}"; filas en BD=${await filasLista()}; aviso visible=${aviso ? 'si' : 'no'}; excepciones sin capturar=${errores.length}`, !/✓/.test(ui) && (await filasLista()) === 0 && aviso > 0); await ctx.close(); }
// RES-03 Servidor sin respuesta
{ const { ctx, page } = await nuevo(); await page.route(API_CATALOGO, () => { /* nunca responde */ }); const t0 = Date.now(); await page.goto(APP + '/tabs/home', { waitUntil: 'commit' });
  const ms = await esperar(page.getByText(/No se pudo cargar/i), VENTANA); const spinner = await page.locator('ion-spinner').count();
  nota('RES-03', 'Servidor sin respuesta (la solicitud nunca termina)', 'Timeout controlado y mensaje de error', ms != null ? `Timeout detectado a los ${ms} ms` : `Sin timeout: tras ${VENTANA / 1000} s la pantalla sigue cargando (spinner=${spinner})`, ms != null, ms ?? VENTANA); await ctx.close(); }
// RES-04 Respuesta HTTP 500
{ const { ctx, page, errores } = await nuevo(); await page.route(API_CATALOGO, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fallo interno"}' })); const t0 = Date.now(); await page.goto(APP + '/tabs/home', { waitUntil: 'commit' });
  const ms = await esperar(page.getByText(/No se pudo cargar/i), VENTANA); const navOk = await page.locator('ion-tab-button').count();
  nota('RES-04', 'Respuesta HTTP 500 del servidor', 'Mostrar error y conservar estabilidad', ms != null ? `Mensaje a los ${ms} ms; barra de navegacion operativa=${navOk > 0}; excepciones sin capturar=${errores.filter((e) => !/500|Failed to load resource/.test(e)).length}` : 'Sin mensaje de error', ms != null && navOk > 0, ms); await ctx.close(); }
// RES-05 Respuesta 401 / 403
{ const { ctx, page } = await nuevo(); await page.route(API_CATALOGO, (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Token invalido"}' })); await page.goto(APP + '/tabs/home', { waitUntil: 'commit' });
  const t0 = Date.now(); let ms = null; try { await page.waitForURL(/\/login/, { timeout: 8000 }); ms = Date.now() - t0; } catch {} nota('RES-05a', 'Respuesta HTTP 401 (sesion vencida)', 'Cerrar sesion y llevar al inicio de sesion', ms != null ? 'Redirigido a /login' : 'No redirige', ms != null, ms); await ctx.close(); }
{ const { ctx, page, errores } = await nuevo(); await page.goto(`${APP}/detail/${cid}`); await page.locator('app-detail h2').waitFor(); const btn = page.locator('app-detail ion-button').filter({ hasText: /mi lista/i }).first();
  await page.route('**/api/watchlist', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Sin permiso"}' }) : r.continue()); errores.length = 0; await btn.click(); await page.waitForTimeout(1500);
  const ui = ((await btn.textContent()) || '').trim(); const aviso = await page.getByText(/sin permiso|no se pudo|error/i).count();
  nota('RES-05b', 'Respuesta HTTP 403 (sin permiso) en una escritura', 'No confirmar y mostrar el motivo', `Boton="${ui}"; aviso visible=${aviso ? 'si' : 'no'}; excepciones sin capturar=${errores.filter((e) => !/403|Failed to load resource/.test(e)).length}`, !/✓/.test(ui) && aviso > 0); await ctx.close(); }
// RES-06 Recuperacion de la conexion
{ const { ctx, page } = await nuevo(); await page.route(API_CATALOGO, (r) => r.abort('internetdisconnected')); await page.goto(APP + '/tabs/home', { waitUntil: 'commit' }); await esperar(page.getByText(/No se pudo cargar/i), VENTANA);
  await page.unroute(API_CATALOGO); const t0 = Date.now(); const b = page.getByRole('button', { name: /reintentar/i }); if (await b.count()) await b.first().click(); const ms = await esperar(page.locator('app-movie-card').first(), 15000) != null ? Date.now() - t0 : null;
  nota('RES-06', 'Recuperacion de la conexion tras un fallo', 'Restablecer la comunicacion al reintentar', ms != null ? `Catalogo restablecido en ${ms} ms tras pulsar Reintentar` : 'No se restablece', ms != null, ms); await ctx.close(); }
// RES-07 Reintento de una escritura (respuesta perdida y nuevo intento del usuario)
{ const { ctx, page } = await nuevo(); await page.goto(APP + '/support'); await page.locator('#rep-title').waitFor(); const titulo = 'Duplicado ' + Date.now();
  await page.locator('#rep-title input').fill(titulo); await page.locator('#rep-desc textarea').fill('Prueba de reintento');
  let primera = true; await page.route('**/api/reports', async (r) => { if (r.request().method() === 'POST' && primera) { primera = false; await r.fetch(); await r.abort('connectionreset'); } else await r.continue(); });
  await page.locator('#rep-send').click(); await page.waitForTimeout(2500); const msg1 = ((await page.locator('#rep-msg').textContent().catch(() => '')) || '').trim();
  await page.locator('#rep-send').click(); await page.waitForTimeout(2500); const n = await filasRep(titulo); const msg2 = ((await page.locator('#rep-msg').textContent().catch(() => '')) || '').trim();
  nota('RES-07', 'Reintento de una escritura tras perder la respuesta (crear reporte)', 'Un solo registro (sin duplicados)', `Reportes con el mismo titulo en BD=${n}; mensaje 1="${msg1}"; mensaje 2="${msg2}"`, n === 1); await ctx.close(); }
// RES-08 Respuesta tardia (doble toque mientras la respuesta tarda 3 s)
{ const { ctx, page, errores } = await nuevo(); await page.goto(`${APP}/detail/${cid}`); await page.locator('app-detail h2').waitFor(); const btn = page.locator('app-detail ion-button').filter({ hasText: /mi lista/i }).first();
  await db.query('DELETE FROM watchlist WHERE user_id=$1', [uid]); let posts = 0; await page.route('**/api/watchlist', async (r) => { if (r.request().method() === 'POST') { posts++; await new Promise((x) => setTimeout(x, 3000)); } await r.continue(); });
  errores.length = 0; await btn.click(); await page.waitForTimeout(300); await btn.click(); await page.waitForTimeout(5000); const ui = ((await btn.textContent()) || '').trim(); const excep = errores.filter((e) => !/409|Failed to load resource/.test(e)).length + errores.filter((e) => /409/.test(e) === false && /Unhandled|HttpErrorResponse/.test(e)).length;
  nota('RES-08', 'Respuesta tardia con doble toque (3 s de retraso)', 'Un solo registro, interfaz consistente y sin excepciones', `Solicitudes POST enviadas=${posts}; filas en BD=${await filasLista()}; boton="${ui}"; errores sin capturar en consola=${errores.length}`, (await filasLista()) === 1 && /✓/.test(ui) && errores.length === 0); await ctx.close(); }
await browser.close(); await db.end();
fs.mkdirSync('evidencias', { recursive: true }); fs.writeFileSync(`evidencias/resiliencia-${tag}.json`, JSON.stringify({ etiqueta: tag, fecha: new Date().toISOString(), escenarios: res }, null, 2));
