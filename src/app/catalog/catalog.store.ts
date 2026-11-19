import { Injectable, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Movie } from '../models/movie';

/** Tamano de pagina del catalogo (Practica 12: antes se descargaba el catalogo completo). */
export const PAGINA = 30;

/** Cache en memoria del catalogo (paginado) y de la lista del usuario. */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  readonly movies = signal<Movie[]>([]);
  readonly total = signal(0);
  readonly watchlistIds = signal<Set<number>>(new Set());
  readonly watchlistMovies = signal<Movie[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  private pendientes = new Set<number>();

  constructor(private api: ApiService) {}

  get hasMore(): boolean { return this.movies().length < this.total(); }

  async load() {
    this.loading.set(true); this.error.set('');
    try {
      const p = await this.api.getCatalogPage(PAGINA, 0);
      this.movies.set(p.items); this.total.set(p.total);
      await this.syncWatchlist();
    } catch { this.error.set('No se pudo cargar el catalogo. Revisa tu conexion o el servidor.'); }
    finally { this.loading.set(false); }
  }
  /** Siguiente pagina del catalogo (desplazamiento infinito). */
  async loadMore() {
    if (this.loadingMore() || !this.hasMore) return;
    this.loadingMore.set(true);
    try {
      const p = await this.api.getCatalogPage(PAGINA, this.movies().length);
      this.total.set(p.total);
      const ya = new Set(this.movies().map((m) => m.id));
      this.movies.set([...this.movies(), ...p.items.filter((m) => !ya.has(m.id))]);
    } catch { /* el usuario puede volver a desplazarse; no se pierde lo ya cargado */ }
    finally { this.loadingMore.set(false); }
  }
  /** Vuelve a leer la lista del usuario del servidor (fuente de la verdad). */
  async syncWatchlist() {
    const wl = await this.api.getWatchlist().catch(() => null);
    if (wl) { this.watchlistMovies.set(wl); this.watchlistIds.set(new Set(wl.map((m) => m.id))); }
  }
  inList(id: number) { return this.watchlistIds().has(id); }

  /**
   * Agrega o quita un titulo de la lista. Es idempotente: si el servidor ya tenia el cambio (409 al agregar, 404 al quitar,
   * por ejemplo porque la respuesta anterior se perdio) se considera exitoso. Ante un error de red se consulta la lista real
   * para que la pantalla refleje el estado verdadero. Devuelve false si el cambio no se pudo confirmar.
   */
  async toggleList(id: number): Promise<boolean> {
    if (this.pendientes.has(id)) return true;               // ignora el doble toque mientras hay una solicitud en curso
    this.pendientes.add(id);
    const agregar = !this.inList(id);
    try {
      try { if (agregar) await this.api.addToWatchlist(id); else await this.api.removeFromWatchlist(id); }
      catch (e: any) {
        const yaAplicado = agregar ? e?.status === 409 : e?.status === 404;
        if (!yaAplicado) {
          await this.syncWatchlist();                        // respuesta perdida: el servidor pudo haber aplicado el cambio
          return this.inList(id) === agregar;
        }
      }
      const s = new Set(this.watchlistIds()); const l = this.watchlistMovies();
      if (agregar) {
        s.add(id);
        if (!l.some((m) => m.id === id)) { const m = this.movies().find((x) => x.id === id) ?? (await this.api.getMovie(id)); if (m) this.watchlistMovies.set([m, ...l]); }
      } else { s.delete(id); this.watchlistMovies.set(l.filter((m) => m.id !== id)); }
      this.watchlistIds.set(s);
      return true;
    } finally { this.pendientes.delete(id); }
  }
  get myList(): Movie[] { return this.watchlistMovies(); }
  byGenre(): { genre: string; items: Movie[] }[] {
    const g = new Map<string, Movie[]>();
    for (const m of this.movies()) { const k = m.genre || 'General'; g.set(k, [...(g.get(k) ?? []), m]); }
    return [...g].map(([genre, items]) => ({ genre, items }));
  }
}
