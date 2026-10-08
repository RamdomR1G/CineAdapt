import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonItem, IonInput, IonButton, IonList, IonText, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonItem, IonInput, IonButton, IonList, IonText, IonSpinner],
  template: `
  <ion-content class="ion-padding">
    <div class="wrap">
      <h1 class="logo">CineAdapt</h1>
      <p class="sub">Crea tu cuenta</p>
      <ion-list [inset]="true">
        <ion-item><ion-input label="Nombre" labelPlacement="stacked" [(ngModel)]="name"></ion-input></ion-item>
        <ion-item><ion-input type="email" label="Correo" labelPlacement="stacked" [(ngModel)]="email"></ion-input></ion-item>
        <ion-item><ion-input type="password" label="Contrasena (min. 6)" labelPlacement="stacked" [(ngModel)]="password"></ion-input></ion-item>
      </ion-list>
      @if (error()) { <ion-text color="danger"><p class="err">{{ error() }}</p></ion-text> }
      <div class="btn"><ion-button expand="block" (click)="submit()" [disabled]="busy()">
        @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { Registrarme }
      </ion-button></div>
      <p class="alt">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesion</a></p>
    </div>
  </ion-content>`,
  styleUrl: './auth.scss',
})
export class RegisterPage {
  name = ''; email = ''; password = '';
  busy = signal(false); error = signal('');
  constructor(private auth: AuthService, private router: Router) {}
  async submit() {
    if (!this.name || !this.email || this.password.length < 6) { this.error.set('Completa todos los campos (contrasena de al menos 6 caracteres).'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.auth.register(this.name.trim(), this.email.trim(), this.password); this.router.navigateByUrl('/tabs/home'); }
    catch (e: any) { this.error.set(e?.error?.error ?? e?.error?.message ?? 'No se pudo crear la cuenta.'); }
    finally { this.busy.set(false); }
  }
}
