import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { IonList, IonItem, IonLabel, IonButton, IonNote, IonListHeader, IonBadge, IonSpinner } from '@ionic/angular/standalone';
import { GeoService } from '../services/geo.service';
import { TimeService } from '../services/time.service';
import { LocationInfo } from '../models/location-info';

/** Evidencia de la Entrega 1: lectura del GPS, zona horaria y hora local. */
@Component({
  selector: 'app-gps-card',
  standalone: true,
  imports: [IonList, IonItem, IonLabel, IonButton, IonNote, IonListHeader, IonBadge, IonSpinner],
  template: `
    <div class="hero"><div class="clock">{{ localTime() }}</div><ion-note>Hora local segun {{ location()?.sourceLabel ?? '...' }}</ion-note></div>
    @if (loading()) { <div class="center"><ion-spinner></ion-spinner></div> }
    @if (!loading() && location(); as l) {
      <ion-list [inset]="true">
        <ion-list-header><ion-label>Lectura del GPS</ion-label></ion-list-header>
        <ion-item><ion-label>Estado</ion-label><ion-badge slot="end" [color]="l.fromGps ? 'success' : 'warning'">{{ l.status }}</ion-badge></ion-item>
        <ion-item><ion-label>Latitud</ion-label><ion-note slot="end">{{ l.latitude !== null ? l.latitude!.toFixed(5) : 'N/D' }}</ion-note></ion-item>
        <ion-item><ion-label>Longitud</ion-label><ion-note slot="end">{{ l.longitude !== null ? l.longitude!.toFixed(5) : 'N/D' }}</ion-note></ion-item>
        <ion-item><ion-label>Zona horaria</ion-label><ion-note slot="end">{{ l.timeZone }}</ion-note></ion-item>
      </ion-list>
      <p class="privacy">Las coordenadas se procesan solo en tu dispositivo. No se envian ni se guardan en ningun servidor.</p>
      <div class="actions"><ion-button expand="block" fill="outline" (click)="refresh()">Actualizar ubicacion</ion-button></div>
    }`,
  styles: [`
    .hero{text-align:center;padding:16px 16px 4px}
    .clock{font-size:2.4rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ion-color-primary)}
    .center{display:flex;justify-content:center;padding:16px}
    .actions{padding:8px 16px}.privacy{padding:0 24px;font-size:.78rem;opacity:.7;text-align:center}
    ion-list-header ion-label{color:var(--ion-text-color);font-weight:600}`],
})
export class GpsCardComponent implements OnInit, OnDestroy {
  location = signal<LocationInfo | null>(null);
  localTime = signal('--:--:--');
  loading = signal(true);
  private timer?: ReturnType<typeof setInterval>;
  private onVisible = () => { if (document.visibilityState === 'visible') this.refresh(); };
  constructor(private geo: GeoService, private time: TimeService) {}
  ngOnInit() { this.refresh(); this.timer = setInterval(() => this.tick(), 1000); document.addEventListener('visibilitychange', this.onVisible); }
  ngOnDestroy() { clearInterval(this.timer); document.removeEventListener('visibilitychange', this.onVisible); }
  async refresh() { this.loading.set(true); this.location.set(await this.geo.readLocation()); this.loading.set(false); this.tick(); }
  private tick() { const l = this.location(); if (l) this.localTime.set(this.time.formatIn(l.timeZone)); }
}
