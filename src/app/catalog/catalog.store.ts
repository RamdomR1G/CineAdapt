import { Injectable, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Movie } from '../models/movie';

/** Cache en memoria del catalogo y de la lista del usuario. */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  readonly movies = signal<Movie[]>([]);
  readonly watchlistIds = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private api: ApiService) {}

  async load() {
    this.loading.set(true); this.error.set('');
    try {
      this.movies.set(await this.api.getCatalog());
      const wl = await this.api.getWatchlist().catch(() => []);
      this.watchlistIds.set(new Set(wl.map((m) => m.id)));
    } catch { this.error.set('No se pudo cargar el catalogo. Revisa tu conexion o el servidor.'); }
    finally { this.loading.set(false); }
  }
  inList(id: number) { return this.watchlistIds().has(id); }
  async toggleList(id: number) {
    const s = new Set(this.watchlistIds());
    if (s.has(id)) { await this.api.removeFromWatchlist(id); s.delete(id); }
    else { await this.api.addToWatchlist(id); s.add(id); }
    this.watchlistIds.set(s);
  }
  get myList(): Movie[] { return this.movies().filter((m) => this.watchlistIds().has(m.id)); }
  byGenre(): { genre: string; items: Movie[] }[] {
    const g = new Map<string, Movie[]>();
    for (const m of this.movies()) { const k = m.genre || 'General'; g.set(k, [...(g.get(k) ?? []), m]); }
    return [...g].map(([genre, items]) => ({ genre, items }));
  }
}
