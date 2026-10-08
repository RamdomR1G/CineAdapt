export type LocationStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

/** Resultado de la lectura de ubicacion. Las coordenadas solo viven en el dispositivo. */
export class LocationInfo {
  constructor(
    public readonly status: LocationStatus,
    public readonly timeZone: string,
    public readonly latitude: number | null = null,
    public readonly longitude: number | null = null,
    public readonly accuracy: number | null = null,
  ) {}

  get fromGps(): boolean { return this.status === 'granted'; }
  get sourceLabel(): string { return this.fromGps ? 'GPS' : 'Reloj del dispositivo'; }

  static fallback(status: LocationStatus): LocationInfo {
    return new LocationInfo(status, Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
}
