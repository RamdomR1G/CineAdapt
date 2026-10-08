import { Episode } from './episode';

export class Season {
  constructor(
    public readonly id: number,
    public readonly number: number,
    public readonly episodes: Episode[] = [],
  ) {}
  get episodeCount(): number { return this.episodes.length; }
  static fromJson(j: any): Season {
    return new Season(j.id, j.season_number ?? j.number ?? 0, (j.episodes ?? []).map(Episode.fromJson));
  }
}
