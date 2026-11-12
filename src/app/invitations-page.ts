import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, AuthStore, message } from './api';
import { PersonalSessionStore } from './session';

type Invitation = { id: string; clientName: string; roleCode: string; expiresAt: string };
const KEY = 'beurba-pending-invitation';

@Component({
  selector: 'app-invitations',
  imports: [RouterLink],
  template: `
    <main class="page invitations-page">
      <div class="page-heading"><div><span class="eyebrow dark">MI CUENTA</span><h1>Invitaciones</h1>
        <p>Aceptá una invitación para trabajar con otro cliente.</p></div></div>
      @if (error) { <div class="alert error" role="alert">{{error}}</div> }
      @if (notice) { <div class="alert success" role="status">{{notice}}</div> }
      @if (!signedIn()) {
        <section class="panel"><h2>Ingresá con tu cuenta</h2><p>Usá tu email y clave o tu código personal. Después volvé a Invitaciones para aceptar.</p>
          <a class="primary" routerLink="/login">Ir a ingresar</a></section>
      } @else {
        @if (pendingId && pendingToken) {
          <section class="panel invite-action"><h2>Invitación recibida</h2>
            <p>La invitación se vinculará únicamente a la identidad con la que ingresaste.</p>
            <button class="primary" type="button" [disabled]="busy" (click)="accept()">{{busy?'Aceptando…':'Aceptar invitación'}}</button></section>
        }
        <section class="invite-list" aria-label="Invitaciones pendientes">
          @for (item of invitations; track item.id) {
            <article class="panel"><h2>{{item.clientName}}</h2><p>Rol: {{role(item.roleCode)}}</p>
              <small>Vence: {{date(item.expiresAt)}}</small>
              @if (item.id !== pendingId) { <p class="hint">Abrí el enlace que te compartieron para aceptarla.</p> }</article>
          } @empty { <div class="empty compact">No hay invitaciones pendientes.</div> }
        </section>
      }
    </main>
  `,
  styles: [`
    .invitations-page{min-width:0}.invite-action{margin:0 0 20px}.invite-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
    .invite-list .panel{min-width:0}.invite-list h2{overflow-wrap:anywhere}.invite-list small{color:#75695c}
    @media(max-width:600px){.invite-action .primary{width:100%}}
  `],
})
export class InvitationsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);
  private readonly personal = inject(PersonalSessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  invitations: Invitation[] = [];
  pendingId = '';
  pendingToken = '';
  busy = false;
  error = '';
  notice = '';
  signedIn() { return !!(this.personal.token() || this.auth.token()); }
  private mode(): 'admin' | 'person' { return this.personal.token() ? 'person' : 'admin'; }
  ngOnInit() {
    const fragment = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const id = fragment.get('id'); const token = fragment.get('token');
    if (id && token) sessionStorage.setItem(KEY, JSON.stringify({ id, token }));
    try { const pending = JSON.parse(sessionStorage.getItem(KEY) ?? '{}'); this.pendingId = pending.id ?? ''; this.pendingToken = pending.token ?? ''; }
    catch { sessionStorage.removeItem(KEY); }
    if (this.signedIn()) void this.load();
  }
  async load() {
    try { this.invitations = await this.api.get<Invitation[]>('auth/invitations', this.mode()); }
    catch (error) { this.error = message(error); }
    finally { this.cdr.detectChanges(); }
  }
  async accept() {
    this.busy = true; this.error = '';
    try {
      await this.api.post(`auth/invitations/${this.pendingId}/accept`, { token: this.pendingToken }, this.mode());
      sessionStorage.removeItem(KEY); this.pendingId = ''; this.pendingToken = '';
      this.notice = 'Invitación aceptada. Tu nuevo cliente ya está vinculado a tu cuenta.';
      await this.load();
    } catch (error) { this.error = message(error); }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
  role(code: string) { return code === 'ADMINISTRATOR' ? 'Administrador' : code === 'SITE_MANAGER' ? 'Jefe de obra' : 'Capataz'; }
  date(value: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value)); }
}
