import { Component, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { CatalogStore } from '../catalog/catalog.store';
import { MovieCardComponent } from '../catalog/movie-card.component';
import { AuthService } from '../services/auth.service';
import { ThemeService, ThemeName } from '../services/theme.service';
import { Movie } from '../models/movie';

const HELLO: Record<ThemeName, string> = { day: 'Buenos dias', evening: 'Buenas tardes', night: 'Buenas noches' };
const MOMENT: Record<ThemeName, { title: string; genres: string[] }> = {
  day: { title: 'Para empezar el dia', genres: ['comedia', 'animacion', 'aventura', 'documental', 'familiar'] },
  evening: { title: 'Para esta tarde', genres: ['accion', 'drama', 'aventura', 'ciencia ficcion', 'fantasia'] },
  night: { title: 'Para esta noche', genres: ['terror', 'suspenso', 'misterio', 'thriller', 'noche'] },
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonRefresher, IonRefresherContent, IonButton, MovieCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>CineAdapt</ion-title></ion-toolbar></ion-header>
  <ion-content>
    <section id="greeting" class="greeting">
      <h1>{{ hello() }}, {{ firstName() }}</h1>
      <p>{{ moment().title }}</p>
    </section>
    <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
    @if (store.loading() && !store.movies().length) { <div class="center"><ion-spinner></ion-spinner></div> }
    @if (store.error()) { <p class="msg">{{ store.error() }}</p><div class="center"><ion-button fill="outline" (click)="store.load()">Reintentar</ion-button></div> }
    @if (store.movies()[0]; as f) {
      <a class="hero" [routerLink]="['/detail', f.id]" [style.background-image]="f.posterUrl ? 'url(' + f.posterUrl + ')' : ''">
        <div class="shade"><div class="tag">Destacado</div><h2>{{ f.title }}</h2><p>{{ f.meta }}</p></div>
      </a>
    }
    @if (momentItems().length) {
      <h3 id="moment-title" class="row-title">{{ moment().title }}</h3>
      <div id="moment-row" class="row">@for (m of momentItems(); track m.id) { <div class="item"><app-movie-card [movie]="m" /></div> }</div>
    }
    @for (g of store.byGenre(); track g.genre) {
      <h3 class="row-title">{{ g.genre }}</h3>
      <div class="row">@for (m of g.items; track m.id) { <div class="item"><app-movie-card [movie]="m" /></div> }</div>
    }
    @if (!store.loading() && !store.error() && !store.movies().length) { <p class="msg">Aun no hay contenido publicado.</p> }
  </ion-content>`,
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit {
  readonly hello = computed(() => HELLO[this.theme.active()]);
  readonly moment = computed(() => MOMENT[this.theme.active()]);
  readonly firstName = computed(() => (this.auth.user()?.name ?? '').trim().split(/\s+/)[0] || 'bienvenido');
  readonly momentItems = computed<Movie[]>(() => {
    const gs = this.moment().genres;
    const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return this.store.movies().filter((m) => gs.some((g) => norm(m.genre).includes(g) || norm(m.title).includes(g))).slice(0, 12);
  });
  constructor(public store: CatalogStore, private auth: AuthService, private theme: ThemeService) {}
  ngOnInit() { this.store.load(); }
  async refresh(ev: any) { await this.store.load(); ev.target.complete(); }
}
