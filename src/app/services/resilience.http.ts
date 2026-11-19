import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timeout, timer, TimeoutError, catchError } from 'rxjs';

/** Practica 12: parametros de resiliencia (tiempos en ms). Se exportan para poder ajustarlos y probarlos. */
export const RESILIENCIA = { reintentos: 2, base: 400, tiempoLecturaMs: 8000, tiempoEscrituraMs: 20000 };

/** Errores que tiene sentido reintentar: sin red o tiempo agotado (0), solicitud lenta o saturacion/caida temporal del servidor. */
export const esTransitorio = (e: unknown): boolean => e instanceof HttpErrorResponse && [0, 408, 429, 502, 503, 504].includes(e.status);

/** Espera progresiva (exponential backoff) con variacion aleatoria: 400 ms, 800 ms, 1600 ms... + hasta 50 % de jitter. */
export const esperaProgresiva = (intento: number, aleatorio: () => number = Math.random): number =>
  RESILIENCIA.base * 2 ** (intento - 1) * (1 + aleatorio() * 0.5);

/**
 * Tiempo maximo por intento y reintentos con espera progresiva.
 * - Las lecturas (GET/HEAD) siempre se pueden repetir.
 * - Las escrituras solo se repiten si llevan la cabecera Idempotency-Key (el servidor evita duplicados).
 * - Los errores del cliente (400, 401, 403, 404, 409...) nunca se reintentan.
 */
export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
  const lectura = req.method === 'GET' || req.method === 'HEAD';
  const reintentable = lectura || req.headers.has('Idempotency-Key');
  return next(req).pipe(
    timeout({ each: lectura ? RESILIENCIA.tiempoLecturaMs : RESILIENCIA.tiempoEscrituraMs }),
    catchError((e) => e instanceof TimeoutError
      ? throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Timeout', url: req.url, error: { message: 'El servidor no respondio a tiempo.' } }))
      : throwError(() => e)),
    retry({ count: reintentable ? RESILIENCIA.reintentos : 0, delay: (e, n) => (esTransitorio(e) ? timer(esperaProgresiva(n)) : throwError(() => e)) }),
  );
};
