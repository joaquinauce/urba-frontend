import { Component, ChangeDetectorRef, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, message } from './api';

type Client = { id: string; name: string; isActive: boolean; primaryAdministratorEmail: string | null;
  contactPhone: string | null; address: string | null };
type ClientForm = { name: string; administratorName: string; administratorEmail: string; password: string;
  contactPhone: string; address: string };
type Modal = 'create' | 'edit' | 'status' | null;
const emptyForm = (): ClientForm => ({ name: '', administratorName: '', administratorEmail: '', password: '',
  contactPhone: '', address: '' });

@Component({
  selector: 'app-clients',
  imports: [FormsModule],
  template: `
    <main class="page clients-page">
      <div class="page-heading"><div><span class="eyebrow dark">PLATAFORMA</span><h1>Clientes</h1>
        <p>Administrá los clientes y sus datos de contacto.</p></div>
        <button class="primary" type="button" (click)="openCreate()">Nuevo cliente</button></div>
      @if (error) { <div class="alert error" role="alert">{{error}}</div> }
      @if (notice) { <div class="alert success" role="status">{{notice}}</div> }
      <section class="panel clients-grid-wrap" aria-label="Clientes registrados">
        <div class="clients-grid-head"><span>Cliente</span><span>Administrador inicial</span><span>Contacto</span><span>Estado</span><span>Acciones</span></div>
        @for (client of clients; track client.id) {
          <div class="clients-grid-row">
            <strong class="client-name">{{client.name}}</strong>
            <span class="client-email">{{client.primaryAdministratorEmail || 'Sin email'}}</span>
            <span class="client-contact">@if(client.contactPhone){<span>{{client.contactPhone}}</span>}@if(client.address){<small>{{client.address}}</small>}@if(!client.contactPhone && !client.address){<small>Sin datos</small>}</span>
            <span><span class="status" [class.verde]="client.isActive">{{client.isActive?'Activo':'Inactivo'}}</span></span>
            <span class="client-actions"><button class="ghost small" type="button" [disabled]="busy" (click)="openEdit(client)">Editar</button>
              <button class="ghost small" type="button" [disabled]="busy" (click)="openStatus(client)">{{client.isActive?'Desactivar':'Activar'}}</button></span>
          </div>
        } @empty { <div class="empty compact">Todavía no hay clientes.</div> }
      </section>
    </main>
    @if (modal === 'create' || modal === 'edit') {
      <div class="app-modal-backdrop" (click)="closeModal()"><section class="app-modal client-modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title" (click)="$event.stopPropagation()">
        <div class="app-modal-head"><div><span class="eyebrow dark">PLATAFORMA</span><h2 id="client-modal-title">{{modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}}</h2></div>
          <button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeModal()">×</button></div>
        <form (ngSubmit)="save()"><div class="client-fields">
          <label>Nombre del cliente<input name="name" [(ngModel)]="form.name" maxlength="180" required autofocus></label>
          @if (modal === 'create') {<label>Nombre del administrador inicial<input name="administratorName" [(ngModel)]="form.administratorName" maxlength="160" required></label>}
          <label>Correo del administrador inicial<input name="administratorEmail" type="email" [(ngModel)]="form.administratorEmail" maxlength="320" required></label>
          @if (modal === 'create') {<label>Clave inicial<span class="password-field"><input name="password" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="form.password" minlength="12" autocomplete="new-password" required><button type="button" class="password-toggle" [attr.aria-label]="showPassword ? 'Ocultar clave inicial' : 'Mostrar clave inicial'" [attr.aria-pressed]="showPassword" (click)="showPassword = !showPassword"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showPassword){<path d="M3 3l18 18"/>}</svg></button></span></label>}
          <label>Teléfono de contacto <small>(opcional)</small><input name="contactPhone" type="tel" [(ngModel)]="form.contactPhone" maxlength="40"></label>
          <label>Dirección <small>(opcional)</small><input name="address" [(ngModel)]="form.address" maxlength="300"></label>
        </div>@if (modalError) {<div class="alert error" role="alert">{{modalError}}</div>}
        <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button>
          <button class="primary" [disabled]="busy">{{busy ? 'Guardando…' : modal === 'create' ? 'Crear cliente' : 'Guardar cambios'}}</button></div></form>
      </section></div>
    }
    @if (modal === 'status' && selected) {
      <div class="app-modal-backdrop" (click)="closeModal()"><section class="app-modal status-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="client-status-title" (click)="$event.stopPropagation()">
        <div class="app-modal-head"><div><span class="eyebrow dark">CLIENTE</span><h2 id="client-status-title">{{selected.isActive ? 'Desactivar cliente' : 'Activar cliente'}}</h2></div>
          <button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeModal()">×</button></div>
        <div class="status-confirm-message"><div class="status-confirm-icon" aria-hidden="true">!</div><p class="modal-intro">@if(selected.isActive){¿Desactivar <strong>{{selected.name}}</strong>? Sus usuarios perderán acceso mientras esté inactivo.}@else{¿Activar <strong>{{selected.name}}</strong>?}</p></div>
        @if (modalError) {<div class="alert error" role="alert">{{modalError}}</div>}
        <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button>
          <button class="primary" type="button" [disabled]="busy" (click)="saveStatus()">{{busy ? 'Guardando…' : selected.isActive ? 'Desactivar' : 'Activar'}}</button></div>
      </section></div>
    }
  `,
  styles: [`
    .clients-grid-wrap{padding:0;overflow:hidden}.clients-grid-head,.clients-grid-row{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1.5fr) minmax(0,1.2fr) minmax(0,.5fr) minmax(0,1fr);gap:16px;align-items:center;padding:16px 20px}
    .clients-grid-head{background:#f1f5f0;color:#63776b;font-size:.76rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.clients-grid-row{border-top:1px solid #e8eee8;font-size:.9rem}
    .client-name,.client-email,.client-contact{min-width:0;overflow-wrap:anywhere}.client-contact span,.client-contact small{display:block}.client-contact small{margin-top:4px}.client-actions{display:flex;gap:7px;justify-content:flex-end}
    .client-modal{width:min(100%,650px)}.client-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.client-fields label{min-width:0}
    @media(max-width:850px){.clients-grid-head{display:none}.clients-grid-row{grid-template-columns:1fr auto;gap:10px;padding:20px}.client-name{grid-column:1}.client-email,.client-contact{grid-column:1/-1}.client-actions{grid-column:1/-1;justify-content:flex-start}}
    @media(max-width:620px){.client-fields{grid-template-columns:1fr}.client-actions button{flex:1}.clients-page .page-heading>.primary{width:100%}}
  `],
})
export class ClientsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  clients: Client[] = [];
  busy = false;
  error = '';
  notice = '';
  modalError = '';
  modal: Modal = null;
  selected: Client | null = null;
  showPassword = false;
  form = emptyForm();
  ngOnInit() { void this.load(); }
  async load() {
    try { this.clients = await this.api.get<Client[]>('platform/clients'); }
    catch (error) { this.error = message(error); }
    finally { this.cdr.detectChanges(); }
  }
  openCreate() { this.selected = null; this.form = emptyForm(); this.showPassword = false; this.modalError = ''; this.modal = 'create'; this.cdr.detectChanges(); }
  openEdit(client: Client) { this.selected = client; this.form = { ...emptyForm(), name: client.name,
    administratorEmail: client.primaryAdministratorEmail || '', contactPhone: client.contactPhone || '', address: client.address || '' };
    this.modalError = ''; this.modal = 'edit'; this.cdr.detectChanges(); }
  openStatus(client: Client) { this.selected = client; this.modalError = ''; this.modal = 'status'; this.cdr.detectChanges(); }
  closeModal() { if (this.busy) return; this.modal = null; this.selected = null; this.showPassword = false; this.form = emptyForm(); this.modalError = ''; this.cdr.detectChanges(); }
  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }
  async save() {
    if (this.busy || (this.modal !== 'create' && this.modal !== 'edit')) return;
    this.busy = true; this.modalError = ''; this.notice = '';
    try {
      if (this.modal === 'create') {
        await this.api.post('platform/clients', this.form);
        this.notice = 'Cliente creado.';
      } else if (this.selected) {
        await this.api.patch(`platform/clients/${this.selected.id}`, { name: this.form.name,
          administratorEmail: this.form.administratorEmail, contactPhone: this.form.contactPhone, address: this.form.address });
        this.notice = 'Cliente actualizado.';
      }
      this.busy = false; this.closeModal(); await this.load();
    } catch (error) { this.modalError = message(error); }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
  async saveStatus() {
    if (this.busy || !this.selected) return;
    this.busy = true; this.modalError = ''; this.notice = '';
    try {
      const client = this.selected;
      await this.api.patch(`platform/clients/${client.id}`, { isActive: !client.isActive });
      this.notice = client.isActive ? 'Cliente desactivado.' : 'Cliente activado.';
      this.busy = false; this.closeModal(); await this.load();
    } catch (error) { this.modalError = message(error); }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
}
