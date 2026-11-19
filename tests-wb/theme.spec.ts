/**
 * WB-B  Metodo de PROCESAMIENTO: ThemeService.themeForHour() y update()  (src/app/services/theme.service.ts)
 * themeForHour: condiciones  A = hour>=6  B = hour<18  C = hour>=18  D = hour<22      V(G) = 4 + 1 = 5
 * update:       condiciones  E = mode !== 'auto'  F = this.zone ?? (zona del dispositivo)   V(G) = 3
 */
import { ThemeService } from '../src/app/services/theme.service';

const time: any = { hourIn: jest.fn() };
const geo: any = { readLocation: jest.fn() };
let svc: ThemeService;

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear(); document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#2563eb">';
  time.hourIn.mockReset(); geo.readLocation.mockReset();
  delete (document as any).startViewTransition; delete (window as any).matchMedia;
  svc = new ThemeService(time, geo);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

describe('themeForHour - cobertura de condiciones y valores limite', () => {
  it.each([
    [0, 'night'], [3, 'night'], [5, 'night'],          // A falsa
    [6, 'day'], [12, 'day'], [17, 'day'],              // A y B verdaderas (limites 6 y 17)
    [18, 'evening'], [21, 'evening'],                  // B falsa, C y D verdaderas (limites 18 y 21)
    [22, 'night'], [23, 'night'],                      // D falsa (limite 22)
  ])('hora %i -> %s', (h, esperado) => { expect(svc.themeForHour(h as number)).toBe(esperado); });
});

describe('update() - modo manual y automatico', () => {
  it('E verdadera: el modo manual ignora la hora', () => {
    svc.setMode('day');
    expect(document.documentElement.getAttribute('data-theme')).toBe('day');
    expect(time.hourIn).not.toHaveBeenCalled();
  });
  it('E falsa y zona aun desconocida: usa la zona del dispositivo', () => {
    time.hourIn.mockReturnValue(23); svc.update();
    expect(time.hourIn).toHaveBeenCalledWith(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(svc.active()).toBe('night');
  });
  it('E falsa y zona del GPS conocida: usa esa zona', async () => {
    geo.readLocation.mockResolvedValue({ timeZone: 'Asia/Tokyo' }); time.hourIn.mockReturnValue(7);
    await svc.refresh();
    expect(time.hourIn).toHaveBeenLastCalledWith('Asia/Tokyo'); expect(svc.active()).toBe('day');
  });
  it('refresh() en modo manual no consulta el GPS', async () => {
    svc.mode.set('night'); await svc.refresh();
    expect(geo.readLocation).not.toHaveBeenCalled();
  });
});

describe('apply() - transicion y color de la barra', () => {
  it('sin matchMedia ni startViewTransition aplica el cambio directamente y actualiza theme-color', () => {
    svc.apply('night');
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#05070d');
  });
  it('con startViewTransition y sin reduccion de movimiento usa la transicion', () => {
    const vt = jest.fn((cb: () => void) => cb()); (document as any).startViewTransition = vt;
    (window as any).matchMedia = () => ({ matches: false });
    svc.apply('day');
    expect(vt).toHaveBeenCalledTimes(1); expect(svc.active()).toBe('day');
  });
  it('con prefers-reduced-motion NO usa la transicion (accesibilidad)', () => {
    const vt = jest.fn(); (document as any).startViewTransition = vt;
    (window as any).matchMedia = () => ({ matches: true });
    svc.apply('day');
    expect(vt).not.toHaveBeenCalled(); expect(document.documentElement.getAttribute('data-theme')).toBe('day');
  });
  it('si el tema ya esta aplicado no repite el cambio (retorno anticipado)', () => {
    svc.apply('night'); const vt = jest.fn(); (document as any).startViewTransition = vt; (window as any).matchMedia = () => ({ matches: false });
    svc.apply('night'); expect(vt).not.toHaveBeenCalled();
  });
});

describe('persistencia del modo y excepciones de localStorage', () => {
  it('lee un modo guardado valido', () => { localStorage.setItem('cineadapt_theme_mode', 'evening'); expect(new ThemeService(time, geo).mode()).toBe('evening'); });
  it('ignora un valor guardado invalido -> auto', () => { localStorage.setItem('cineadapt_theme_mode', 'rojo'); expect(new ThemeService(time, geo).mode()).toBe('auto'); });
  it('EXCEPCION: localStorage no disponible al leer -> auto, sin fallar', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(new ThemeService(time, geo).mode()).toBe('auto');
  });
  it('EXCEPCION: localStorage no disponible al guardar -> el modo cambia igualmente', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('lleno'); });
    geo.readLocation.mockResolvedValue({ timeZone: 'UTC' });
    expect(() => svc.setMode('night')).not.toThrow(); expect(svc.mode()).toBe('night');
  });
});

describe('init() - revision periodica y al volver a primer plano', () => {
  it('revisa cada 60 s y crea un solo temporizador aunque se llame dos veces', () => {
    geo.readLocation.mockResolvedValue({ timeZone: 'UTC' }); time.hourIn.mockReturnValue(12);
    svc.init(); svc.init(); time.hourIn.mockClear();
    jest.advanceTimersByTime(60_000);
    expect(time.hourIn).toHaveBeenCalledTimes(1);
  });
  it('al volver a visible vuelve a calcular; en segundo plano no', async () => {
    geo.readLocation.mockResolvedValue({ timeZone: 'UTC' }); time.hourIn.mockReturnValue(12);
    svc.init(); geo.readLocation.mockClear();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    expect(geo.readLocation).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    expect(geo.readLocation).toHaveBeenCalled();
  });
});
