/**
 * Practica 12 - Fase 5/6: interceptor de resiliencia (src/app/services/resilience.http.ts).
 * Reintentos con espera progresiva (exponential backoff), tiempo maximo por intento y regla de que solo se repiten
 * las lecturas y las escrituras con Idempotency-Key.
 */
import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { defer, Observable, of, throwError, NEVER } from 'rxjs';
import { esperaProgresiva, esTransitorio, resilienceInterceptor, RESILIENCIA } from '../src/app/services/resilience.http';

const falla = (status: number) => new HttpErrorResponse({ status, url: '/x' });
function ejecutar(req: HttpRequest<any>, respuestas: (() => Observable<any>)[]) {
  // Como HttpClient, el observable es "frio": cada suscripcion (intento) envia de nuevo la solicitud
  let n = 0; const intento = jest.fn(); const next = () => defer(() => { intento(); return respuestas[Math.min(n++, respuestas.length - 1)](); });
  const resultado: { ok?: any; err?: any } = {};
  resilienceInterceptor(req, next as any).subscribe({ next: (v) => (resultado.ok = v), error: (e) => (resultado.err = e) });
  return { next: intento, resultado };
}
const GET = new HttpRequest('GET', '/api/content'); const POST = new HttpRequest('POST', '/api/reports', {}); const POST_ID = new HttpRequest('POST', '/api/reports', {}, { headers: new HttpHeaders({ 'Idempotency-Key': 'clave-0001' }) });
const OK = () => of(new HttpResponse({ status: 200, body: 'ok' }));
beforeEach(() => jest.useFakeTimers()); afterEach(() => jest.useRealTimers());

describe('esTransitorio / esperaProgresiva', () => {
  it.each([[0, true], [408, true], [429, true], [502, true], [503, true], [504, true], [400, false], [401, false], [403, false], [404, false], [409, false], [500, false]])('estado %i -> %s', (s, v) => expect(esTransitorio(falla(s))).toBe(v));
  it('un error que no es HTTP no es transitorio', () => expect(esTransitorio(new Error('x'))).toBe(false));
  it('la espera se duplica en cada intento (400, 800, 1600 ms sin variacion)', () => {
    expect([1, 2, 3].map((n) => esperaProgresiva(n, () => 0))).toEqual([400, 800, 1600]);
  });
  it('la variacion aleatoria agrega hasta 50 % y nunca resta', () => {
    expect(esperaProgresiva(1, () => 1)).toBe(600); expect(esperaProgresiva(2, () => 0.5)).toBe(1000);
  });
});

describe('reintentos', () => {
  it('una lectura que falla dos veces por red y luego responde se recupera sin error visible (3 intentos en total)', async () => {
    const { next, resultado } = ejecutar(GET, [() => throwError(() => falla(0)), () => throwError(() => falla(503)), OK]);
    await jest.advanceTimersByTimeAsync(5000); expect(next).toHaveBeenCalledTimes(3); expect(resultado.ok.body).toBe('ok'); expect(resultado.err).toBeUndefined();
  });
  it('respeta la espera progresiva: el segundo intento no ocurre antes de 400 ms', async () => {
    const { next } = ejecutar(GET, [() => throwError(() => falla(0)), OK]);
    await jest.advanceTimersByTimeAsync(300); expect(next).toHaveBeenCalledTimes(1); await jest.advanceTimersByTimeAsync(400); expect(next).toHaveBeenCalledTimes(2);
  });
  it('se rinde tras el maximo de reintentos y entrega el error original', async () => {
    const { next, resultado } = ejecutar(GET, [() => throwError(() => falla(503))]);
    await jest.advanceTimersByTimeAsync(10000); expect(next).toHaveBeenCalledTimes(RESILIENCIA.reintentos + 1); expect(resultado.err.status).toBe(503);
  });
  it.each([400, 401, 403, 404, 409, 500])('un %i nunca se reintenta', async (s) => {
    const { next, resultado } = ejecutar(GET, [() => throwError(() => falla(s))]);
    await jest.advanceTimersByTimeAsync(10000); expect(next).toHaveBeenCalledTimes(1); expect(resultado.err.status).toBe(s);
  });
  it('una escritura SIN Idempotency-Key no se reintenta (evita duplicados)', async () => {
    const { next, resultado } = ejecutar(POST, [() => throwError(() => falla(0))]);
    await jest.advanceTimersByTimeAsync(10000); expect(next).toHaveBeenCalledTimes(1); expect(resultado.err.status).toBe(0);
  });
  it('una escritura CON Idempotency-Key se reintenta como una lectura', async () => {
    const { next, resultado } = ejecutar(POST_ID, [() => throwError(() => falla(0)), OK]);
    await jest.advanceTimersByTimeAsync(2000); expect(next).toHaveBeenCalledTimes(2); expect(resultado.ok.body).toBe('ok');
  });
});

describe('tiempo maximo (timeout)', () => {
  it('una lectura sin respuesta falla con status 0 y mensaje claro despues del tiempo de lectura y de los reintentos', async () => {
    const { next, resultado } = ejecutar(GET, [() => NEVER]);
    await jest.advanceTimersByTimeAsync((RESILIENCIA.tiempoLecturaMs + 2000) * (RESILIENCIA.reintentos + 1)); 
    expect(next).toHaveBeenCalledTimes(RESILIENCIA.reintentos + 1); expect(resultado.err.status).toBe(0); expect(resultado.err.error.message).toMatch(/no respondio a tiempo/);
  });
  it('una escritura sin respuesta falla una sola vez despues del tiempo de escritura (no se repite)', async () => {
    const { next, resultado } = ejecutar(POST, [() => NEVER]);
    await jest.advanceTimersByTimeAsync(RESILIENCIA.tiempoEscrituraMs - 1); expect(resultado.err).toBeUndefined();
    await jest.advanceTimersByTimeAsync(2); expect(next).toHaveBeenCalledTimes(1); expect(resultado.err.status).toBe(0);
  });
  it('una respuesta que llega a tiempo no dispara el timeout', async () => {
    const { resultado } = ejecutar(GET, [OK]); await jest.advanceTimersByTimeAsync(RESILIENCIA.tiempoLecturaMs * 2); expect(resultado.ok.body).toBe('ok'); expect(resultado.err).toBeUndefined();
  });
});
