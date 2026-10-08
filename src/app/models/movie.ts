import { Season } from './season';

export class Movie {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly description: string,
    public readonly type: 'movie' | 'series',
    public readonly genre: string,
    public readonly year: number | null,
    public readonly posterUrl: string | null,
    public readonly videoUrl: string | null,
    public readonly seasons: Season[] = [],
  ) {}
  get isSeries(): boolean { return this.type === 'series'; }
  get typeLabel(): string { return this.isSeries ? 'Serie' : 'Pelicula'; }
  get meta(): string { return [this.typeLabel, this.genre, this.year].filter(Boolean).join(' · '); }
  matches(q: string): boolean {
    const t = q.trim().toLowerCase();
    return !t || this.title.toLowerCase().includes(t) || this.genre.toLowerCase().includes(t);
  }
  static fromJson(j: any): Movie {
    return new Movie(
      j.id, j.title, j.description ?? '', j.type === 'series' ? 'series' : 'movie',
      j.genre ?? '', j.release_year ?? null, j.poster_url ?? null,
      j.video_url ?? j.external_video_url ?? j.trailer_url ?? null,
      (j.seasons ?? []).map(Season.fromJson),
    );
  }
}
