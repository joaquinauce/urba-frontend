import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, message } from './api';

type ExpenseType = { id: string; name: string; isActive: boolean };

@Component({
  selector: 'app-settings-hub',
  imports: [RouterLink],
  template: `
    <main class="page">
      <div class="page-heading"><div><span class="eyebrow dark">ADMINISTRACIÓN</span><h1>Configuración</h1><p>Administrá las opciones que se usan en la aplicación.</p></div></div>
      <div class="settings-options">
        <a class="settings-option" routerLink="/configuracion/tipos-de-gasto">
          <span class="settings-option-icon" aria-hidden="true">▤</span>
          <div><h2>Tipos de gasto</h2><p>Creá y administrá las categorías para las rendiciones.</p><span class="settings-option-action">Configurar →</span></div>
        </a>
      </div>
    </main>`,
  styles: [`
    .settings-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,380px));gap:18px}
    .settings-option{display:flex;align-items:flex-start;gap:18px;padding:25px;border:1px solid #e9e1d6;border-radius:18px;background:#fff;box-shadow:0 6px 28px #16362a08;transition:border-color .15s,transform .15s}
    .settings-option:hover{border-color:#f0b567;transform:translateY(-2px)}.settings-option:focus-visible{outline:3px solid #fb8d00;outline-offset:3px}
    .settings-option-icon{display:grid;place-items:center;flex:none;width:46px;height:46px;border-radius:12px;background:#fff2e3;color:#a65a00;font-size:1.6rem}
    h2{margin:1px 0 8px}p{margin:0 0 16px;color:#75695c;font-size:.9rem}.settings-option-action{color:#9b590d;font-size:.84rem;font-weight:800}
  `],
})
export class SettingsHubPage {}

