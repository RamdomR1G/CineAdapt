import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonRefresher, IonRefresherContent, IonButton } from '@ionic/angular/standalone';
import { CatalogStore } from '../catalog/catalog.store';
import { MovieCardComponent } from '../catalog/movie-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonRefresher, IonRefresherContent, IonButton, MovieCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>CineAdapt</ion-title></ion-toolbar></ion-header>
  <ion-content>
    <ion-refresher slot="fixed" (ionRefresh)="refresh($event)"><ion-refresher-content></ion-refresher-content></ion-refresher>
    @if (store.loading() && !store.movies().length) { <div class="center"><ion-spinner></ion-spinner></div> }
    @if (store.error()) { <p class="msg">{{ store.error() }}</p><div class="center"><ion-button fill="outline" (click)="store.load()">Reintentar</ion-button></div> }
    @if (store.movies()[0]; as f) {
      <a class="hero" [routerLink]="['/detail', f.id]" [style.background-image]="f.posterUrl ? 'url(' + f.posterUrl + ')' : ''">
        <div class="shade"><div class="tag">Destacado</div><h2>{{ f.title }}</h2><p>{{ f.meta }}</p></div>
      </a>
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
  constructor(public store: CatalogStore) {}
  ngOnInit() { this.store.load(); }
  async refresh(ev: any) { await this.store.load(); ev.target.complete(); }
}
