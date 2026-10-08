import { Component, OnInit, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { CatalogStore } from '../catalog/catalog.store';
import { MovieCardComponent } from '../catalog/movie-card.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, MovieCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>Buscar</ion-title></ion-toolbar>
    <ion-toolbar><ion-searchbar placeholder="Titulo o genero" (ionInput)="q.set($any($event).detail.value ?? '')"></ion-searchbar></ion-toolbar></ion-header>
  <ion-content>
    <div class="grid">@for (m of results(); track m.id) { <app-movie-card [movie]="m" /> }</div>
    @if (!results().length) { <p class="msg">Sin resultados.</p> }
  </ion-content>`,
  styles: [`.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.msg{text-align:center;opacity:.7;padding:24px}`],
})
export class SearchPage implements OnInit {
  q = signal('');
  constructor(private store: CatalogStore) {}
  ngOnInit() { if (!this.store.movies().length) this.store.load(); }
  results() { return this.store.movies().filter((m) => m.matches(this.q())); }
}