@Component({
  selector: 'app-expense-types-settings',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page expense-types-settings">
      <a class="back" routerLink="/configuracion">← Configuración</a>
      <div class="page-heading"><div><span class="eyebrow dark">CONFIGURACIÓN</span><h1>Tipos de gasto</h1><p>Definí las categorías disponibles para registrar gastos.</p></div></div>
      @if (error) { <div class="alert error" role="alert">{{ error }}</div> }
      @if (notice) { <div class="alert success" role="status">{{ notice }}</div> }
      <section class="panel expense-types"><div class="section-title"><h2>Tipos de gastos</h2></div>
        <form class="expense-type-form" (ngSubmit)="saveType()"><label>Nuevo tipo<input name="typeName" [(ngModel)]="typeName" maxlength="100" required></label><button class="primary" [disabled]="typeBusy">Crear tipo</button></form>
        @for (type of types; track type.id) { <div class="expense-row"><div><strong>{{ type.name }}</strong><span class="expense-status" [class.enabled]="type.isActive" [class.disabled]="!type.isActive">{{ type.isActive ? 'Habilitado' : 'Deshabilitado' }}</span></div><button type="button" class="ghost small" (click)="editType(type)">Editar</button><button type="button" class="ghost small" (click)="toggleType(type)">{{ type.isActive ? 'Deshabilitar' : 'Habilitar' }}</button></div> }
      </section>
      @if (editingType) {<div class="app-modal-backdrop" (click)="closeTypeModal()"><section class="app-modal expense-type-modal" role="dialog" aria-modal="true" aria-labelledby="edit-expense-type-title" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">TIPOS DE GASTOS</span><h2 id="edit-expense-type-title">Editar tipo</h2></div><button type="button" class="app-modal-close" aria-label="Cerrar" (click)="closeTypeModal()">×</button></div><form (ngSubmit)="saveEdit()"><label>Nombre<input name="editTypeName" [(ngModel)]="editTypeName" maxlength="100" required autofocus></label>@if (modalError) {<div class="alert error" role="alert">{{ modalError }}</div>}<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeTypeModal()">Cancelar</button><button class="primary" [disabled]="typeBusy">{{ typeBusy ? 'Guardando…' : 'Guardar cambios' }}</button></div></form></section></div>}
      @if (confirmType) {<div class="app-modal-backdrop" (click)="closeTypeModal()"><section class="app-modal status-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="disable-expense-type-title" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">TIPOS DE GASTOS</span><h2 id="disable-expense-type-title">Deshabilitar tipo</h2></div><button type="button" class="app-modal-close" aria-label="Cerrar" (click)="closeTypeModal()">×</button></div><div class="status-confirm-message"><div class="status-confirm-icon" aria-hidden="true">!</div><p class="modal-intro">¿Deshabilitar <strong>{{ confirmType.name }}</strong>? Dejará de aparecer en nuevas rendiciones.</p></div>@if (modalError) {<div class="alert error" role="alert">{{ modalError }}</div>}<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeTypeModal()">Cancelar</button><button class="primary" type="button" [disabled]="typeBusy" (click)="confirmDisable()">{{ typeBusy ? 'Guardando…' : 'Deshabilitar' }}</button></div></section></div>}
    </main>`,
})
export class ExpenseTypesSettingsPage implements OnInit {
  private api = inject(Api); private cdr = inject(ChangeDetectorRef);
  types: ExpenseType[] = []; typeBusy = false; typeName = ''; editingType: ExpenseType | null = null; editTypeName = ''; confirmType: ExpenseType | null = null; modalError = ''; error = ''; notice = '';
  ngOnInit() { void this.load(); }
  @HostListener('document:keydown.escape') onEscape() { if (this.editingType || this.confirmType) this.closeTypeModal(); }
  async load() {
    try { this.types = await this.api.get<ExpenseType[]>('admin/expenses/types'); }
    catch (error) { this.error = message(error); }
    finally { this.cdr.detectChanges(); }
  }
  editType(type: ExpenseType) { this.editingType = type; this.editTypeName = type.name; this.modalError = ''; this.cdr.detectChanges(); }
  closeTypeModal() { if (this.typeBusy) return; this.editingType = null; this.confirmType = null; this.editTypeName = ''; this.modalError = ''; this.cdr.detectChanges(); }
  async saveType() {
    this.error = ''; this.notice = ''; this.typeBusy = true;
    try {
      await this.api.post('admin/expenses/types', { name: this.typeName });
      this.types = await this.api.get<ExpenseType[]>('admin/expenses/types'); this.typeName = ''; this.notice = 'Tipo creado.';
    } catch (error) { this.error = message(error); }
    finally { this.typeBusy = false; this.cdr.detectChanges(); }
  }
  async saveEdit() {
    if (!this.editingType || this.typeBusy) return;
    this.modalError = ''; this.notice = ''; this.typeBusy = true;
    try {
      await this.api.patch(`admin/expenses/types/${this.editingType.id}`, { name: this.editTypeName.trim() });
      this.types = await this.api.get<ExpenseType[]>('admin/expenses/types'); this.notice = 'Tipo actualizado.';
      this.editingType = null; this.editTypeName = '';
    } catch (error) { this.modalError = message(error); }
    finally { this.typeBusy = false; this.cdr.detectChanges(); }
  }
  async toggleType(type: ExpenseType) {
    if (type.isActive) { this.confirmType = type; this.modalError = ''; this.cdr.detectChanges(); return; }
    this.error = ''; this.notice = '';
    try { await this.api.patch(`admin/expenses/types/${type.id}/active`, { isActive: true }); this.types = await this.api.get<ExpenseType[]>('admin/expenses/types'); this.notice = 'Tipo habilitado.'; }
    catch (error) { this.error = message(error); }
    finally { this.cdr.detectChanges(); }
  }
  async confirmDisable() {
    if (!this.confirmType || this.typeBusy) return;
    this.modalError = ''; this.notice = ''; this.typeBusy = true;
    try {
      await this.api.patch(`admin/expenses/types/${this.confirmType.id}/active`, { isActive: false });
      this.types = await this.api.get<ExpenseType[]>('admin/expenses/types'); this.notice = 'Tipo deshabilitado.'; this.confirmType = null;
    } catch (error) { this.modalError = message(error); }
    finally { this.typeBusy = false; this.cdr.detectChanges(); }
  }
}
