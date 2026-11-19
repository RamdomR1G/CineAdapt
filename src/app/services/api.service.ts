import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Movie } from '../models/movie';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBase;
  constructor(private http: HttpClient) {}

  async getCatalog(): Promise<Movie[]> {
    const data = await firstValueFrom(this.http.get<any[]>(`${this.base}/content?status=published`));
    return data.map(Movie.fromJson);
  }
  /** Practica 12: una pagina del catalogo con solo los campos de la tarjeta. El total viene en la cabecera X-Total-Count. */
  async getCatalogPage(limit: number, offset: number, search = ''): Promise<{ items: Movie[]; total: number }> {
    const q = `status=published&fields=card&limit=${limit}&offset=${offset}` + (search ? `&search=${encodeURIComponent(search)}` : '');
    const res = await firstValueFrom(this.http.get<any[]>(`${this.base}/content?${q}`, { observe: 'response' }));
    const items = (res.body ?? []).map(Movie.fromJson);
    return { items, total: Number(res.headers.get('X-Total-Count') ?? offset + items.length) };
  }
  async getMovie(id: number): Promise<Movie | null> {
    try { return Movie.fromJson(await firstValueFrom(this.http.get<any>(`${this.base}/content/${id}`))); }
    catch { return null; }
  }
  async getWatchlist(): Promise<Movie[]> {
    const data = await firstValueFrom(this.http.get<any[]>(`${this.base}/watchlist`));
    return data.map(Movie.fromJson);
  }
  addToWatchlist(id: number) { return firstValueFrom(this.http.post(`${this.base}/watchlist`, { content_id: id })); }
  removeFromWatchlist(id: number) { return firstValueFrom(this.http.delete(`${this.base}/watchlist/${id}`)); }

  // ── Soporte ──
  listReports(): Promise<any[]> { return firstValueFrom(this.http.get<any[]>(`${this.base}/reports`)); }
  getReport(id: number): Promise<any> { return firstValueFrom(this.http.get<any>(`${this.base}/reports/${id}`)); }
  createReport(title: string, description: string, priority: string, file?: File | null, idempotencyKey?: string): Promise<any> {
    const fd = new FormData();
    fd.append('title', title); fd.append('description', description); fd.append('priority', priority);
    if (file) fd.append('attachment', file);
    const headers = idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
    return firstValueFrom(this.http.post<any>(`${this.base}/reports`, fd, { headers }));
  }
  updateReport(id: number, changes: any): Promise<any> { return firstValueFrom(this.http.put<any>(`${this.base}/reports/${id}`, changes)); }
  assignReport(id: number, agentId: number | null): Promise<any> { return firstValueFrom(this.http.put<any>(`${this.base}/reports/${id}/assign`, { agent_id: agentId })); }
  deleteReport(id: number) { return firstValueFrom(this.http.delete(`${this.base}/reports/${id}`)); }
  listAgents(): Promise<any[]> { return firstValueFrom(this.http.get<any[]>(`${this.base}/agents`)); }
  setUserRole(email: string, role: 'user' | 'agent'): Promise<any> { return firstValueFrom(this.http.put<any>(`${this.base}/admin/users/role`, { email, role })); }

  // ── Mensajes y recomendaciones ──
  lookupUser(email: string): Promise<{ id: number; name: string }> {
    return firstValueFrom(this.http.get<any>(`${this.base}/users/lookup`, { params: { email } }));
  }
  sendMessage(toUserId: number, body: string, contentId?: number | null) {
    return firstValueFrom(this.http.post<any>(`${this.base}/messages`, { to_user_id: toUserId, content_id: contentId ?? null, body }));
  }
  listMessages(): Promise<any> { return firstValueFrom(this.http.get<any>(`${this.base}/messages`)); }
  clearMessages() { return firstValueFrom(this.http.delete(`${this.base}/messages`)); }
}
