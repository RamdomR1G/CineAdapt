/**
 * Practica 11 - Fase 5E: prueba de interrupcion de conectividad (NET-05 y NET-06) sobre la PWA real.
 * Requiere: npm i -D playwright ; backend en BACKEND (default http://localhost:4100) ; PWA servida en APP (default http://localhost:4300)
 * La PWA debe estar compilada apuntando a BACKEND. Ejecutar: node e2e-wb/interrupcion.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import pg from 'pg';
const APP = process.env.APP || 'http://localhost:4300', API = (process.env.BACKEND || 'http://localhost:4100') + '/api';
const EMAIL = process.env.E2E_EMAIL || 'interrupcion@wb.test', PASS = 'clave1234';
const resultados = []; const nota = (id, descripcion, resultado, ok) => { resultados.push({ id, descripcion, resultado, ok }); console.log(ok ? 'OK ' : 'DEF', id, '-', descripcion, '->', resultado); };

const db = new pg.Client({ host: process.env.E2E_PGHOST || '/tmp', port: Number(process.env.E2E_PGPORT || 5433), user: 'postgres', database: process.env.E2E_PGDB || 'cineadapt_wb' });
await db.connect();
await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Prueba Interrupcion', email: EMAIL, password: PASS }) });
const login = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASS }) })).json();
const uid = login.user.id; const cid = (await db.query("SELECT id FROM content WHERE status='published' ORDER BY id LIMIT 1")).rows[0].id;
await db.query('DELETE FROM watchlist WHERE user_id=$1', [uid]);
const filas = async () => (await db.query('SELECT count(*)::int n FROM watchlist WHERE user_id=$1 AND content_id=$2', [uid, cid])).rows[0].n;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ serviceWorkers: 'block' });
await ctx.addInitScript(([t, u]) => { localStorage.setItem('cineadapt_token', t); localStorage.setItem('cineadapt_user', JSON.stringify(u)); }, [login.token, login.user]);
const page = await ctx.newPage(); const errores = []; page.on('pageerror', (e) => errores.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
const boton = () => page.locator('app-detail ion-button').filter({ hasText: /mi lista/i });
const textoBoton = async () => ((await boton().first().textContent()) || '').trim();
await page.goto(`${APP}/detail/${cid}`); await page.locator('app-detail h2').waitFor();

// 1. Linea base: con conexion la operacion funciona y queda persistida
await boton().first().click(); await page.waitForFunction(() => /✓/.test(document.body.innerText)); 
nota('NET-05a', 'Con conexion: agregar a Mi lista', `UI="${await textoBoton()}", filas en BD=${await filas()}`, (await filas()) === 1);
await boton().first().click(); await page.waitForFunction(() => !/✓/.test(document.body.innerText));

// 2. Sin conexion: la operacion falla; la UI no debe mostrar un exito falso ni dejar excepciones sin controlar
errores.length = 0; await ctx.setOffline(true);
await boton().first().click(); await page.waitForTimeout(800);
const uiOffline = await textoBoton(); const hayMensaje = await page.getByText(/sin conexi|no se pudo|error|intenta/i).count();
nota('NET-05b', 'Sin conexion: no se muestra un exito falso', `UI="${uiOffline}", filas en BD=${await filas()}`, !/✓/.test(uiOffline) && (await filas()) === 0);
nota('NET-05c', 'Sin conexion: la app informa al usuario del error', hayMensaje ? 'Muestra mensaje' : `Sin mensaje visible; excepciones sin capturar en consola: ${errores.length} (${errores[0] || '-'})`, hayMensaje > 0);

// 3. Recuperacion: al volver la red el usuario repite y no se duplican registros
await ctx.setOffline(false); await boton().first().click(); await page.waitForFunction(() => /✓/.test(document.body.innerText));
nota('NET-06a', 'Recuperacion: al volver la red la operacion se completa', `UI="${await textoBoton()}", filas en BD=${await filas()}`, (await filas()) === 1);
await boton().first().click(); await page.waitForFunction(() => !/✓/.test(document.body.innerText));

// 4. Respuesta perdida: la solicitud llega al servidor (se guarda) pero la respuesta nunca llega al cliente
await page.route('**/api/watchlist', async (route) => { if (route.request().method() === 'POST') { await route.fetch(); await route.abort('connectionreset'); } else await route.continue(); });
errores.length = 0; await boton().first().click(); await page.waitForTimeout(800);
const uiPerdida = await textoBoton(); const enServidor = await filas();
nota('NET-06b', 'Respuesta perdida: servidor guardo el registro pero la UI lo ignora (estado inconsistente)', `UI="${uiPerdida}", filas en BD=${enServidor}`, !( /\+ Mi lista/.test(uiPerdida) && enServidor === 1));
await page.unroute('**/api/watchlist');
await boton().first().click(); await page.waitForTimeout(800);       // reintento manual: el servidor responde 409 (ya existe)
nota('NET-06c', 'Reintento tras respuesta perdida: el servidor impide el duplicado (UNIQUE) pero la UI sigue sin reflejar el estado real', `UI="${await textoBoton()}", filas en BD=${await filas()}`, (await filas()) === 1 && /✓/.test(await textoBoton()));
await page.reload(); await page.locator('app-detail h2').waitFor(); await page.waitForTimeout(500);
nota('NET-06d', 'Tras recargar la pantalla el estado vuelve a ser consistente', `UI="${await textoBoton()}", filas en BD=${await filas()}`, /✓/.test(await textoBoton()) && (await filas()) === 1);

