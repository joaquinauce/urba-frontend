import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, type Foreman, type PersonSummary, type Work, type WorkAssignment, localDate, message } from './api';
import { DateField } from './date-field';
import { formatArDate } from './date';
import { SearchSelect, type SearchOption } from './search-select';

type WorkForm = {
  name: string; description: string; location: string; startDate: string; estimatedEndDate: string;
  foremanId: string; siteManagerId: string; closeTime: string; accessAlias: string; aliasPin: string;
};
type Access = { url: string; qrDataUrl: string };
const dayDifference = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

@Component({
  selector: 'app-works',
  imports: [FormsModule, RouterLink, DateField, SearchSelect],
  template: `
    <main class="page works-page">
      <div class="page-heading works-heading"><div><span class="eyebrow dark">PROYECTOS</span><h1>Obras</h1><p>Organizá cada obra y asigná responsables.</p></div><button class="primary" type="button" (click)="openNew()">+ Nueva obra</button></div>
      @if (listError) { <div class="alert error" role="alert">{{ listError }}</div> }
      @if (access) { <section class="panel access-panel"><h2>Acceso del capataz</h2><p>Guardá este enlace o QR ahora. Por seguridad, el código se muestra una sola vez.</p><a [href]="access.url" target="_blank" rel="noopener">{{ access.url }}</a><img [src]="access.qrDataUrl" alt="Código QR de la obra"><button class="ghost" type="button" (click)="copyAccess()">Copiar enlace</button></section> }
      @if (!works.length) { <div class="empty compact">Todavía no hay obras.</div> }
      <div class="works-grid">
        @for (work of works; track work.id) {
          <article class="panel works-card">
            <div class="works-card-top"><span class="work-state" [class.paused]="displayState(work)==='PAUSADA'" [class.finished]="displayState(work)==='FINALIZADA'">{{ stateLabel(work) }}</span><span class="works-card-date">{{ arDate(work.startDate) }} → {{ arDate(work.estimatedEndDate) }}</span></div>
            <h2>{{ work.name }}</h2><p class="works-card-location">{{ work.location || 'Sin ubicación' }}</p>
            <div class="works-card-detail"><span>Capataz</span><strong>{{ work.foremanName }}</strong></div>
            <p class="works-card-progress">{{ stateDescription(work) }}</p>
            @if (displayState(work)==='PAUSADA' && work.pauseReason) { <p class="works-card-reason"><strong>Motivo:</strong> {{ work.pauseReason }}</p> }
            <div class="works-card-actions"><button class="ghost small" type="button" (click)="openEdit(work)">Editar obra</button><a class="ghost small" [routerLink]="['/obras',work.id]">Ver obra ↗</a>@if(work.status==='PAUSADA'){<button class="primary small" type="button" (click)="openResume(work)">Reactivar</button>}@else if(displayState(work)!=='FINALIZADA'){<button class="ghost small" type="button" (click)="openPause(work)">Pausar</button>}</div>
          </article>
        }
      </div>
      @if (formOpen) {
        <div class="app-modal-backdrop works-modal-backdrop"><section class="app-modal works-form-modal" role="dialog" aria-modal="true" [attr.aria-label]="editing ? 'Editar obra' : 'Nueva obra'">
          <div class="app-modal-head"><div><span class="eyebrow dark">PROYECTOS</span><h2>{{ editing ? 'Editar obra' : 'Nueva obra' }}</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeForm()">×</button></div>
          @if (formLoading) { <div class="empty compact">Cargando obra…</div> }
          @else { <form (ngSubmit)="save()" class="works-form">
            <div class="works-form-grid">
              <label>Nombre de obra<input name="name" [(ngModel)]="form.name" required maxlength="180" placeholder="Ej. Iluminación Ciudad"></label>
              <label>Ubicación<input name="location" [(ngModel)]="form.location"></label>
              <label class="works-field-wide">Descripción<textarea class="works-description" name="description" [(ngModel)]="form.description" rows="2"></textarea></label>
              <label>Fecha de inicio<app-date-field name="startDate" [(ngModel)]="form.startDate" [required]="true"></app-date-field></label>
              <label>Finalización estimada<app-date-field name="estimatedEndDate" [(ngModel)]="form.estimatedEndDate" [required]="true"></app-date-field></label>
              <label>Capataz responsable<app-search-select name="foremanId" [(ngModel)]="form.foremanId" [options]="foremanOptions" label="Capataz responsable" placeholder="Buscar capataz"></app-search-select></label>
              <label>Jefe de obra<app-search-select name="siteManagerId" [(ngModel)]="form.siteManagerId" [options]="managerOptions" label="Jefe de obra" placeholder="Buscar jefe de obra"></app-search-select></label>
              <label>Hora de cierre<input name="closeTime" type="time" [(ngModel)]="form.closeTime"></label>
              <label>Alias de acceso (opcional)<input name="accessAlias" [(ngModel)]="form.accessAlias" maxlength="40" autocapitalize="characters" placeholder="ILUMINACION-CIUDAD"></label>
              <label>PIN de obra de 6 dígitos {{ editing ? '(dejalo vacío para conservar el actual)' : '' }}<span class="password-field"><input name="aliasPin" [type]="showAliasPin ? 'text' : 'password'" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" [(ngModel)]="form.aliasPin" (ngModelChange)="sanitizePin()" autocomplete="new-password"><button type="button" class="password-toggle" [attr.aria-label]="showAliasPin ? 'Ocultar PIN de obra' : 'Mostrar PIN de obra'" (click)="showAliasPin=!showAliasPin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showAliasPin){<path d="M3 3l18 18"/>}</svg></button></span></label>
            </div>
            @if (formError) { <div class="alert error" role="alert">{{ formError }}</div> }
            <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeForm()">Cancelar</button><button class="primary" [disabled]="busy || !foremanOptions.length || !formReady">{{ busy ? 'Guardando…' : 'Guardar obra' }}</button></div>
          </form> }
        </section></div>
      }
      @if (pauseTarget) { <div class="app-modal-backdrop" (click)="closeAction()"><section class="app-modal status-confirm-modal" role="dialog" aria-modal="true" aria-label="Pausar obra" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">OBRAS</span><h2>Pausar obra</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeAction()">×</button></div><p class="modal-intro">Indicá por qué se pausa <strong>{{ pauseTarget.name }}</strong>.</p><form (ngSubmit)="confirmPause()"><label>Motivo de la pausa<textarea name="pauseReason" [(ngModel)]="pauseReason" required maxlength="1000" rows="3"></textarea></label>@if(actionError){<div class="alert error" role="alert">{{actionError}}</div>}<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeAction()">Cancelar</button><button class="primary" [disabled]="busy">{{busy?'Guardando…':'Pausar obra'}}</button></div></form></section></div> }
      @if (resumeTarget) { <div class="app-modal-backdrop" (click)="closeAction()"><section class="app-modal status-confirm-modal" role="dialog" aria-modal="true" aria-label="Reactivar obra" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">OBRAS</span><h2>Reactivar obra</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeAction()">×</button></div><p class="modal-intro">Seleccioná una nueva fecha de finalización estimada para <strong>{{ resumeTarget.name }}</strong>.</p><form (ngSubmit)="confirmResume()"><label>Nueva finalización estimada<app-date-field name="resumeEndDate" [(ngModel)]="resumeEndDate" [required]="true"></app-date-field></label>@if(actionError){<div class="alert error" role="alert">{{actionError}}</div>}<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeAction()">Cancelar</button><button class="primary" [disabled]="busy">{{busy?'Guardando…':'Reactivar obra'}}</button></div></form></section></div> }
    </main>`,
  styles: [`
    .works-page{min-width:0}.works-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.works-heading .primary{flex:none}.works-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:18px;min-width:0}.works-card{display:flex;flex-direction:column;min-width:0;margin:0}.works-card-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.work-state{padding:6px 10px;border-radius:999px;background:#e4f1e9;color:#23744e;font-size:.74rem;font-weight:800}.work-state.paused{background:#fff1de;color:#a45b08}.work-state.finished{background:#eeeae5;color:#75695c}.works-card-date{color:#75695c;font-size:.75rem}.works-card h2{margin:18px 0 3px;overflow-wrap:anywhere}.works-card-location{margin:0 0 18px;color:#75695c;font-size:.85rem}.works-card-detail{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #ede6dc;font-size:.84rem}.works-card-detail span{color:#75695c}.works-card-detail strong{text-align:right;overflow-wrap:anywhere}.works-card-progress{margin:10px 0 0;font-weight:700;color:#15564b}.works-card-reason{margin:8px 0 0;overflow-wrap:anywhere;color:#75695c;font-size:.82rem}.works-card-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:20px}.works-card-actions>*{flex:1 1 auto;text-align:center}.works-modal-backdrop{padding:14px}.works-form-modal{width:min(100%,1100px);max-height:calc(100dvh - 28px);overflow-y:auto;overflow-x:clip}.works-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.works-form-grid>label{min-width:0}.works-field-wide{grid-column:1/-1}.works-form-modal input,.works-form-modal textarea{max-width:100%}.works-description{resize:vertical;max-height:150px;min-height:78px}.works-form-modal .modal-actions{position:sticky;bottom:-28px;margin:18px -28px -28px;padding:16px 28px 22px;background:#fff;border-top:1px solid #eee6dc;z-index:3}
    @media(max-width:620px){.works-heading{align-items:stretch;flex-direction:column}.works-heading .primary{width:100%}.works-form-modal{padding:20px}.works-form-grid{grid-template-columns:minmax(0,1fr)}.works-form-modal .modal-actions{bottom:-20px;margin:18px -20px -20px;padding:14px 20px 20px}.works-card-actions>*{flex:1 1 40%}}
  `],
})
export class WorksPage implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  works: Work[] = [];
  foremen: Foreman[] = [];
  people: PersonSummary[] = [];
  editing = '';
  formOpen = false;
  formLoading = false;
  formReady = true;
  busy = false;
  formError = '';
  listError = '';
  actionError = '';
  showAliasPin = false;
  access: Access | null = null;
  pauseTarget: Work | null = null;
  resumeTarget: Work | null = null;
  pauseReason = '';
  resumeEndDate = '';
  form = this.blank();
  arDate = formatArDate;
  ngOnInit() { void this.load(); }
  @HostListener('document:keydown.escape') onEscape() { if (this.formOpen && document.querySelector('.works-form-modal .search-select-menu')) return; if (this.pauseTarget || this.resumeTarget) this.closeAction(); else if (this.formOpen) this.closeForm(); }
  blank(): WorkForm { const today = localDate(); return { name: '', description: '', location: '', startDate: today, estimatedEndDate: today, foremanId: '', siteManagerId: '', closeTime: '19:00', accessAlias: '', aliasPin: '' }; }
  sanitizePin() { this.form.aliasPin = this.form.aliasPin.replace(/\D/g, '').slice(0, 6); }
  get foremanOptions(): SearchOption[] { return this.foremen.filter(person => person.isActive || person.id === this.form.foremanId).map(person => ({ value: person.id, label: `${person.firstName} ${person.lastName}` })); }
  get managerOptions(): SearchOption[] { return this.people.filter(person => (person.isActive || person.id === this.form.siteManagerId) && person.roles.includes('SITE_MANAGER')).map(person => ({ value: person.id, label: person.fullName })); }
  async load() { try { [this.works, this.foremen, this.people] = await Promise.all([this.api.get<Work[]>('admin/works'), this.api.get<Foreman[]>('admin/foremen'), this.api.get<PersonSummary[]>('admin/people')]); this.listError = ''; } catch (error) { this.listError = message(error); } finally { this.cdr.detectChanges(); } }
  displayState(work: Work): 'PAUSADA' | 'PENDIENTE' | 'ACTIVA' | 'FINALIZADA' { const today = localDate(work.timeZone); if (work.status === 'PAUSADA') return 'PAUSADA'; if (work.status === 'FINALIZADA' || work.estimatedEndDate < today) return 'FINALIZADA'; if (work.startDate > today) return 'PENDIENTE'; return 'ACTIVA'; }
  stateLabel(work: Work) { return { PAUSADA: 'Pausada', PENDIENTE: 'Próxima', ACTIVA: 'Activa', FINALIZADA: 'Finalizada' }[this.displayState(work)]; }
  stateDescription(work: Work) { const today = localDate(work.timeZone); const state = this.displayState(work); if (state === 'PAUSADA') return 'Obra en pausa'; if (state === 'PENDIENTE') { const days = dayDifference(today, work.startDate); return `Faltan ${days} ${days === 1 ? 'día' : 'días'} para comenzar la obra`; } if (state === 'FINALIZADA') return `Finalizó el ${formatArDate(work.estimatedEndDate)}`; const days = dayDifference(today, work.estimatedEndDate); return days === 0 ? 'Finaliza hoy' : `Quedan ${days} ${days === 1 ? 'día' : 'días'} para finalizar la obra`; }
  openNew() { this.editing = ''; this.form = this.blank(); this.formError = ''; this.formReady = true; this.showAliasPin = false; this.formOpen = true; this.cdr.detectChanges(); }
  async openEdit(work: Work) { this.editing = work.id; this.formOpen = true; this.formLoading = true; this.formReady = false; this.formError = ''; this.showAliasPin = false; this.form = { name: work.name, description: work.description || '', location: work.location || '', startDate: work.startDate.slice(0, 10), estimatedEndDate: work.estimatedEndDate.slice(0, 10), foremanId: work.foremanId, siteManagerId: '', closeTime: work.closeTime.slice(0, 5), accessAlias: work.accessAlias || '', aliasPin: '' }; this.cdr.detectChanges(); try { const assignments = await this.api.get<WorkAssignment[]>(`admin/works/${work.id}/assignments`); if (this.editing === work.id && this.formOpen) { this.form.siteManagerId = assignments.find(item => item.active && item.roleCode === 'SITE_MANAGER')?.personId || ''; this.formReady = true; } } catch (error) { this.formError = message(error); } finally { this.formLoading = false; this.cdr.detectChanges(); } }
  closeForm() { if (this.busy) return; this.formOpen = false; this.editing = ''; this.formError = ''; this.cdr.detectChanges(); }
  async save() { if (this.busy || !this.formReady) return; this.formError = ''; if (!this.form.foremanId) { this.formError = 'Seleccioná un capataz responsable.'; return; } if (!this.form.siteManagerId) { this.formError = 'Seleccioná un jefe de obra.'; return; } if (this.form.estimatedEndDate < this.form.startDate) { this.formError = 'La finalización debe ser posterior al inicio.'; return; } this.busy = true; try { if (this.editing) { const work = this.works.find(item => item.id === this.editing); await this.api.patch(`admin/works/${this.editing}`, { ...this.form, timeZone: work?.timeZone, siteManagerId: this.form.siteManagerId }); } else { this.access = await this.api.post<Access>('admin/works', { ...this.form, assignments: [{ personId: this.form.siteManagerId, roleCode: 'SITE_MANAGER' }] }); } this.closeFormAfterSave(); await this.load(); } catch (error) { this.formError = message(error); } finally { this.busy = false; this.cdr.detectChanges(); } }
  private closeFormAfterSave() { this.formOpen = false; this.editing = ''; this.form = this.blank(); }
  openPause(work: Work) { this.pauseTarget = work; this.pauseReason = ''; this.actionError = ''; this.cdr.detectChanges(); }
  openResume(work: Work) { this.resumeTarget = work; this.resumeEndDate = work.estimatedEndDate > localDate(work.timeZone) ? work.estimatedEndDate : localDate(work.timeZone); this.actionError = ''; this.cdr.detectChanges(); }
  closeAction() { if (this.busy) return; this.pauseTarget = null; this.resumeTarget = null; this.actionError = ''; this.cdr.detectChanges(); }
  async confirmPause() { if (!this.pauseTarget || this.busy) return; if (!this.pauseReason.trim()) { this.actionError = 'Ingresá el motivo de la pausa.'; return; } this.busy = true; this.actionError = ''; try { await this.api.post(`admin/works/${this.pauseTarget.id}/pause`, { reason: this.pauseReason.trim() }); this.pauseTarget = null; await this.load(); } catch (error) { this.actionError = message(error); } finally { this.busy = false; this.cdr.detectChanges(); } }
  async confirmResume() { if (!this.resumeTarget || this.busy) return; if (!this.resumeEndDate) { this.actionError = 'Seleccioná una nueva fecha de finalización.'; return; } this.busy = true; this.actionError = ''; try { await this.api.post(`admin/works/${this.resumeTarget.id}/resume`, { estimatedEndDate: this.resumeEndDate }); this.resumeTarget = null; await this.load(); } catch (error) { this.actionError = message(error); } finally { this.busy = false; this.cdr.detectChanges(); } }
  async copyAccess() { if (this.access) await navigator.clipboard.writeText(this.access.url); }
}
