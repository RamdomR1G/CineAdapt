import { Injectable } from '@angular/core';
import { TimeService } from './time.service';
import { GeoService } from './geo.service';

export type ThemeName = 'day' | 'evening' | 'night';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  current: ThemeName = 'evening';
  constructor(private time: TimeService, private geo: GeoService) {}

  themeForHour(hour: number): ThemeName {
    if (hour >= 6 && hour < 18) return 'day';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  apply(theme: ThemeName): void {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  async refresh(): Promise<void> {
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  this.apply(this.themeForHour(this.time.hourIn(deviceTz)));   // evita parpadeo
  const loc = await this.geo.readLocation();                    // hora local del GPS
  this.apply(this.themeForHour(this.time.hourIn(loc.timeZone)));
}

init(): void {
  this.refresh();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') this.refresh();
  });
}
}