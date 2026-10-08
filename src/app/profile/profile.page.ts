import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { InstallService } from '../services/install.service';
import { GpsCardComponent } from '../gps-card/gps-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote, IonButton, GpsCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>Perfil</ion-title></ion-toolbar></ion-header>
  <ion-content>
    <ion-list [inset]="true">
      <ion-item><ion-label>Nombre</ion-label><ion-note slot="end">{{ auth.user()?.name }}</ion-note></ion-item>
      <ion-item><ion-label>Correo</ion-label><ion-note slot="end">{{ auth.user()?.email }}</ion-note></ion-item>
      <ion-item><ion-label>Rol</ion-label><ion-note slot="end">{{ auth.user()?.role }}</ion-note></ion-item>
    </ion-list>
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
export class ProfilePage { constructor(public auth: AuthService, public install: InstallService) {} }
