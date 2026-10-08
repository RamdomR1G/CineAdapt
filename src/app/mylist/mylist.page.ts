import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { CatalogStore } from '../catalog/catalog.store';
import { MovieCardComponent } from '../catalog/movie-card.component';

@Component({
  selector: 'app-mylist',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, MovieCardComponent],
  template: `
  <ion-header><ion-toolbar><ion-title>Mi lista</ion-title></ion-toolbar></ion-header>
  <ion-content>
    <div class="grid">@for (m of store.myList; track m.id) { <app-movie-card [movie]="m" /> }</div>
    @if (!store.myList.length) { <p class="msg">Tu lista esta vacia. Agrega titulos desde su detalle.</p> }
  </ion-content>`,
  styles: [`.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.msg{text-align:center;opacity:.7;padding:24px}`],
})
export class MylistPage implements OnInit {
  constructor(public store: CatalogStore) {}
  ngOnInit() { if (!this.store.movies().length) this.store.load(); }
}
