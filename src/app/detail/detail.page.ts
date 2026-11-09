import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonList, IonItem, IonLabel, IonListHeader, IonSpinner, IonInput, IonTextarea, IonNote } from '@ionic/angular/standalone';
import { ApiService } from '../services/api.service';
import { CatalogStore } from '../catalog/catalog.store';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonButton, IonList, IonItem, IonLabel, IonListHeader, IonSpinner, IonInput, IonTextarea, IonNote],
  template: `
  <ion-header><ion-toolbar>
    <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/home" text="Atras"></ion-back-button></ion-buttons>
    <ion-title>{{ movie()?.title ?? '' }}</ion-title>
  </ion-toolbar></ion-header>
  <ion-content>
    @if (movie(); as m) {
      @if (embed(); as e) { <iframe class="player" [src]="e" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe> }
      @else if (videoUrl()) { <video class="player" [src]="videoUrl()!" controls autoplay playsinline></video> }
      @else if (m.posterUrl) { <img class="poster" [src]="m.posterUrl" [alt]="m.title" /> }
      <div class="body">
        <h2>{{ m.title }}</h2>
        <p class="meta">{{ m.meta }}</p>
        <div class="btns">
          <ion-button (click)="play(m)" [disabled]="!m.videoUrl">Ver ahora</ion-button>
          <ion-button fill="outline" (click)="toggle(m)">{{ store.inList(m.id) ? '✓ En mi lista' : '+ Mi lista' }}</ion-button>
          <ion-button id="rec-open" fill="clear" (click)="recOpen.set(!recOpen())">Recomendar</ion-button>
        </div>
        @if (recOpen()) {
          <ion-list [inset]="true">
            <ion-item><ion-input id="rec-email" label="Correo de la persona" labelPlacement="stacked" type="email" [value]="recEmail()" (ionInput)="recEmail.set($any($event.target).value)"></ion-input></ion-item>
            <ion-item><ion-textarea id="rec-body" label="Mensaje" labelPlacement="stacked" maxlength="280" [value]="recBody()" (ionInput)="recBody.set($any($event.target).value)"></ion-textarea></ion-item>
            <ion-item lines="none"><ion-button id="rec-send" (click)="recommend(m)">Enviar recomendacion</ion-button></ion-item>
            @if (recMsg()) { <ion-item lines="none"><ion-note id="rec-msg">{{ recMsg() }}</ion-note></ion-item> }
          </ion-list>
        }
        @if (!m.videoUrl) { <p class="meta">Este titulo no tiene video disponible.</p> }
        <p>{{ m.description }}</p>
      </div>
      @for (s of m.seasons; track s.id) {
        <ion-list [inset]="true">
          <ion-list-header><ion-label>Temporada {{ s.number }}</ion-label></ion-list-header>
          @for (ep of s.episodes; track ep.id) {
            <ion-item button (click)="playUrl(ep.videoUrl)" [disabled]="!ep.videoUrl"><ion-label>{{ ep.number }}. {{ ep.title }}</ion-label></ion-item>
          }
        </ion-list>
      }
    } @else if (loading()) { <div class="center"><ion-spinner></ion-spinner></div> }
    @else { <p class="msg">No se encontro el titulo.</p> }
  </ion-content>`,
  styles: [`.player,.poster{width:100%;aspect-ratio:16/9;object-fit:cover;background:#000;border:0}.body{padding:16px}h2{margin:0}.meta{opacity:.65;font-size:.85rem}.btns{display:flex;gap:8px;margin:8px 0}.center{display:flex;justify-content:center;padding:32px}.msg{text-align:center;padding:24px;opacity:.7}`],
})
export class DetailPage implements OnInit {
  movie = signal<Movie | null>(null);
  loading = signal(true);
  videoUrl = signal<string | null>(null);
  embed = signal<SafeResourceUrl | null>(null);
  recOpen = signal(false); recEmail = signal(''); recBody = signal(''); recMsg = signal('');
  constructor(private route: ActivatedRoute, private api: ApiService, public store: CatalogStore, private san: DomSanitizer) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.store.movies().length) await this.store.load();
    const cached = this.store.movies().find((m) => m.id === id) ?? null;
    const full = await this.api.getMovie(id);
    this.movie.set(full && (full.seasons.length || !cached) ? full : cached);
    this.loading.set(false);
  }
  play(m: Movie) { this.playUrl(m.videoUrl); }
  playUrl(url: string | null) {
    if (!url) return;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (yt) { this.videoUrl.set(null); this.embed.set(this.san.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${yt[1]}?autoplay=1`)); }
    else { this.embed.set(null); this.videoUrl.set(url); }
  }
  async recommend(m: Movie) {
    try {
      const u = await this.api.lookupUser(this.recEmail().trim());
      await this.api.sendMessage(u.id, this.recBody().trim() || `Te recomiendo ${m.title}`, m.id);
      this.recMsg.set(`Recomendacion enviada a ${u.name}.`); this.recBody.set('');
    } catch (e: any) { this.recMsg.set(e?.error?.message ?? 'No se pudo enviar.'); }
  }
  toggle(m: Movie) { this.store.toggleList(m.id); }
}
