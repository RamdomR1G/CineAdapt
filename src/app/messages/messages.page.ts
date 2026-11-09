import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonSegment, IonSegmentButton, IonButton, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonSegment, IonSegmentButton, IonButton, IonRefresher, IonRefresherContent],
  template: `
  <ion-header><ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text="Atras"></ion-back-button></ion-buttons>
    <ion-title>Mensajes</ion-title>
  </ion-toolbar></ion-header>
  <ion-content>
    <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
    <ion-segment [value]="tab()" (ionChange)="tab.set($any($event.detail.value))">
      <ion-segment-button value="received" id="tab-received"><ion-label>Recibidos ({{ data().counts.received }})</ion-label></ion-segment-button>
      <ion-segment-button value="sent" id="tab-sent"><ion-label>Enviados ({{ data().counts.sent }})</ion-label></ion-segment-button>
    </ion-segment>
    <ion-list [inset]="true" id="msg-list">
      @for (m of shown(); track m.id) {
        <ion-item class="msg-item">
          <ion-label class="ion-text-wrap">
            <h3>{{ tab() === 'received' ? 'De ' + m.from_name : 'Para ' + m.to_name }}</h3>
            @if (m.content_title) { <p><a [routerLink]="['/detail', m.content_id]">{{ m.content_title }}</a></p> }
            <p>{{ m.body }}</p>
            <p class="d">{{ fmt(m.created_at) }}</p>
          </ion-label>
        </ion-item>
      } @empty { <ion-item lines="none"><ion-note>No hay mensajes.</ion-note></ion-item> }
    </ion-list>
    <div class="pad"><ion-button id="msg-clear" fill="outline" color="danger" expand="block" (click)="clear()">Limpiar historial</ion-button></div>
  </ion-content>`,
  styles: [`.pad{padding:8px 16px}.d{opacity:.55;font-size:.75rem}`],
})
export class MessagesPage implements OnInit {
  tab = signal<'received' | 'sent'>('received');
  data = signal<any>({ received: [], sent: [], counts: { sent: 0, received: 0 } });
  constructor(private api: ApiService) {}
  ngOnInit() { this.load(); }
  shown() { return this.data()[this.tab()] as any[]; }
  async load() { try { this.data.set(await this.api.listMessages()); } catch {} }
  async refresh(ev: any) { await this.load(); ev.target.complete(); }
  async clear() { await this.api.clearMessages(); await this.load(); }
  fmt(d: string) { return new Date(d).toLocaleString('es-MX'); }
}
