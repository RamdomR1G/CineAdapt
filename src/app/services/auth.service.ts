import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

/** Sesion del usuario: guarda el JWT y expone el usuario actual como signal. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'cineadapt_token';
  private readonly USER = 'cineadapt_user';
  readonly user = signal<User | null>(this.loadUser());
  readonly isLoggedIn = computed(() => !!this.user() && !!this.token);

  constructor(private http: HttpClient, private router: Router) {}

  get token(): string | null { try { return localStorage.getItem(this.KEY); } catch { return null; } }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<any>(`${environment.apiBase}/auth/login`, { email, password }));
    this.save(res);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post<any>(`${environment.apiBase}/auth/register`, { name, username: name, email, password }));
    await this.login(email, password);
  }

  logout(): void {
    try { localStorage.removeItem(this.KEY); localStorage.removeItem(this.USER); } catch {}
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  private save(res: any) {
    const user = User.fromJson(res.user ?? res);
    try { localStorage.setItem(this.KEY, res.token); localStorage.setItem(this.USER, JSON.stringify(res.user ?? res)); } catch {}
    this.user.set(user);
  }
  private loadUser(): User | null {
    try { const u = localStorage.getItem(this.USER); return u ? User.fromJson(JSON.parse(u)) : null; } catch { return null; }
  }
}
