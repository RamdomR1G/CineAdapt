/**
 * Pruebas UNITARIAS automatizadas (Practicas 13 y 14)
 * Componente critico 1: validacion del registro de usuario (src/app/auth/validators.ts + RegisterPage)
 * AUT-01 entrada valida | AUT-02 vacio/nulo | AUT-03 fuera de rango | excepciones
 */
import { validarRegistro, mensajeErrorRegistro, PASSWORD_MIN } from '../src/app/auth/validators';
import { RegisterPage } from '../src/app/auth/register.page';

describe('validarRegistro (AUT-01..03)', () => {
  it('AUT-01 entrada valida: devuelve null (sin error)', () => {
    expect(validarRegistro('Ana Lopez', 'ana@correo.com', '12345678')).toBeNull();
  });
  it('AUT-01b el limite exacto de 8 caracteres es valido', () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(validarRegistro('Ana', 'ana@correo.com', 'abcdefgh')).toBeNull();
  });
  it('AUT-02 cadenas vacias o solo espacios: error de campos obligatorios', () => {
    expect(validarRegistro('', 'ana@correo.com', '12345678')).toMatch(/obligatorios/);
    expect(validarRegistro('   ', 'ana@correo.com', '12345678')).toMatch(/obligatorios/);
    expect(validarRegistro('Ana', '', '12345678')).toMatch(/obligatorios/);
    expect(validarRegistro('Ana', 'ana@correo.com', '')).toMatch(/obligatorios/);
  });
  it('AUT-02b valores null/undefined no lanzan excepcion', () => {
    expect(() => validarRegistro(null as any, undefined as any, null as any)).not.toThrow();
    expect(validarRegistro(null as any, undefined as any, null as any)).toMatch(/obligatorios/);
  });
  it('AUT-03 contrasena fuera de rango (7 caracteres) se rechaza igual que el backend', () => {
    expect(validarRegistro('Ana', 'ana@correo.com', '1234567')).toMatch(/minimo 8/);
  });
  it('AUT-03b nombre > 100 y correo > 150 caracteres se rechazan', () => {
    expect(validarRegistro('a'.repeat(101), 'ana@correo.com', '12345678')).toMatch(/largo/);
    expect(validarRegistro('Ana', 'a'.repeat(145) + '@b.com', '12345678')).toMatch(/largo/);
  });
  it('AUT-03c correo con formato invalido', () => {
    for (const c of ['ana', 'ana@', '@correo.com', 'ana@correo', 'a na@correo.com'])
      expect(validarRegistro('Ana', c, '12345678')).toMatch(/Correo/);
  });
});

describe('mensajeErrorRegistro (manejo de excepciones)', () => {
  it('servidor sin respuesta (status 0) -> mensaje de conexion', () => {
    expect(mensajeErrorRegistro({ status: 0 })).toMatch(/conexion/i);
  });
  it('usa el mensaje que envia el backend (message o error)', () => {
    expect(mensajeErrorRegistro({ status: 409, error: { message: 'El correo ya esta registrado.' } })).toBe('El correo ya esta registrado.');
    expect(mensajeErrorRegistro({ status: 400, error: { error: 'Datos invalidos' } })).toBe('Datos invalidos');
  });
  it('error 5xx sin cuerpo -> mensaje generico del servidor', () => {
    expect(mensajeErrorRegistro({ status: 503 })).toMatch(/servidor/i);
  });
  it('excepcion desconocida (null) -> mensaje por defecto, sin lanzar', () => {
    expect(mensajeErrorRegistro(null)).toBe('No se pudo crear la cuenta.');
  });
});

describe('RegisterPage.submit usa el validador (defecto FE-01)', () => {
  const crear = () => {
    const auth: any = { register: jest.fn(async () => {}) };
    const router: any = { navigateByUrl: jest.fn() };
    return { page: new RegisterPage(auth, router), auth, router };
  };
  it('contrasena de 7 caracteres NO se envia al servidor', async () => {
    const { page, auth } = crear();
    page.name = 'Ana'; page.email = 'ana@correo.com'; page.password = '1234567';
    await page.submit();
    expect(auth.register).not.toHaveBeenCalled();
    expect(page.error()).toMatch(/minimo 8/);
  });
  it('sin respuesta del servidor muestra mensaje de conexion y libera el boton', async () => {
    const auth: any = { register: jest.fn(async () => { throw { status: 0, error: {} }; }) };
    const page = new RegisterPage(auth, { navigateByUrl: jest.fn() } as any);
    page.name = 'Ana'; page.email = 'ana@correo.com'; page.password = '12345678';
    await page.submit();
    expect(page.error()).toMatch(/conexion/i);
    expect(page.busy()).toBe(false);
  });
});
