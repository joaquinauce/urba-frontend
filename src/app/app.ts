import { ChangeDetectorRef, Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Api, AuthStore, InstallPromptStore, message } from './api';
import { PersonalSessionStore, roleLabel } from './session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule],
  template: `
    @if (!isPublic()) {
      <header class="topbar"><a class="brand" [routerLink]="homeLink()" aria-label="BeUrba, ir al inicio"><img class="brand-logo" src="/brand/beurba.jpeg" alt="B. Urba Desarrollos"></a>
        @if (auth.token()) { <button class="nav-toggle ghost small" type="button" (click)="menuOpen=!menuOpen" [attr.aria-expanded]="menuOpen" aria-controls="main-navigation">Menú</button><nav id="main-navigation" [class.open]="menuOpen">@if(auth.administrator()){<div class="nav-account-mobile"><strong>{{auth.administrator()?.fullName}}</strong><small>Administrador</small></div>}<a routerLink="/dashboard" (click)="menuOpen=false">Inicio</a><a routerLink="/obras" (click)="menuOpen=false">Obras</a><a routerLink="/rendiciones" (click)="menuOpen=false">Rendiciones</a><a routerLink="/personas" (click)="menuOpen=false">Personas</a><a routerLink="/capataces" (click)="menuOpen=false">Capataces</a><a routerLink="/instalar" (click)="menuOpen=false">Instalar</a></nav>@if(auth.administrator()){<div class="session-identity"><strong>{{auth.administrator()?.fullName}}</strong><small>Administrador</small></div>}<button class="ghost small" type="button" (click)="openPassword()">Mi clave</button><button class="ghost small" (click)="logout()" aria-label="Cerrar sesión administrativa">Salir</button> }
        @else if (personal.session()) { <button class="nav-toggle ghost small" type="button" (click)="menuOpen=!menuOpen" [attr.aria-expanded]="menuOpen" aria-controls="main-navigation">Menú</button><nav id="main-navigation" [class.open]="menuOpen"><div class="nav-account-mobile"><strong>{{personal.person()?.fullName}}</strong><small>{{personalRole()}}</small></div><a [routerLink]="personal.canWrite()?'/mis-obras':'/supervision'" (click)="menuOpen=false">Mis obras</a><a routerLink="/instalar" (click)="menuOpen=false">Instalar</a></nav><div class="session-identity"><strong>{{personal.person()?.fullName}}</strong><small>{{personalRole()}}</small></div>@if(personal.person()?.roles?.includes('SITE_MANAGER')){<button class="ghost small" type="button" (click)="openPassword()">Mi clave</button>}<button class="ghost small" (click)="logoutPersonal()" aria-label="Cerrar sesión personal">Salir</button> }
      </header>
    }
    @if (passwordOpen) {<div class="app-modal-backdrop" (click)="closePassword()"><section class="app-modal" role="dialog" aria-modal="true" aria-label="Cambiar mi clave" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">MI CUENTA</span><h2>Cambiar mi clave</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closePassword()">×</button></div>@if(passwordChanged){<p>Clave actualizada. Ingresá de nuevo con tu nueva clave.</p><button class="primary" type="button" (click)="closePassword()">Ir a ingresar</button>}@else{<form (ngSubmit)="saveOwnPassword()"><label>Clave actual<span class="password-field"><input [type]="showCurrentPassword ? 'text' : 'password'" name="currentPassword" [(ngModel)]="currentPassword" required autocomplete="current-password"><button type="button" class="password-toggle" [attr.aria-label]="showCurrentPassword ? 'Ocultar clave actual' : 'Mostrar clave actual'" [attr.aria-pressed]="showCurrentPassword" (click)="showCurrentPassword=!showCurrentPassword"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showCurrentPassword){<path d="M3 3l18 18"/>}</svg></button></span></label><label>Nueva clave<span class="password-field"><input [type]="showNewPassword ? 'text' : 'password'" name="newPassword" [(ngModel)]="newPassword" required minlength="10" autocomplete="new-password"><button type="button" class="password-toggle" [attr.aria-label]="showNewPassword ? 'Ocultar nueva clave' : 'Mostrar nueva clave'" [attr.aria-pressed]="showNewPassword" (click)="showNewPassword=!showNewPassword"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showNewPassword){<path d="M3 3l18 18"/>}</svg></button></span></label><label>Repetir nueva clave<span class="password-field"><input [type]="showConfirmPassword ? 'text' : 'password'" name="confirmPassword" [(ngModel)]="confirmPassword" required minlength="10" autocomplete="new-password"><button type="button" class="password-toggle" [attr.aria-label]="showConfirmPassword ? 'Ocultar repetir nueva clave' : 'Mostrar repetir nueva clave'" [attr.aria-pressed]="showConfirmPassword" (click)="showConfirmPassword=!showConfirmPassword"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showConfirmPassword){<path d="M3 3l18 18"/>}</svg></button></span></label>@if(passwordError){<div class="alert error">{{passwordError}}</div>}<div class="actions modal-actions"><button class="ghost" type="button" (click)="closePassword()">Cancelar</button><button class="primary" [disabled]="passwordBusy">{{passwordBusy?'Guardando…':'Cambiar clave'}}</button></div></form>}</section></div>}
    <router-outlet />
  `,
  styleUrl: './app.scss'
})
export class App {
  protected menuOpen = false;
  protected readonly auth = inject(AuthStore);
  protected readonly personal = inject(PersonalSessionStore);
  protected readonly installPrompt = inject(InstallPromptStore);
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  protected passwordOpen = false;
  protected passwordChanged = false;
  protected passwordBusy = false;
  protected passwordError = '';
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected showCurrentPassword = false;
  protected showNewPassword = false;
  protected showConfirmPassword = false;
  private readonly router = inject(Router);
  protected isPublic() { return this.router.url.startsWith('/obra/') || this.router.url === '/mi-obra' || this.router.url === '/capataz'; }
  protected logout() { this.auth.clear(); this.router.navigateByUrl('/login'); }
  protected logoutPersonal() { this.personal.clear(); this.router.navigateByUrl('/login'); }
  protected personalRole() { return (this.personal.person()?.roles ?? []).map(roleLabel).join(' · '); }
  protected homeLink() { return this.auth.token() ? '/dashboard' : this.personal.canWrite() ? '/mis-obras' : this.personal.session() ? '/supervision' : '/login'; }
  protected openPassword() { this.passwordOpen = true; this.passwordChanged = false; this.passwordError = ''; this.currentPassword = this.newPassword = this.confirmPassword = ''; this.showCurrentPassword = this.showNewPassword = this.showConfirmPassword = false; }
  protected closePassword() { if (this.passwordBusy) return; this.passwordOpen = false; if (this.passwordChanged) { if (this.auth.token()) this.logout(); else this.logoutPersonal(); } }
  @HostListener('document:keydown.escape') protected onEscape() { if (this.passwordOpen) this.closePassword(); }
  protected async saveOwnPassword() {
    if (this.newPassword !== this.confirmPassword) { this.passwordError = 'Las claves nuevas no coinciden.'; return; }
    this.passwordBusy = true; this.passwordError = '';
    try {
      if (this.auth.token()) await this.api.post('auth/password', { currentPassword: this.currentPassword, newPassword: this.newPassword });
      else await this.api.post('member/password', { currentPassword: this.currentPassword, newPassword: this.newPassword }, 'person');
      this.passwordChanged = true; this.currentPassword = this.newPassword = this.confirmPassword = '';
    } catch (error) { this.passwordError = message(error); }
    finally { this.passwordBusy = false; this.cdr.detectChanges(); }
  }
}
