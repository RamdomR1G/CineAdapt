import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, home, searchOutline, search, bookmarkOutline, bookmark, personOutline, person } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
  <ion-tabs>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="home" href="/tabs/home"><ion-icon name="home-outline"></ion-icon><ion-label>Inicio</ion-label></ion-tab-button>
      <ion-tab-button tab="search" href="/tabs/search"><ion-icon name="search-outline"></ion-icon><ion-label>Buscar</ion-label></ion-tab-button>
      <ion-tab-button tab="mylist" href="/tabs/mylist"><ion-icon name="bookmark-outline"></ion-icon><ion-label>Mi lista</ion-label></ion-tab-button>
      <ion-tab-button tab="profile" href="/tabs/profile"><ion-icon name="person-outline"></ion-icon><ion-label>Perfil</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>`,
})
export class TabsPage {
  constructor() { addIcons({ homeOutline, home, searchOutline, search, bookmarkOutline, bookmark, personOutline, person }); }
}
