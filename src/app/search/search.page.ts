import { Component, OnInit, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar } from '@ionic/angular/standalone';
import { CatalogStore } from '../catalog/catalog.store';
import { MovieCardComponent } from '../catalog/movie-card.component';
import { ApiService } from '../services/api.service';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, MovieCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>Buscar</ion-title></ion-toolbar>
    <ion-toolbar><ion-searchbar placeholder="Titulo o genero" (ionInput)="buscar($any($event).detail.value ?? '')"></ion-searchbar></ion-toolbar></ion-header>
  <ion-content>
    <div class="grid">@for (m of results(); track m.id) { <app-movie-card [movie]="m" /> }</div>
    @if (!results().length && !buscando()) { <p class="msg">Sin resultados.</p> }
  </ion-content>`,
  styles: [`.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.msg{text-align:center;opacity:.7;padding:24px}`],
})
export class SearchPage implements OnInit {
  q = signal(''); buscando = signal(false);
  private remotos = signal<Movie[]>([]); private timer: any; private seq = 0;
  constructor(private store: CatalogStore, private api: ApiService) {}
  ngOnInit() { if (!this.store.movies().length) this.store.load(); }
  /** Practica 12: la busqueda se hace en el servidor (con espera de 250 ms al escribir), no sobre todo el catalogo en el telefono. */
  buscar(texto: string) {
    this.q.set(texto); clearTimeout(this.timer); const t = texto.trim();
    if (!t) { this.buscando.set(false); this.remotos.set([]); return; }
    this.buscando.set(true);
    this.timer = setTimeout(async () => {
      const n = ++this.seq;                                  // descarta respuestas tardias de busquedas anteriores
      try { const p = await this.api.getCatalogPage(30, 0, t); if (n === this.seq) this.remotos.set(p.items); }
      catch { if (n === this.seq) this.remotos.set(this.store.movies().filter((m) => m.matches(t))); }
      finally { if (n === this.seq) this.buscando.set(false); }
    }, 250);
  }
  results() { return this.q().trim() ? this.remotos() : this.store.movies(); }
}
