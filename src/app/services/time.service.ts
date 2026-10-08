import { Injectable } from '@angular/core';

/** Calcula la hora local real en una zona horaria IANA. */
@Injectable({ providedIn: 'root' })
export class TimeService {
  hourIn(timeZone: string, date = new Date()): number {
    const h = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone }).format(date);
    return parseInt(h, 10) % 24;
  }
  formatIn(timeZone: string, date = new Date()): string {
    return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone }).format(date);
  }
}
