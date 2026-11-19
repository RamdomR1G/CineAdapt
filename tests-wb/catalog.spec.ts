/**
 * WB-C  Metodo de COMUNICACION: CatalogStore.load() y toggleList()  (src/app/catalog/catalog.store.ts)
 * Practica 12: el store ahora pagina el catalogo y toggleList es idempotente (409/404 = exito), reconsulta la lista real
 * ante un error de red (respuesta perdida) e ignora el doble toque. Corrige DEF-FE-04 / FE-02 / FE-03 de la Practica 11.
 */
import { CatalogStore, PAGINA } from '../src/app/catalog/catalog.store';
import { Movie } from '../src/app/models/movie';

const peli = (id: number, genre = 'Accion') => new Movie(id, 'T' + id, '', 'movie', genre, 2020, null, null);
const pagina = (items: Movie[], total = items.length) => ({ items, total });
function crear(api: Record<string, jest.Mock> = {}) {
  const apiMock: any = {
    getCatalogPage: jest.fn().mockResolvedValue(pagina([peli(1), peli(2, ''), peli(3, 'Drama')])),
    getWatchlist: jest.fn().mockResolvedValue([peli(2)]), getMovie: jest.fn().mockResolvedValue(null),
    addToWatchlist: jest.fn().mockResolvedValue({}), removeFromWatchlist: jest.fn().mockResolvedValue({}), ...api,
  };
  return { store: new CatalogStore(apiMock), api: apiMock };
}

describe('load()', () => {
  it('camino exitoso: carga la primera pagina y la lista del usuario, loading vuelve a false', async () => {
    const { store, api } = crear(); await store.load();
    expect(api.getCatalogPage).toHaveBeenCalledWith(PAGINA, 0);
    expect(store.movies().length).toBe(3); expect(store.total()).toBe(3); expect(store.inList(2)).toBe(true); expect(store.loading()).toBe(false); expect(store.error()).toBe('');
  });
  it('EXCEPCION: falla el catalogo -> mensaje de error y loading=false', async () => {
    const { store } = crear({ getCatalogPage: jest.fn().mockRejectedValue(new Error('offline')) }); await store.load();
    expect(store.error()).toMatch(/No se pudo cargar/); expect(store.loading()).toBe(false);
  });
  it('falla solo la lista del usuario -> el catalogo se muestra con lista vacia', async () => {
    const { store } = crear({ getWatchlist: jest.fn().mockRejectedValue(new Error('401')) }); await store.load();
    expect(store.movies().length).toBe(3); expect(store.watchlistIds().size).toBe(0); expect(store.error()).toBe('');
  });
});

describe('paginacion: loadMore()', () => {
  it('hasMore es verdadero mientras haya menos titulos cargados que el total', async () => {
    const { store } = crear({ getCatalogPage: jest.fn().mockResolvedValue(pagina([peli(1), peli(2)], 5)) }); await store.load();
    expect(store.hasMore).toBe(true);
  });
  it('pide la pagina siguiente con el desplazamiento correcto y la agrega sin duplicar', async () => {
    const getCatalogPage = jest.fn().mockResolvedValueOnce(pagina([peli(1), peli(2)], 4)).mockResolvedValueOnce(pagina([peli(2), peli(3), peli(4)], 4));
    const { store } = crear({ getCatalogPage }); await store.load(); await store.loadMore();
    expect(getCatalogPage).toHaveBeenLastCalledWith(PAGINA, 2); expect(store.movies().map((m) => m.id)).toEqual([1, 2, 3, 4]); expect(store.hasMore).toBe(false);
  });
  it('no hace nada si ya se cargo todo el catalogo', async () => {
    const { store, api } = crear(); await store.load(); await store.loadMore(); expect(api.getCatalogPage).toHaveBeenCalledTimes(1);
  });
  it('una falla de red al cargar mas conserva lo ya cargado y permite reintentar', async () => {
    const getCatalogPage = jest.fn().mockResolvedValueOnce(pagina([peli(1)], 3)).mockRejectedValueOnce({ status: 0 }).mockResolvedValueOnce(pagina([peli(2), peli(3)], 3));
    const { store } = crear({ getCatalogPage }); await store.load(); await store.loadMore();
    expect(store.movies().length).toBe(1); expect(store.loadingMore()).toBe(false); await store.loadMore(); expect(store.movies().length).toBe(3);
  });
  it('no lanza dos cargas simultaneas', async () => {
    let fin: any; const getCatalogPage = jest.fn().mockResolvedValueOnce(pagina([peli(1)], 3)).mockReturnValueOnce(new Promise((r) => (fin = r)));
    const { store } = crear({ getCatalogPage }); await store.load(); const a = store.loadMore(); const b = store.loadMore(); fin(pagina([peli(2), peli(3)], 3)); await Promise.all([a, b]);
    expect(getCatalogPage).toHaveBeenCalledTimes(2);
  });
});

