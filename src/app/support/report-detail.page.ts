import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonSelect, IonSelectOption, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonNote, IonSelect, IonSelectOption, IonButton],
  template: `
  <ion-header><ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/support" text="Atras"></ion-back-button></ion-buttons>
    <ion-title>{{ r()?.code ?? 'Reporte' }}</ion-title>
  </ion-toolbar></ion-header>
  <ion-content>
    @if (r(); as x) {
      <ion-list [inset]="true">
        <ion-item><ion-label class="ion-text-wrap"><h2 id="rd-title">{{ x.title }}</h2><p>{{ x.description }}</p></ion-label></ion-item>
        <ion-item><ion-label>Creado por</ion-label><ion-note slot="end">{{ x.created_by_name }}</ion-note></ion-item>
        <ion-item><ion-label>Asignado a</ion-label><ion-note slot="end" id="rd-assigned">{{ x.assigned_to_name ?? 'Sin asignar' }}</ion-note></ion-item>
        <ion-item><ion-label>Estado</ion-label><ion-note slot="end" id="rd-status">{{ x.status }}</ion-note></ion-item>
        <ion-item><ion-label>Prioridad</ion-label><ion-note slot="end">{{ x.priority }}</ion-note></ion-item>
        @if (x.attachment_url) { <ion-item lines="none"><a [href]="x.attachment_url" target="_blank" rel="noopener"><img [src]="x.attachment_url" alt="Adjunto" class="att" /></a></ion-item> }
      </ion-list>

      @if (canEditStatus(x)) {
        <ion-list [inset]="true">
          <ion-item>
            <ion-select id="rd-new-status" label="Cambiar estado" [value]="x.status" (ionChange)="change({ status: $event.detail.value })">
              @for (s of statuses; track s) { <ion-select-option [value]="s">{{ s }}</ion-select-option> }
            </ion-select>
          </ion-item>
        </ion-list>
      }
      @if (auth.user()?.isAdmin) {
        <ion-list [inset]="true">
          <ion-item>
            <ion-select id="rd-agent" label="Asignar a agente" [value]="x.assigned_to" (ionChange)="assign($event.detail.value)">
              @for (a of agents(); track a.id) { <ion-select-option [value]="a.id">{{ a.name }}</ion-select-option> }
            </ion-select>
          </ion-item>
        </ion-list>
      }
      @if (auth.user()?.isAdmin || auth.user()?.id === x.created_by) {
        <div class="pad"><ion-button id="rd-delete" color="danger" fill="outline" expand="block" (click)="remove()">Eliminar reporte</ion-button></div>
      }
      @if (msg()) { <p class="pad" id="rd-msg">{{ msg() }}</p> }
    } @else { <p class="pad">{{ msg() || 'Cargando...' }}</p> }
  </ion-content>`,
  styles: [`.pad{padding:8px 16px}.att{max-width:100%;border-radius:8px}`],
})
export class ReportDetailPage implements OnInit {
  readonly statuses = ['Abierto', 'En proceso', 'Resuelto'];
  r = signal<any | null>(null);
  agents = signal<any[]>([]);
  msg = signal('');
  private id = 0;
  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService, public auth: AuthService) {}

  async ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    await this.load();
    if (this.auth.user()?.isAdmin) this.agents.set(await this.api.listAgents().catch(() => []));
  }
  async load() {
    try { this.r.set(await this.api.getReport(this.id)); }
    catch (e: any) { this.msg.set(e?.error?.message ?? 'No se pudo cargar el reporte.'); }
  }
  canEditStatus(x: any) { const u = this.auth.user(); return !!u && (u.isAdmin || (u.isAgent && x.assigned_to === u.id)); }
  async change(changes: any) {
    const x = this.r(); if (!x || changes.status === x.status) return;
    try { this.r.set(await this.api.updateReport(this.id, { ...changes, version: x.version })); this.msg.set(''); }
    catch (e: any) { this.msg.set(e?.error?.message ?? 'No se pudo actualizar.'); if (e?.status === 409) await this.load(); }
  }
  async assign(agentId: number) {
    const x = this.r(); if (!x || agentId === x.assigned_to) return;
    try { this.r.set(await this.api.assignReport(this.id, agentId)); this.msg.set(''); }
    catch (e: any) { this.msg.set(e?.error?.message ?? 'No se pudo asignar.'); }
  }
  async remove() {
    try { await this.api.deleteReport(this.id); this.router.navigateByUrl('/support'); }
    catch (e: any) { this.msg.set(e?.error?.message ?? 'No se pudo eliminar.'); }
  }
}
