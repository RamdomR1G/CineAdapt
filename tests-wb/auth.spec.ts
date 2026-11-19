import { AuthService } from '../src/app/services/auth.service';

function crear(post: jest.Mock) {
  const http: any = { post }; const router: any = { navigateByUrl: jest.fn() };
  return { svc: new AuthService(http, router), router };
}
const resp = { token: 'tok', user: { id: 7, name: 'Ana', email: 'a@b.com', role: 'agent' } };
beforeEach(() => localStorage.clear());

describe('AuthService', () => {
  it('login guarda token y usuario y expone el rol', async () => {
    const { svc } = crear(jest.fn().mockReturnValue({ subscribe: (o: any) => { o.next(resp); o.complete(); } }));
    await svc.login('a@b.com', 'x'); expect(svc.token).toBe('tok'); expect(svc.user()!.isAgent).toBe(true); expect(svc.isLoggedIn()).toBe(true);
    expect(svc.user()!.roleLabel).toBe('Agente de atencion');
  });
  it('EXCEPCION: login con error del servidor no deja sesion iniciada', async () => {
    const { svc } = crear(jest.fn().mockReturnValue({ subscribe: (o: any) => o.error({ status: 401 }) }));
    await expect(svc.login('a@b.com', 'x')).rejects.toBeDefined(); expect(svc.isLoggedIn()).toBe(false);
  });
  it('register crea la cuenta y luego inicia sesion (2 solicitudes)', async () => {
    const post = jest.fn().mockReturnValue({ subscribe: (o: any) => { o.next(resp); o.complete(); } });
    const { svc } = crear(post); await svc.register('Ana', 'a@b.com', '12345678');
    expect(post).toHaveBeenCalledTimes(2); expect(post.mock.calls[0][1]).toMatchObject({ name: 'Ana', email: 'a@b.com' });
  });
  it('logout borra la sesion y redirige a /login', async () => {
    const { svc, router } = crear(jest.fn().mockReturnValue({ subscribe: (o: any) => { o.next(resp); o.complete(); } }));
    await svc.login('a@b.com', 'x'); svc.logout();
    expect(svc.token).toBeNull(); expect(svc.user()).toBeNull(); expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
  it('EXCEPCION: usuario guardado con JSON corrupto -> sesion vacia, sin fallar', () => {
    localStorage.setItem('cineadapt_user', '{no es json'); const { svc } = crear(jest.fn()); expect(svc.user()).toBeNull();
  });
  it('EXCEPCION: localStorage bloqueado -> token nulo', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const { svc } = crear(jest.fn()); expect(svc.token).toBeNull(); jest.restoreAllMocks();
  });
  it('un rol desconocido se trata como usuario normal (principio de minimo privilegio)', async () => {
    const r = { ...resp, user: { ...resp.user, role: 'superadmin' } };
    const { svc } = crear(jest.fn().mockReturnValue({ subscribe: (o: any) => { o.next(r); o.complete(); } }));
    await svc.login('a@b.com', 'x'); expect(svc.user()!.role).toBe('user'); expect(svc.user()!.isAdmin).toBe(false);
  });
});
