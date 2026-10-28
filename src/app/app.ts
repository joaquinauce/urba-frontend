import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore, InstallPromptStore } from './api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (!isPublic()) {
      <header class="topbar"><a class="brand" routerLink="/dashboard"><span class="brand-mark">U</span> urba<span class="brand-dot">.</span></a>
        @if (auth.token()) { <nav><a routerLink="/dashboard">Inicio</a><a routerLink="/obras">Obras</a><a routerLink="/capataces">Capataces</a><a routerLink="/instalar">Instalar</a></nav><button class="ghost small" (click)="logout()">Salir</button> }
      </header>
    }
    <router-outlet />
  `,
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthStore);
  protected readonly installPrompt = inject(InstallPromptStore);
  private readonly router = inject(Router);
  protected isPublic() { return this.router.url.startsWith('/obra/'); }
  protected logout() { this.auth.clear(); this.router.navigateByUrl('/login'); }
}
