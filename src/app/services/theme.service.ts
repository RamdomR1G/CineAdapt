import { Injectable, signal } from '@angular/core';
import { TimeService } from './time.service';
import { GeoService } from './geo.service';

export type ThemeName = 'day' | 'evening' | 'night';
export type ThemeMode = 'auto' | ThemeName;

const BAR_COLOR: Record<ThemeName, string> = { day: '#ffffff', evening: '#0f172a', night: '#05070d' };
const MODE_KEY = 'cineadapt_theme_mode';

/**
 * Tema dinamico por hora local: diurno 6-18, vespertino 18-22, nocturno 22-6.
 * La hora sale del GPS (zona horaria) y, si no hay permiso, de la hora del dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  current: ThemeName = 'evening';
  readonly mode = signal<ThemeMode>(this.loadMode());
  readonly active = signal<ThemeName>('evening');
  private zone: string | null = null;
  private timer: any = null;

  constructor(private time: TimeService, private geo: GeoService) {}

  themeForHour(hour: number): ThemeName {
    if (hour >= 6 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /** Cambia data-theme y el color de la barra; usa una transicion suave si el usuario no pidio reducir el movimiento. */
  apply(theme: ThemeName): void {
    if (theme === this.current && document.documentElement.getAttribute('data-theme') === theme) { this.active.set(theme); return; }
    const change = () => {
      this.current = theme;
      this.active.set(theme);
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme]);
    };
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vt = (document as any).startViewTransition;
    if (!reduce && typeof vt === 'function') vt.call(document, change); else change();
  }

  /** Calcula el tema segun el modo: manual o automatico (hora local). */
  update(): void {
    const m = this.mode();
    if (m !== 'auto') { this.apply(m); return; }
    const tz = this.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.apply(this.themeForHour(this.time.hourIn(tz)));
  }

  async refresh(): Promise<void> {
    this.update();                                   // primero la hora del dispositivo, sin parpadeo
    if (this.mode() !== 'auto') return;
    const loc = await this.geo.readLocation();       // despues la hora local real del GPS
    this.zone = loc.timeZone;
    this.update();
  }

  setMode(m: ThemeMode): void {
    this.mode.set(m);
    try { localStorage.setItem(MODE_KEY, m); } catch {}
    this.refresh();
  }

  init(): void {
    this.refresh();
    if (!this.timer) this.timer = setInterval(() => this.update(), 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refresh();
    });
  }

  private loadMode(): ThemeMode {
    try { const v = localStorage.getItem(MODE_KEY); if (v === 'day' || v === 'evening' || v === 'night') return v; } catch {}
    return 'auto';
  }
}