// 5. Inicio de sesion sin conexion (pantalla de login)
const ctx2 = await browser.newContext({ serviceWorkers: 'block' }); const p2 = await ctx2.newPage(); await p2.goto(`${APP}/login`);
await p2.getByLabel('Correo').fill(EMAIL); await p2.getByLabel('Contrasena').fill(PASS); await ctx2.setOffline(true);
await p2.getByRole('button', { name: 'Entrar' }).click(); await p2.waitForTimeout(800);
const msg = await p2.locator('.err').innerText().catch(() => '');
nota('NET-05d', 'Inicio de sesion sin conexion muestra un mensaje claro', `Mensaje: "${msg}"`, /No se pudo conectar/.test(msg));

// 6. Carga del catalogo sin conexion: mensaje, boton Reintentar y recuperacion
const ctx3 = await browser.newContext({ serviceWorkers: 'block' }); await ctx3.addInitScript(([t, u]) => { localStorage.setItem('cineadapt_token', t); localStorage.setItem('cineadapt_user', JSON.stringify(u)); }, [login.token, login.user]);
const p3 = await ctx3.newPage(); await p3.route('**/api/content**', (r) => r.abort('internetdisconnected')); await p3.goto(`${APP}/tabs/home`); await p3.waitForTimeout(1200);
const hayError = await p3.getByText(/No se pudo cargar el catalogo/).count(); const hayBoton = await p3.locator('ion-button', { hasText: /Reintentar/ }).count();
nota('NET-05e', 'Catalogo sin conexion: mensaje de error y boton Reintentar', `mensaje=${hayError}, boton Reintentar=${hayBoton}`, hayError > 0 && hayBoton > 0);
await p3.unroute('**/api/content**'); await p3.locator('ion-button', { hasText: /Reintentar/ }).first().click(); await p3.waitForTimeout(1200);
const tarjetas = await p3.locator('app-movie-card').count();
nota('NET-06e', 'Al volver la conexion, Reintentar recupera el catalogo', `tarjetas visibles=${tarjetas}`, tarjetas > 0);

fs.mkdirSync('evidencias', { recursive: true }); fs.writeFileSync('evidencias/interrupcion.json', JSON.stringify(resultados, null, 2));
await browser.close(); await db.end();
