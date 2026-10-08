import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
