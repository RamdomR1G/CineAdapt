import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Movie } from '../models/movie';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="card" [routerLink]="['/detail', movie.id]">
      @if (movie.posterUrl) { <img [src]="movie.posterUrl" [alt]="movie.title" loading="lazy" /> }
      @else { <div class="ph">CineAdapt</div> }
      <div class="t">{{ movie.title }}</div>
      <div class="s">{{ movie.typeLabel }}{{ movie.year ? ' · ' + movie.year : '' }}</div>
    </a>`,
  styles: [`:host{display:block}
    .card { display:block; width:100%; text-decoration:none; color:inherit; }
    img, .ph { width:100%; aspect-ratio:2/3; object-fit:cover; border-radius:10px; background:#1e293b; display:flex; align-items:center; justify-content:center; font-weight:700; color:#64748b; }
    .t { font-size:.85rem; font-weight:600; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .s { font-size:.72rem; opacity:.65; }
  `],
})
export class MovieCardComponent { @Input({ required: true }) movie!: Movie; }
