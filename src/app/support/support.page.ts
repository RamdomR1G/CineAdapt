import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonInput, IonTextarea, IonSelect, IonSelectOption, IonButton, IonListHeader, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonInput, IonTextarea, IonSelect, IonSelectOption, IonButton, IonListHeader, IonRefresher, IonRefresherContent],
  template: `
  <ion-header><ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/profile" text="Atras"></ion-back-button></ion-buttons>
    <ion-title>Soporte</ion-title>
  </ion-toolbar></ion-header>
  <ion-content>
    <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>

    @if (!staff()) {
      <ion-list [inset]="true">
        <ion-list-header><ion-label>Nuevo reporte</ion-label></ion-list-header>
        <ion-item><ion-input id="rep-title" label="Titulo" labelPlacement="stacked" maxlength="150" [value]="title()" (ionInput)="title.set($any($event.target).value)"></ion-input></ion-item>
        <ion-item><ion-textarea id="rep-desc" label="Descripcion" labelPlacement="stacked" maxlength="2000" [autoGrow]="true" [value]="desc()" (ionInput)="desc.set($any($event.target).value)"></ion-textarea></ion-item>
        <ion-item>
          <ion-select id="rep-priority" label="Prioridad" labelPlacement="stacked" [value]="priority()" (ionChange)="priority.set($event.detail.value)">
            @for (p of priorities; track p) { <ion-select-option [value]="p">{{ p }}</ion-select-option> }
          </ion-select>
        </ion-item>
        <ion-item lines="none"><input id="rep-file" type="file" accept="image/*" (change)="file = $any($event.target).files?.[0] ?? null" /></ion-item>
        <ion-item lines="none"><ion-button id="rep-send" (click)="create()" [disabled]="busy()">Enviar reporte</ion-button></ion-item>
        @if (msg()) { <ion-item lines="none"><ion-note id="rep-msg" [color]="ok() ? 'success' : 'danger'">{{ msg() }}</ion-note></ion-item> }
      </ion-list>
    }

    <ion-list [inset]="true">
      <ion-list-header><ion-label>{{ staff() ? (auth.user()?.isAdmin ? 'Todos los reportes' : 'Reportes asignados a mi') : 'Mis reportes' }}</ion-label></ion-list-header>
      @for (r of reports(); track r.id) {
        <ion-item button detail (click)="open(r.id)" class="rep-item">
          <ion-label>
            <h3>{{ r.code }} · {{ r.title }}</h3>
            <p>{{ r.status }} · {{ r.priority }}{{ r.created_by_name && staff() ? ' · ' + r.created_by_name : '' }}</p>
          </ion-label>
        </ion-item>
      } @empty { <ion-item lines="none"><ion-note>No hay reportes.</ion-note></ion-item> }
    </ion-list>
  </ion-content>`,
})
export class SupportPage implements OnInit {
  readonly priorities = ['Baja', 'Media', 'Alta', 'Crítica'];
  reports = signal<any[]>([]);
  title = signal(''); desc = signal(''); priority = signal('Media');
  msg = signal(''); ok = signal(false); busy = signal(false);
  file: File | null = null;
  constructor(private api: ApiService, public auth: AuthService, private router: Router) {}

  staff() { const u = this.auth.user(); return !!u && (u.isAdmin || u.isAgent); }
  ngOnInit() { this.load(); }
  async load() { try { this.reports.set(await this.api.listReports()); } catch { this.reports.set([]); } }
  async refresh(ev: any) { await this.load(); ev.target.complete(); }
  open(id: number) { this.router.navigate(['/support', id]); }

  async create() {
    this.msg.set(''); this.busy.set(true);
    try {
      const r = await this.api.createReport(this.title(), this.desc(), this.priority(), this.file);
      this.ok.set(true); this.msg.set(`Reporte ${r.code} enviado.`);
      this.title.set(''); this.desc.set(''); this.file = null;
      await this.load();
    } catch (e: any) { this.ok.set(false); this.msg.set(e?.error?.message ?? 'No se pudo enviar el reporte.'); }
    finally { this.busy.set(false); }
  }
}
