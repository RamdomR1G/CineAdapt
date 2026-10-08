import { Routes } from '@angular/router';
import { authGuard } from './services/auth.http';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./auth/register.page').then((m) => m.RegisterPage) },
  {
    path: 'tabs', canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./home/home.page').then((m) => m.HomePage) },
      { path: 'search', loadComponent: () => import('./search/search.page').then((m) => m.SearchPage) },
      { path: 'mylist', loadComponent: () => import('./mylist/mylist.page').then((m) => m.MylistPage) },
      { path: 'profile', loadComponent: () => import('./profile/profile.page').then((m) => m.ProfilePage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'detail/:id', canActivate: [authGuard], loadComponent: () => import('./detail/detail.page').then((m) => m.DetailPage) },
  { path: '**', redirectTo: 'tabs' },
];
