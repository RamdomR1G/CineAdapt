import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, IonList, IonText, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonItem, IonInput, IonButton, IonList, IonText, IonSpinner],
  template: `
  <ion-content class="ion-padding">
    <div class="wrap">
      <h1 class="logo">CineAdapt</h1>
      <p class="sub">Inicia sesion para continuar</p>
      <ion-list [inset]="true">
        <ion-item><ion-input type="email" label="Correo" labelPlacement="stacked" [(ngModel)]="email" autocomplete="email"></ion-input></ion-item>
        <ion-item><ion-input type="password" label="Contrasena" labelPlacement="stacked" [(ngModel)]="password" autocomplete="current-password" (keyup.enter)="submit()"></ion-input></ion-item>
      </ion-list>
      @if (error()) { <ion-text color="danger"><p class="err">{{ error() }}</p></ion-text> }
      <div class="btn"><ion-button expand="block" (click)="submit()" [disabled]="busy()">
        @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Entrar }
      </ion-button></div>
      <p class="alt">¿No tienes cuenta? <a routerLink="/register">Registrate</a></p>
    </div>
  </ion-content>`,
  styleUrl: './auth.scss',
})
export class LoginPage {
  email = ''; password = '';
  busy = signal(false); error = signal('');
  constructor(private auth: AuthService, private router: Router) {}
  async submit() {
    if (!this.email || !this.password) { this.error.set('Escribe tu correo y contrasena.'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.auth.login(this.email.trim(), this.password); this.router.navigateByUrl('/tabs/home'); }
    catch (e: any) { this.error.set(e?.status === 0 ? 'No se pudo conectar al servidor.' : 'Credenciales incorrectas.'); }
    finally { this.busy.set(false); }
  }
}
