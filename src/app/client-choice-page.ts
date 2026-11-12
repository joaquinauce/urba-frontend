import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Api, AuthStore, ForemanStore, message } from './api';
import { ClientSelectionStore, WorkSelectionStore, applyLoginResult, validToken, type ClientOption, type LoginResult } from './context';
import { PersonalSessionStore } from './session';

@Component({
  selector: 'app-client-choice',
  template: `
    <main class="page client-choice-page">
      <div class="page-heading"><div><span class="eyebrow dark">TU CUENTA</span><h1>Elegí un cliente</h1>
        <p>Vas a trabajar únicamente con los datos del cliente que selecciones.</p></div></div>
      @if (error) { <div class="alert error" role="alert">{{error}}</div> }
      @if (loading) { <div class="empty compact">Cargando clientes…</div> }
      @else if (!clients.length) { <div class="empty compact">No tenés clientes activos. Consultá con un administrador.</div> }
      @else { <div class="client-options">
        @for (client of clients; track client.clientId) {
          <button class="panel client-option" type="button" [disabled]="busy" (click)="choose(client)">
            <strong>{{client.name}}</strong><small>{{roleNames(client.roles)}}</small><span>Ingresar →</span>
          </button>
        }
      </div> }
      <button class="ghost" type="button" (click)="logout()">Cerrar sesión</button>
    </main>
  `,
  styles: [`
    .client-choice-page{min-width:0}.client-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px;margin:24px 0}
    .client-option{text-align:left;display:flex;flex-direction:column;gap:12px;min-height:150px;cursor:pointer;border:1px solid #ded6c8;background:#fff;color:inherit}
    .client-option strong{font-size:1.25rem}.client-option small{color:#6e6257}.client-option span{margin-top:auto;font-weight:700}
    .client-option:focus-visible{outline:3px solid #816f49;outline-offset:2px}
    @media(max-width:600px){.client-options{grid-template-columns:1fr}.client-option{min-height:120px}}
  `],
})
export class ClientChoicePage implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  private readonly personal = inject(PersonalSessionStore);
  private readonly foreman = inject(ForemanStore);
  private readonly selection = inject(ClientSelectionStore);
  private readonly works = inject(WorkSelectionStore);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  clients: ClientOption[] = [];
  loading = true; busy = false; error = '';

  ngOnInit() { void this.load(); }
  async load() {
    let pending = this.selection.pending();
    if (pending && !validToken(pending.selectionToken)) { this.selection.clear(); pending = null; }
    try {
      if (pending) this.clients = pending.clients;
      else if (this.auth.token() || this.personal.token())
        this.clients = await this.api.get<ClientOption[]>('auth/contexts', this.auth.token() ? 'admin' : 'person');
      else { await this.router.navigateByUrl('/login'); return; }
      this.selection.setAvailable(this.clients.length);
      if (this.clients.length === 1) await this.choose(this.clients[0]);
    } catch (error) { this.error = message(error); }
    finally { this.loading = false; this.cdr.detectChanges(); }
  }
  async choose(client: ClientOption) {
    if (this.busy) return;
    this.busy = true; this.error = '';
    try {
      const pending = this.selection.pending();
      const result = pending
        ? await this.api.post<LoginResult>(pending.mode === 'pin' ? 'auth/personal/select-client' : 'auth/select-client',
          { selectionToken: pending.selectionToken, clientId: client.clientId }, 'public')
        : await this.api.post<LoginResult>('auth/switch-client', { clientId: client.clientId }, this.auth.token() ? 'admin' : 'person');
      const destination = applyLoginResult(result, this.auth, this.personal, this.foreman, this.works, this.selection);
      await this.router.navigateByUrl(destination);
    } catch (error) { this.error = message(error); }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
  logout() { this.selection.reset(); this.works.clear(); this.auth.clear(); this.personal.clear(); this.foreman.clear(); void this.router.navigateByUrl('/login'); }
  roleNames(roles: string[]) { return roles.map(role => role === 'ADMINISTRATOR' ? 'Administrador'
    : role === 'SITE_MANAGER' ? 'Jefe de obra' : 'Capataz').join(' · '); }
}
