/**
 * WB-A  Metodo de VALIDACION: RegisterPage.submit()  (src/app/auth/register.page.ts)
 * Condiciones:  C1 = !name   C2 = !email   C3 = password.length < 6
 *               C4 = catch   C5 = e?.error?.error   C6 = e?.error?.message
 * Complejidad ciclomatica V(G) = 6 decisiones + 1 = 7  ->  7 caminos independientes (CP1..CP7)
 */
import { RegisterPage } from '../src/app/auth/register.page';

function crear(registerImpl: (...a: any[]) => Promise<void> = async () => {}) {
  const auth: any = { register: jest.fn(registerImpl) };
  const router: any = { navigateByUrl: jest.fn() };
  const page = new RegisterPage(auth, router);
  return { page, auth, router };
}
const llenar = (p: RegisterPage, name: string, email: string, password: string) => { p.name = name; p.email = email; p.password = password; };

describe('RegisterPage.submit - caminos independientes', () => {
  it('CP1: nombre vacio (C1 verdadera) -> muestra error y NO llama al servidor', async () => {
    const { page, auth } = crear(); llenar(page, '', 'a@b.com', '12345678');
    await page.submit();
    expect(page.error()).toMatch(/obligatorios/);
    expect(auth.register).not.toHaveBeenCalled();
    expect(page.busy()).toBe(false);
  });
  it('CP2: nombre con valor y correo vacio (C1 falsa, C2 verdadera)', async () => {
    const { page, auth } = crear(); llenar(page, 'Ana', '', '12345678');
    await page.submit();
    expect(page.error()).not.toBe(''); expect(auth.register).not.toHaveBeenCalled();
  });
  it('CP3: contrasena corta (C1 y C2 falsas, C3 verdadera)', async () => {
    const { page, auth } = crear(); llenar(page, 'Ana', 'a@b.com', '12345');
    await page.submit();
    expect(page.error()).not.toBe(''); expect(auth.register).not.toHaveBeenCalled();
  });
  it('CP4: datos validos -> registra, navega a /tabs/home y apaga busy (camino feliz + finally)', async () => {
    const { page, auth, router } = crear(); llenar(page, ' Ana ', ' a@b.com ', '12345678');
    await page.submit();
    expect(auth.register).toHaveBeenCalledWith('Ana', 'a@b.com', '12345678');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/home');
    expect(page.error()).toBe(''); expect(page.busy()).toBe(false);
  });
  it('CP5: el servidor responde con error.error (C4, C5 verdadera)', async () => {
    const { page, router } = crear(async () => { throw { error: { error: 'Correo duplicado' } }; }); llenar(page, 'Ana', 'a@b.com', '12345678');
    await page.submit();
    expect(page.error()).toBe('Correo duplicado'); expect(router.navigateByUrl).not.toHaveBeenCalled(); expect(page.busy()).toBe(false);
  });
  it('CP6: el servidor responde con error.message (C5 falsa, C6 verdadera) - formato real del backend', async () => {
    const { page } = crear(async () => { throw { error: { message: 'El correo ya esta registrado.' } }; }); llenar(page, 'Ana', 'a@b.com', '12345678');
    await page.submit();
    expect(page.error()).toBe('El correo ya esta registrado.');
  });
  it('CP7: sin respuesta del servidor (C5 y C6 falsas) -> mensaje generico', async () => {
    const { page } = crear(async () => { throw new Error('Network down'); }); llenar(page, 'Ana', 'a@b.com', '12345678');
    await page.submit();
    expect(page.error()).toBe('No se pudo crear la cuenta.'); expect(page.busy()).toBe(false);
  });
});

describe('RegisterPage.submit - valores limite de la contrasena (Boundary Value Analysis)', () => {
  it.each([[0, false], [6, false], [7, false], [8, true], [100, true]])('longitud %i -> acepta=%s', async (n, acepta) => {
    const { page, auth } = crear(); llenar(page, 'Ana', 'a@b.com', 'x'.repeat(n));
    await page.submit();
    expect(auth.register.mock.calls.length).toBe(acepta ? 1 : 0);
  });
});

describe('RegisterPage.submit - defectos P11 corregidos en P13/14 (pruebas de regresion)', () => {
  it('DEF-FE-01 corregido: rechaza un nombre formado solo por espacios', async () => {
    const { page, auth } = crear(); llenar(page, '   ', 'a@b.com', '12345678');
    await page.submit();
    expect(auth.register).not.toHaveBeenCalled(); expect(page.error()).not.toBe('');
  });
  it('DEF-FE-02 corregido: contrasenas de 7 caracteres se rechazan en el cliente igual que en el backend', async () => {
    const { page, auth } = crear(); llenar(page, 'Ana', 'a@b.com', '1234567');
    await page.submit();
    expect(auth.register).not.toHaveBeenCalled(); expect(page.error()).toMatch(/minimo 8/);
  });
  it('DEF-FE-03 corregido: valida el formato del correo en el cliente', async () => {
    const { page, auth } = crear(); llenar(page, 'Ana', 'esto-no-es-correo', '12345678');
    await page.submit();
    expect(auth.register).not.toHaveBeenCalled();
  });
});
