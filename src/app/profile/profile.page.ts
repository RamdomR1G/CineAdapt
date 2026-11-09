import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton, IonSegment, IonSegmentButton, IonInput, IonListHeader } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { InstallService } from '../services/install.service';
import { ThemeService, ThemeMode } from '../services/theme.service';
import { ApiService } from '../services/api.service';
import { GpsCardComponent } from '../gps-card/gps-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton, IonSegment, IonSegmentButton, IonInput, IonListHeader, GpsCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>Perfil</ion-title></ion-toolbar></ion-header>
  <ion-content>
    <ion-list [inset]="true">
      <ion-item><ion-label>Nombre</ion-label><ion-note slot="end">{{ auth.user()?.name }}</ion-note></ion-item>
      <ion-item><ion-label>Correo</ion-label><ion-note slot="end">{{ auth.user()?.email }}</ion-note></ion-item>
      <ion-item><ion-label>ID de usuario</ion-label><ion-note slot="end" id="user-id">{{ auth.user()?.id }}</ion-note></ion-item>
      <ion-item><ion-label>Rol</ion-label><ion-note slot="end">{{ auth.user()?.roleLabel }}</ion-note></ion-item>
    </ion-list>

    <ion-list [inset]="true">
      <ion-list-header><ion-label>Tema de la app</ion-label></ion-list-header>
      <ion-item lines="none">
        <ion-segment id="theme-segment" [value]="theme.mode()" (ionChange)="onMode($event)">
          <ion-segment-button value="auto" id="theme-auto"><ion-label>Auto</ion-label></ion-segment-button>
          <ion-segment-button value="day" id="theme-day"><ion-label>Dia</ion-label></ion-segment-button>
          <ion-segment-button value="evening" id="theme-evening"><ion-label>Tarde</ion-label></ion-segment-button>
          <ion-segment-button value="night" id="theme-night"><ion-label>Noche</ion-label></ion-segment-button>
        </ion-segment>
      </ion-item>
      <ion-item lines="none"><ion-note id="theme-note">{{ note() }}</ion-note></ion-item>
    </ion-list>

    <ion-list [inset]="true">
      <ion-item button detail routerLink="/support"><ion-label>{{ auth.user()?.isAdmin || auth.user()?.isAgent ? 'Reportes de soporte' : 'Soporte: mis reportes' }}</ion-label></ion-item>
      <ion-item button detail routerLink="/messages"><ion-label>Mensajes y recomendaciones</ion-label></ion-item>
    </ion-list>

    @if (auth.user()?.isAdmin) {
      <ion-list [inset]="true">
        <ion-list-header><ion-label>Administracion: agentes de atencion</ion-label></ion-list-header>
        <ion-item><ion-input id="role-email" label="Correo de la cuenta" labelPlacement="stacked" type="email" [value]="roleEmail()" (ionInput)="roleEmail.set($any($event.target).value)"></ion-input></ion-item>
        <ion-item lines="none">
          <ion-button id="make-agent" size="small" (click)="setRole('agent')">Hacer agente</ion-button>
          <ion-button id="make-user" size="small" fill="outline" (click)="setRole('user')">Regresar a usuario</ion-button>
        </ion-item>
        @if (roleMsg()) { <ion-item lines="none"><ion-note id="role-msg">{{ roleMsg() }}</ion-note></ion-item> }
      </ion-list>
    }

    <app-gps-card />
    <div class="actions">
      @if (install.installed()) { <ion-note>App instalada</ion-note> }
      @else if (install.canInstall()) { <ion-button expand="block" (click)="install.install()">Instalar app</ion-button> }
      @else { <ion-note>Para instalar: menu de Chrome &gt; "Instalar app" / "Agregar a pantalla de inicio".</ion-note> }
      <ion-button expand="block" color="danger" fill="outline" (click)="auth.logout()">Cerrar sesion</ion-button>
    </div>
  </ion-content>`,
  styles: [`.actions{padding:8px 16px 24px;text-align:center;display:flex;flex-direction:column;gap:8px}`],
})
export class ProfilePage {
  roleEmail = signal('');
  roleMsg = signal('');
  constructor(public auth: AuthService, public install: InstallService, public theme: ThemeService, private api: ApiService) {}

  note(): string {
    const names: Record<string, string> = { day: 'diurno', evening: 'vespertino', night: 'nocturno' };
    return this.theme.mode() === 'auto'
      ? `Automatico: sigue la hora local. Ahora: tema ${names[this.theme.active()]}.`
      : `Manual: tema ${names[this.theme.mode()]} fijo.`;
  }
  onMode(ev: any) { const v = ev.detail?.value as ThemeMode; if (v && v !== this.theme.mode()) this.theme.setMode(v); }
  async setRole(role: 'user' | 'agent') {
    try {
      const u = await this.api.setUserRole(this.roleEmail().trim(), role);
      this.roleMsg.set(`${u.name} ahora es ${role === 'agent' ? 'agente de atencion' : 'usuario'}.`);
    } catch (e: any) { this.roleMsg.set(e?.error?.message ?? 'No se pudo cambiar el rol.'); }
  }
}
