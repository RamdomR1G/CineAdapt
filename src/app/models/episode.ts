export class Episode {
  constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly number: number,
    public readonly videoUrl: string | null,
  ) {}
  static fromJson(j: any): Episode {
    return new Episode(j.id, j.title, j.episode_number ?? j.number ?? 0, j.video_url ?? j.external_video_url ?? null);
  }
}
