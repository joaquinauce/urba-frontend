import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore, InstallPromptStore } from './api';
import { PersonalSessionStore, roleLabel } from './session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (!isPublic()) {
      <header class="topbar"><a class="brand" [routerLink]="homeLink()" aria-label="BeUrba, ir al inicio"><img class="brand-logo" src="/brand/beurba.jpeg" alt="B. Urba Desarrollos"></a>
        @if (auth.token()) { <button class="nav-toggle ghost small" type="button" (click)="menuOpen=!menuOpen" [attr.aria-expanded]="menuOpen" aria-controls="main-navigation">Menú</button><nav id="main-navigation" [class.open]="menuOpen">@if(auth.administrator()){<div class="nav-account-mobile"><strong>{{auth.administrator()?.fullName}}</strong><small>Administrador</small></div>}<a routerLink="/dashboard" (click)="menuOpen=false">Inicio</a><a routerLink="/obras" (click)="menuOpen=false">Obras</a><a routerLink="/personas" (click)="menuOpen=false">Personas</a><a routerLink="/capataces" (click)="menuOpen=false">Acceso legado</a><a routerLink="/instalar" (click)="menuOpen=false">Instalar</a></nav>@if(auth.administrator()){<div class="session-identity"><strong>{{auth.administrator()?.fullName}}</strong><small>Administrador</small></div>}<button class="ghost small" (click)="logout()" aria-label="Cerrar sesión administrativa">Salir</button> }
        @else if (personal.session()) { <button class="nav-toggle ghost small" type="button" (click)="menuOpen=!menuOpen" [attr.aria-expanded]="menuOpen" aria-controls="main-navigation">Menú</button><nav id="main-navigation" [class.open]="menuOpen"><div class="nav-account-mobile"><strong>{{personal.person()?.fullName}}</strong><small>{{personalRole()}}</small></div><a [routerLink]="personal.canWrite()?'/mis-obras':'/supervision'" (click)="menuOpen=false">Mis obras</a><a routerLink="/instalar" (click)="menuOpen=false">Instalar</a></nav><div class="session-identity"><strong>{{personal.person()?.fullName}}</strong><small>{{personalRole()}}</small></div><button class="ghost small" (click)="logoutPersonal()" aria-label="Cerrar sesión personal">Salir</button> }
      </header>
    }
    <router-outlet />
  `,
  styleUrl: './app.scss'
})
export class App {
  protected menuOpen = false;
  protected readonly auth = inject(AuthStore);
  protected readonly personal = inject(PersonalSessionStore);
  protected readonly installPrompt = inject(InstallPromptStore);
  private readonly router = inject(Router);
  protected isPublic() { return this.router.url.startsWith('/obra/') || this.router.url === '/mi-obra' || this.router.url === '/capataz'; }
  protected logout() { this.auth.clear(); this.router.navigateByUrl('/login'); }
  protected logoutPersonal() { this.personal.clear(); this.router.navigateByUrl('/login'); }
  protected personalRole() { return (this.personal.person()?.roles ?? []).map(roleLabel).join(' · '); }
  protected homeLink() { return this.auth.token() ? '/dashboard' : this.personal.canWrite() ? '/mis-obras' : this.personal.session() ? '/supervision' : '/login'; }
}
