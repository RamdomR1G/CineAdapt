/**
 * Pruebas de INTEGRACION automatizadas (Practicas 13 y 14) - app <-> servicio HTTP
 * Se usa el HttpClient real de Angular con un backend simulado (HttpTestingController):
 * se verifican URL, metodo, cuerpo, codigos HTTP y el mensaje que ve el usuario.
 * AUT-04 (cliente: codigos HTTP) | AUT-05 (servidor sin respuesta)
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../src/app/services/auth.service';
import { RegisterPage } from '../src/app/auth/register.page';
import { environment } from '../src/environments/environment';

const API = environment.apiBase;
let http: HttpTestingController; let auth: AuthService; let router: { navigateByUrl: jest.Mock };

beforeEach(() => {
  localStorage.clear();
  router = { navigateByUrl: jest.fn() };
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }] });
  http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService);
});
afterEach(() => http.verify());

/** Deja que las promesas pendientes avancen para que la peticion aparezca en el controlador. */
const tick = () => new Promise(r => setTimeout(r, 0));

describe('AuthService <-> API (integracion HTTP)', () => {
  it('AUT-04a registro correcto: POST /auth/register (201) y luego POST /auth/login (200), sesion guardada', async () => {
    const p = auth.register('Ana', 'ana@correo.com', '12345678');
    const r1 = http.expectOne(`${API}/auth/register`);
    expect(r1.request.method).toBe('POST');
    expect(r1.request.body).toMatchObject({ name: 'Ana', email: 'ana@correo.com', password: '12345678' });
    r1.flush({ message: 'Cuenta creada.', user: { id: 1 } }, { status: 201, statusText: 'Created' });
    await tick();
    const r2 = http.expectOne(`${API}/auth/login`);
    r2.flush({ token: 'jwt-123', user: { id: 1, name: 'Ana', email: 'ana@correo.com', role: 'user' } });
    await p;
    expect(auth.token).toBe('jwt-123');
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('AUT-04b correo duplicado: el servidor responde 409 y NO se inicia sesion ni se llama a /login', async () => {
    const p = auth.register('Ana', 'ana@correo.com', '12345678');
    http.expectOne(`${API}/auth/register`).flush({ message: 'El correo ya esta registrado.' }, { status: 409, statusText: 'Conflict' });
    await expect(p).rejects.toMatchObject({ status: 409 });
    http.expectNone(`${API}/auth/login`);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('AUT-04c credenciales invalidas: login responde 401 y no se guarda token', async () => {
    const p = auth.login('ana@correo.com', 'mala-clave');
    http.expectOne(`${API}/auth/login`).flush({ message: 'Credenciales invalidas.' }, { status: 401, statusText: 'Unauthorized' });
    await expect(p).rejects.toMatchObject({ status: 401 });
    expect(auth.token).toBeNull();
  });
});

describe('RegisterPage + AuthService + HTTP (mensaje al usuario)', () => {
  const crearPagina = () => {
    const page = new RegisterPage(auth, router as any);
    page.name = 'Ana'; page.email = 'ana@correo.com'; page.password = '12345678';
    return page;
  };

  it('AUT-05 servidor sin respuesta (status 0): la app muestra mensaje de conexion y libera el boton', async () => {
    const page = crearPagina(); const s = page.submit();
    http.expectOne(`${API}/auth/register`).error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await s;
    expect(page.error()).toMatch(/Sin conexion con el servidor/);
    expect(page.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('AUT-05b servidor caido (503): la app muestra mensaje de servidor no disponible', async () => {
    const page = crearPagina(); const s = page.submit();
    http.expectOne(`${API}/auth/register`).flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    await s;
    expect(page.error()).toMatch(/servidor no esta disponible/);
  });

  it('AUT-05c correo duplicado (409): la app muestra el mensaje del backend', async () => {
    const page = crearPagina(); const s = page.submit();
    http.expectOne(`${API}/auth/register`).flush({ message: 'El correo ya esta registrado.' }, { status: 409, statusText: 'Conflict' });
    await s;
    expect(page.error()).toBe('El correo ya esta registrado.');
  });

  it('flujo completo: registro + login correctos navegan a /tabs/home', async () => {
    const page = crearPagina(); const s = page.submit();
    http.expectOne(`${API}/auth/register`).flush({ message: 'ok' }, { status: 201, statusText: 'Created' });
    await tick();
    http.expectOne(`${API}/auth/login`).flush({ token: 't', user: { id: 2, name: 'Ana', email: 'ana@correo.com', role: 'user' } });
    await s;
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home');
    expect(page.error()).toBe('');
  });
});