describe('toggleList()', () => {
  it('agrega cuando el titulo no esta en la lista y lo muestra en Mi lista', async () => {
    const { store, api } = crear(); await store.load();
    expect(await store.toggleList(1)).toBe(true); expect(api.addToWatchlist).toHaveBeenCalledWith(1); expect(store.inList(1)).toBe(true); expect(store.myList.map((m) => m.id)).toContain(1);
  });
  it('quita cuando el titulo ya esta en la lista', async () => {
    const { store, api } = crear(); await store.load();
    expect(await store.toggleList(2)).toBe(true); expect(api.removeFromWatchlist).toHaveBeenCalledWith(2); expect(store.inList(2)).toBe(false); expect(store.myList).toHaveLength(0);
  });
  it('al agregar un titulo que no esta en las paginas cargadas lo pide al servidor', async () => {
    const { store, api } = crear({ getMovie: jest.fn().mockResolvedValue(peli(99)) }); await store.load(); await store.toggleList(99);
    expect(api.getMovie).toHaveBeenCalledWith(99); expect(store.myList.map((m) => m.id)).toContain(99);
  });
  it('EXCEPCION sin cambio en el servidor: la red falla, se reconsulta la lista y el estado NO cambia (sin exito falso)', async () => {
    const { store, api } = crear({ addToWatchlist: jest.fn().mockRejectedValue({ status: 0 }) }); await store.load();
    expect(await store.toggleList(1)).toBe(false); expect(store.inList(1)).toBe(false); expect(api.getWatchlist).toHaveBeenCalledTimes(2);
  });
  it('RESPUESTA PERDIDA (FE-03): el servidor guardo el titulo; al reconsultar la lista la pantalla lo refleja y se informa exito', async () => {
    const getWatchlist = jest.fn().mockResolvedValueOnce([peli(2)]).mockResolvedValueOnce([peli(2), peli(1)]);
    const { store } = crear({ getWatchlist, addToWatchlist: jest.fn().mockRejectedValue({ status: 0 }) }); await store.load();
    expect(await store.toggleList(1)).toBe(true); expect(store.inList(1)).toBe(true);
  });
  it('409 al agregar (ya estaba en la lista) se trata como exito idempotente', async () => {
    const { store } = crear({ addToWatchlist: jest.fn().mockRejectedValue({ status: 409 }) }); await store.load();
    expect(await store.toggleList(1)).toBe(true); expect(store.inList(1)).toBe(true);
  });
  it('404 al quitar (ya no estaba) se trata como exito idempotente', async () => {
    const { store } = crear({ removeFromWatchlist: jest.fn().mockRejectedValue({ status: 404 }) }); await store.load();
    expect(await store.toggleList(2)).toBe(true); expect(store.inList(2)).toBe(false);
  });
  it('un 403 no es idempotente: se informa el fallo (false) y no se cambia el estado', async () => {
    const { store } = crear({ addToWatchlist: jest.fn().mockRejectedValue({ status: 403 }) }); await store.load();
    expect(await store.toggleList(1)).toBe(false); expect(store.inList(1)).toBe(false);
  });
  it('RES-08: un doble toque mientras la solicitud esta en curso envia una sola solicitud', async () => {
    let fin: any; const addToWatchlist = jest.fn().mockReturnValue(new Promise((r) => (fin = r)));
    const { store } = crear({ addToWatchlist }); await store.load(); const a = store.toggleList(1); const b = store.toggleList(1); fin({}); await Promise.all([a, b]);
    expect(addToWatchlist).toHaveBeenCalledTimes(1); expect(store.inList(1)).toBe(true);
  });
  it('despues de terminar se puede volver a usar el mismo titulo (se libera el bloqueo aunque falle)', async () => {
    const { store, api } = crear({ addToWatchlist: jest.fn().mockRejectedValueOnce({ status: 0 }).mockResolvedValue({}) }); await store.load();
    await store.toggleList(1); await store.toggleList(1); expect(api.addToWatchlist).toHaveBeenCalledTimes(2); expect(store.inList(1)).toBe(true);
  });
});

describe('consultas derivadas', () => {
  it('byGenre agrupa y asigna "General" cuando no hay genero', async () => {
    const { store } = crear(); await store.load();
    expect(store.byGenre().map((g) => g.genre).sort()).toEqual(['Accion', 'Drama', 'General']);
  });
  it('myList devuelve los titulos de la lista del usuario aunque no esten en las paginas cargadas', async () => {
    const { store } = crear({ getWatchlist: jest.fn().mockResolvedValue([peli(2), peli(500)]) }); await store.load(); expect(store.myList.map((m) => m.id)).toEqual([2, 500]);
  });
});
