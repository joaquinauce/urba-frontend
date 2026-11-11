import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnInit,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Api,
  Foreman,
  PersonSummary,
  Work,
  WorkAssignment,
  message,
} from './api';
import { formatArDate } from './date';
import { PersonalRole, roleLabel } from './session';
import { SearchSelect, type SearchOption } from './search-select';

type PersonForm = {
  fullName: string;
  role: PersonalRole | 'ADMINISTRATOR' | '';
  email: string;
  password: string;
  isActive: boolean;
};

@Component({
  selector: 'app-people',
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <div class="page-heading">
        <div>
          <span class="eyebrow dark">EQUIPO Y PERMISOS</span>
          <h1>Personas</h1>
          <p>Gestioná administradores y jefes de obra.</p>
        </div>
      </div>

      @if (error && !modal) { <div class="alert error">{{ error }}</div> }
      @if (notice) { <div class="alert success">{{ notice }}</div> }
      @if (revealedCode) { <div class="alert success" role="status">Código nuevo de {{ revealedName }}: <strong>{{ revealedCode }}</strong>. Compartilo por un canal seguro; se muestra solo ahora. <button type="button" class="ghost small" (click)="copyCode()">Copiar</button><button type="button" class="ghost small" (click)="dismissCode()">Cerrar</button></div> }
      <div class="people-list-head">
        <h2 class="list-heading">Equipo <span class="team-count">{{ filteredPeople().length }} {{ filteredPeople().length === 1 ? 'registrado' : 'registrados' }}</span></h2>
        <div class="people-list-tools">
          <label class="search-field"><span class="sr-only">Buscar persona</span><input type="search" name="peopleSearch" [(ngModel)]="query" placeholder="Buscar por nombre o rol"></label>
          <button class="primary" type="button" (click)="newPerson()">+ Nueva persona</button>
        </div>
      </div>
      @if (loading) { <div class="empty compact">Cargando personas…</div> }
      @else if (!people.length) { <div class="empty compact">Todavía no hay administradores ni jefes de obra.</div> }
      @for (group of groups(); track group.role) {
        @if (group.people.length) {
          <section class="team-group" [attr.aria-label]="group.title">
            <div class="team-group-heading"><h3>{{ group.title }}</h3><span>{{ group.people.length }}</span></div>
            <div class="team-grid">
              @for (person of group.people; track person.id) {
                <article class="person-card" [class.inactive]="!person.isActive">
                  <div class="person-card-head">
                    <div class="avatar">{{ initials(person.fullName) }}</div>
                    <div class="row-main"><strong>{{ person.fullName }}</strong><small>{{ person.email || 'Sin email' }}</small></div>
                    <span class="status" [class.verde]="person.isActive">{{ person.isActive ? 'Activa' : 'Inactiva' }}</span>
                  </div>
                  @if (person.activeAssignments || workNames[person.id]?.length) {
                    <p class="assignment-summary"><strong>{{ person.activeAssignments }}</strong> asignación(es) activa(s)@if (workNames[person.id]?.length) { · {{ workNames[person.id].join(' · ') }} }</p>
                  }
                  @if (person.lastAccessAt) { <small>Último acceso: {{ dateTime(person.lastAccessAt) }}</small> }
                  @if (person.hasCode) { <small>Acceso personal: {{ isLocked(person) ? 'Bloqueado hasta ' + dateTime(person.lockedUntil!) : 'Habilitado' }} · Intentos fallidos: {{ person.failedAttempts }}</small> }
                  <div class="actions person-actions">
                    <button class="ghost small" type="button" (click)="edit(person)">Editar</button>
                    <button class="ghost small" type="button" (click)="changePassword(person)">Cambiar clave</button>
                    @if (person.roles.includes('FOREMAN') || person.roles.includes('SITE_MANAGER')) { <button class="ghost small" type="button" [disabled]="busy" (click)="rotate(person)">{{ person.hasCode ? 'Rotar código' : 'Crear código' }}</button> }
                    @if (person.hasCode && (person.failedAttempts || person.lockedUntil)) { <button class="ghost small" type="button" [disabled]="busy" (click)="unlock(person)">Desbloquear</button> }
                    <button class="ghost small" type="button" [disabled]="busy" (click)="requestStatus(person)">{{ person.isActive ? 'Inhabilitar' : 'Habilitar' }}</button>
                  </div>
                </article>
              }
            </div>
          </section>
        }
      }
      @if (!loading && people.length && !filteredPeople().length) { <div class="empty compact">No encontramos personas con esa búsqueda.</div> }
      @if (modal) {
        <div class="app-modal-backdrop" (click)="closeModal()">
          <section class="app-modal" role="dialog" aria-modal="true" [attr.aria-label]="modal === 'password' ? 'Cambiar clave' : modal === 'rotate' ? 'Rotar código' : modal === 'status' ? selectedPerson?.isActive ? 'Inhabilitar persona' : 'Habilitar persona' : editing ? 'Editar persona' : 'Nueva persona'" (click)="$event.stopPropagation()">
            <div class="app-modal-head"><div><span class="eyebrow dark">EQUIPO</span><h2>{{ modal === 'password' ? 'Cambiar clave' : modal === 'rotate' ? 'Rotar código' : modal === 'status' ? selectedPerson?.isActive ? 'Inhabilitar persona' : 'Habilitar persona' : editing ? 'Editar persona' : 'Nueva persona' }}</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeModal()">×</button></div>
            @if (modal === 'password') {
              <p class="modal-intro">{{ selectedPerson?.fullName }}</p>
              <form (ngSubmit)="savePassword()" novalidate>
                <label>Nueva contraseña<span class="password-field"><input #newPasswordInput [type]="showNewPassword ? 'text' : 'password'" name="newPassword" [(ngModel)]="newPassword" minlength="10" required autocomplete="new-password"><button class="password-toggle" type="button" [attr.aria-label]="showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'" [attr.aria-pressed]="showNewPassword" (click)="togglePasswordVisibility(newPasswordInput, 'new', $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showNewPassword){<path d="M3 3l18 18"/>}</svg></button></span></label>
                <label>Repetir contraseña<span class="password-field"><input #confirmNewPasswordInput [type]="showConfirmNewPassword ? 'text' : 'password'" name="confirmNewPassword" [(ngModel)]="confirmNewPassword" minlength="10" required autocomplete="new-password"><button class="password-toggle" type="button" [attr.aria-label]="showConfirmNewPassword ? 'Ocultar repetición de contraseña' : 'Mostrar repetición de contraseña'" [attr.aria-pressed]="showConfirmNewPassword" (click)="togglePasswordVisibility(confirmNewPasswordInput, 'confirm', $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showConfirmNewPassword){<path d="M3 3l18 18"/>}</svg></button></span></label>
                @if (error) { <div class="alert error">{{ error }}</div> }
                <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button><button class="primary" [disabled]="busy">{{ busy ? 'Guardando…' : 'Guardar clave' }}</button></div>
              </form>
            } @else if (modal === 'rotate') {
              <div class="status-confirm-message"><div class="status-confirm-icon" aria-hidden="true">!</div><p class="modal-intro">¿Rotar el código de <strong>{{ selectedPerson?.fullName }}</strong>? El código anterior y las sesiones abiertas dejarán de funcionar.</p></div>
              @if (error) { <div class="alert error" role="alert">{{ error }}</div> }
              <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button><button class="primary" type="button" [disabled]="busy" (click)="confirmRotate()">{{ busy ? 'Rotando…' : 'Rotar código' }}</button></div>
            } @else if (modal === 'status') {
              <div class="status-confirm-message"><div class="status-confirm-icon" [class.enable]="!selectedPerson?.isActive" aria-hidden="true">{{ selectedPerson?.isActive ? '!' : '✓' }}</div>
              <p class="modal-intro"><strong>{{ selectedPerson?.fullName }}</strong> {{ selectedPerson?.isActive ? 'perderá acceso inmediatamente a la aplicación.' : 'podrá volver a ingresar a la aplicación.' }}</p></div>
              @if (error) { <div class="alert error">{{ error }}</div> }
              <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button><button class="primary" type="button" [disabled]="busy" (click)="confirmStatus()">{{ busy ? 'Guardando…' : selectedPerson?.isActive ? 'Inhabilitar' : 'Habilitar' }}</button></div>
            } @else {
              <form (ngSubmit)="save()">
                <label>Nombre completo<input name="fullName" [(ngModel)]="form.fullName" maxlength="201" required></label>
                <fieldset class="role-fieldset"><legend>Rol</legend>
                  <label class="role-option" [class.selected]="form.role==='ADMINISTRATOR'"><input type="radio" name="role" value="ADMINISTRATOR" [checked]="form.role==='ADMINISTRATOR'" (change)="form.role='ADMINISTRATOR'"><span><strong>Administrador</strong></span></label>
                  <label class="role-option" [class.selected]="form.role==='SITE_MANAGER'"><input type="radio" name="role" value="SITE_MANAGER" [checked]="form.role==='SITE_MANAGER'" (change)="form.role='SITE_MANAGER'"><span><strong>Jefe de obra</strong></span></label>
                </fieldset>
                <label>Email<input type="email" name="email" [(ngModel)]="form.email" autocomplete="off" required></label>
                @if (!editing) { <label>Contraseña<span class="password-field"><input #passwordInput [type]="showPassword ? 'text' : 'password'" name="password" [(ngModel)]="form.password" minlength="10" required autocomplete="new-password"><button class="password-toggle" type="button" [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword" (click)="togglePasswordVisibility(passwordInput, 'create', $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>@if(!showPassword){<path d="M3 3l18 18"/>}</svg></button></span></label> }
                @if (error) { <div class="alert error">{{ error }}</div> }
                <div class="actions modal-actions"><button class="ghost" type="button" (click)="closeModal()">Cancelar</button><button class="primary" [disabled]="busy">{{ busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear persona' }}</button></div>
              </form>
            }
          </section>
        </div>
      }
    </main>
  `,
})
export class PeoplePage implements OnInit {
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  people: PersonSummary[] = [];
  works: Work[] = [];
  workNames: Record<string, string[]> = {};
  loading = true;
  busy = false;
  modal: '' | 'person' | 'password' | 'status' | 'rotate' = '';
  selectedPerson: PersonSummary | null = null;
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  showConfirmNewPassword = false;
  editing = '';
  originalActive = true;
  originalRole: PersonalRole | 'ADMINISTRATOR' | '' = '';
  originalEmail = '';
  originalHasPassword = false;
  error = '';
  notice = '';
  query = '';
  revealedCode = '';
  revealedName = '';
  form = this.blank();
  showPassword = false;
  readonly label = roleLabel;

  ngOnInit() {
    void this.load();
  }

  blank(): PersonForm {
    return { fullName: '', role: '', email: '', password: '', isActive: true };
  }

  roles(): (PersonalRole | 'ADMINISTRATOR')[] {
    return this.form.role ? [this.form.role] : [];
  }

  filteredPeople() {
    const value = this.query.trim().toLocaleLowerCase('es-AR');
    if (!value) return this.people;
    return this.people.filter(
      (person) =>
        person.fullName.toLocaleLowerCase('es-AR').includes(value) ||
        person.roles.some((role) => (role === 'ADMINISTRATOR' ? 'Administrador' : roleLabel(role)).toLocaleLowerCase('es-AR').includes(value)),
    );
  }

  groups() {
    const people = this.filteredPeople();
    return [
      { role: 'ADMINISTRATOR', title: 'Administradores', people: people.filter((person) => person.roles.includes('ADMINISTRATOR')) },
      { role: 'SITE_MANAGER', title: 'Jefes de obra', people: people.filter((person) => person.roles.includes('SITE_MANAGER') && !person.roles.includes('ADMINISTRATOR')) },
    ];
  }

  newPerson() {
    this.reset();
    this.error = '';
    this.modal = 'person';
    this.cdr.detectChanges();
  }

  closeModal() {
    if (this.busy) return;
    this.modal = '';
    this.selectedPerson = null;
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showNewPassword = false;
    this.showConfirmNewPassword = false;
    this.error = '';
    this.reset();
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape') onEscape() { if (this.modal) this.closeModal(); }

  async load() {
    this.error = '';
    try {
      const [people, works] = await Promise.all([
        this.api.get<PersonSummary[]>('admin/people'),
        this.api.get<Work[]>('admin/works'),
      ]);
      this.people = people.filter((person) => person.roles.some((role) => role === 'ADMINISTRATOR' || role === 'SITE_MANAGER'));
      this.works = works;
      const assignmentSets = await Promise.all(
        this.works.map((work) =>
          this.api.get<WorkAssignment[]>(`admin/works/${work.id}/assignments`),
        ),
      );
      const names: Record<string, string[]> = {};
      this.works.forEach((work, index) => {
        for (const assignment of assignmentSets[index].filter((item) => item.active)) {
          const current = names[assignment.personId] ?? [];
          if (!current.includes(work.name)) current.push(work.name);
          names[assignment.personId] = current;
        }
      });
      this.workNames = names;
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  edit(person: PersonSummary) {
    this.error = '';
    this.editing = person.id;
    this.originalActive = person.isActive;
    this.form = {
      fullName: person.fullName,
      role: person.roles.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : person.roles.includes('SITE_MANAGER') ? 'SITE_MANAGER' : 'FOREMAN',
      email: person.email ?? '',
      password: '',
      isActive: person.isActive,
    };
    this.originalRole = this.form.role;
    this.originalEmail = this.form.email;
    this.originalHasPassword = person.hasPassword ?? false;
    this.showPassword = false;
    this.modal = 'person';
    this.cdr.detectChanges();
  }

  changePassword(person: PersonSummary) {
    this.error = '';
    this.selectedPerson = person;
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showNewPassword = false;
    this.showConfirmNewPassword = false;
    this.modal = 'password';
    this.cdr.detectChanges();
  }

  togglePasswordVisibility(input: HTMLInputElement, field: 'new' | 'confirm' | 'create', event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    else if (field === 'confirm') this.showConfirmNewPassword = !this.showConfirmNewPassword;
    else this.showPassword = !this.showPassword;
    input.type = field === 'new' ? (this.showNewPassword ? 'text' : 'password')
      : field === 'confirm' ? (this.showConfirmNewPassword ? 'text' : 'password')
        : (this.showPassword ? 'text' : 'password');
    this.cdr.detectChanges();
    input.focus();
  }

  async savePassword() {
    if (!this.selectedPerson) { this.error = 'Seleccioná una persona.'; return; }
    if (this.newPassword.length < 10) { this.error = 'La contraseña debe tener al menos 10 caracteres.'; return; }
    if (this.newPassword !== this.confirmNewPassword) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.busy = true;
    this.error = '';
    try {
      await this.api.patch(`admin/people/${this.selectedPerson.id}`, { password: this.newPassword });
      this.notice = `Clave actualizada para ${this.selectedPerson.fullName}.`;
      this.busy = false;
      this.closeModal();
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  requestStatus(person: PersonSummary) {
    this.selectedPerson = person;
    this.error = '';
    this.modal = 'status';
    this.cdr.detectChanges();
  }

  async confirmStatus() {
    const person = this.selectedPerson;
    if (!person) return;
    this.busy = true;
    this.error = '';
    try {
      await this.api.patch(`admin/people/${person.id}`, { isActive: !person.isActive });
      this.notice = person.isActive ? 'Persona inhabilitada.' : 'Persona habilitada.';
      this.busy = false;
      this.closeModal();
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  reset() {
    this.editing = '';
    this.originalActive = true;
    this.originalRole = '';
    this.originalEmail = '';
    this.originalHasPassword = false;
    this.form = this.blank();
    this.showPassword = false;
  }

  async save() {
    this.error = '';
    this.notice = '';
    const roles = this.roles();
    if (!roles.length) {
      this.error = 'Seleccioná al menos un rol.';
      return;
    }
    this.busy = true;
    try {
      if (this.editing) {
        await this.api.patch(`admin/people/${this.editing}`, {
          fullName: this.form.fullName,
          ...(this.form.role !== this.originalRole ? { roles } : {}),
          ...(this.form.isActive !== this.originalActive ? { isActive: this.form.isActive } : {}),
          ...(this.form.email !== this.originalEmail ? { email: this.form.email } : {}),
          ...(this.form.password ? { password: this.form.password } : {}),
        });
        this.notice = 'Persona actualizada.';
      } else {
        const created = await this.api.post<{ id: string; fullName: string }>(
          'admin/people',
          { fullName: this.form.fullName, roles, email: this.form.email, password: this.form.password },
        );
        if (!roles.includes('FOREMAN')) { this.notice = 'Persona creada.'; this.closeModalAfterSave(); await this.load(); return; }
        let credentials: { code: string };
        try {
          credentials = await this.api.post<{ code: string }>(
            `admin/people/${created.id}/code/rotate`,
            {},
          );
        } catch (codeError) {
          const codeMessage = `La persona fue creada, pero el código no pudo generarse: ${message(codeError)}`;
          this.reset();
          await this.load();
          this.error = codeMessage;
          return;
        }
        this.revealedName = created.fullName;
        this.revealedCode = credentials.code;
        this.notice = 'Persona creada. Guardá su código ahora.';
      }
      this.closeModalAfterSave();
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  private closeModalAfterSave() {
    this.reset();
    this.modal = '';
    this.selectedPerson = null;
    this.newPassword = '';
    this.confirmNewPassword = '';
  }

  async rotate(person: PersonSummary) {
    if (person.hasCode) {
      this.selectedPerson = person;
      this.modal = 'rotate';
      this.error = '';
      this.cdr.detectChanges();
      return;
    }
    await this.performRotate(person);
  }

  async confirmRotate() {
    const person = this.selectedPerson;
    if (!person || this.busy) return;
    await this.performRotate(person);
  }

  private async performRotate(person: PersonSummary) {
    this.busy = true;
    this.error = '';
    try {
      const result = await this.api.post<{ code: string }>(
        `admin/people/${person.id}/code/rotate`,
        {},
      );
      this.revealedName = person.fullName;
      this.revealedCode = result.code;
      await this.load();
      this.busy = false;
      if (this.modal === 'rotate') this.closeModal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  async unlock(person: PersonSummary) {
    this.error = '';
    this.busy = true;
    try {
      await this.api.post(`admin/people/${person.id}/unlock`, {});
      this.notice = `Acceso de ${person.fullName} desbloqueado.`;
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  isLocked(person: PersonSummary) {
    return !!person.lockedUntil && new Date(person.lockedUntil).getTime() > Date.now();
  }

  async copyCode() {
    await navigator.clipboard.writeText(this.revealedCode);
    this.notice = 'Código copiado.';
  }

  dismissCode() {
    this.revealedCode = '';
    this.revealedName = '';
  }

  initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  dateTime(value: string) {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}

@Component({
  selector: 'app-work-assignments',
  imports: [CommonModule, FormsModule, SearchSelect],
  template: `
    <section class="panel assignment-panel">
      <div class="section-title">
        <div><h2>Responsables</h2></div>
        <button class="ghost small" type="button" (click)="openHistory()">Ver historial</button>
      </div>
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (notice) { <div class="alert success">{{ notice }}</div> }
      @if (loading) { <div class="empty compact">Cargando responsables…</div> }
      @else {
        <div class="assignment-groups">
          @for (role of roles; track role) {
            <div>
              <div class="assignment-role-head"><h3>{{ roleTitle(role) }}</h3></div>
              @if (role === 'FOREMAN' && primaryForemanName) {
                <div class="assignment-row"><div><strong>{{ primaryForemanName }}</strong></div><button class="ghost small" type="button" (click)="openChange()">Cambiar</button></div>
              }
              @for (assignment of visibleFor(role); track assignment.id) {
                <div class="assignment-row">
                  <div><strong>{{ assignment.personName }}</strong></div>
                  @if (assignment.isPrimary && role === 'FOREMAN') { <button class="ghost small" type="button" (click)="openChange()">Cambiar</button> }
                  @else { <button class="ghost small" type="button" [disabled]="busy || (role === 'SITE_MANAGER' && activeFor(role).length <= 1)" [title]="role === 'SITE_MANAGER' && activeFor(role).length <= 1 ? 'La obra debe conservar un jefe de obra' : ''" (click)="requestUnassign(assignment)">Desasignar</button> }
                </div>
              }
              @if (!visibleFor(role).length && !(role === 'FOREMAN' && primaryForemanName)) { <div class="assignment-empty">Sin responsables asignados para este rol.</div> }
              @if (eligible(role).length) {<div class="inline-assignment">
                <select [name]="'person-' + role" [(ngModel)]="selected[role]" [disabled]="!eligible(role).length" [attr.aria-label]="'Seleccionar ' + label(role)">
                  <option value="">{{ eligible(role).length ? 'Seleccionar persona' : 'No hay personas disponibles' }}</option>
                  @for (person of eligible(role); track person.id) { <option [value]="person.id">{{ person.fullName }}</option> }
                </select>
                <button class="primary small" type="button" [disabled]="!selected[role] || busy" (click)="assign(role)">Asignar</button>
              </div>}
            </div>
          }
        </div>
      }
    </section>
    @if (historyOpen) { <div class="app-modal-backdrop"><section class="app-modal assignment-history-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-history-title"><div class="app-modal-head"><div><span class="eyebrow dark">RESPONSABLES</span><h2 id="assignment-history-title">Historial de asignaciones</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeHistory()">×</button></div><div class="assignment-history-groups">@for (role of roles; track role) {<section class="assignment-history-group"><h3>{{ role === 'SITE_MANAGER' ? 'Jefes de obra' : 'Capataces' }}</h3>@for (assignment of historyFor(role); track assignment.id) {<div class="assignment-history-row"><div class="assignment-history-person"><strong>{{ assignment.personName }}</strong>@if (assignment.active) {<span class="assignment-history-current">Actual</span>}</div><div class="assignment-history-dates"><span>Desde <strong>{{ arDateTime(assignment.assignedAt) }}</strong></span><span>Hasta <strong>{{ assignment.unassignedAt ? arDateTime(assignment.unassignedAt) : 'En curso' }}</strong></span></div></div>}@if (!historyFor(role).length) {<p class="assignment-history-empty">Sin asignaciones registradas.</p>}</section>}</div><div class="actions modal-actions"><button class="ghost" type="button" (click)="closeHistory()">Cerrar</button></div></section></div> }
    @if (changeOpen) { <div class="app-modal-backdrop"><section class="app-modal" role="dialog" aria-modal="true" aria-labelledby="change-foreman-title"><div class="app-modal-head"><div><span class="eyebrow dark">RESPONSABLES</span><h2 id="change-foreman-title">Cambiar capataz</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeChange()">×</button></div><form (ngSubmit)="saveChange()"><p class="modal-intro">Capataz actual: <strong>{{ primaryForemanName }}</strong></p><label>Nuevo capataz<app-search-select name="newForeman" [(ngModel)]="selectedForemanId" [options]="changeOptions" label="Nuevo capataz" placeholder="Buscar capataz"></app-search-select></label>@if (changeError) { <div class="alert error" role="alert">{{ changeError }}</div> }<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeChange()">Cancelar</button><button class="primary" [disabled]="busy || !selectedForemanId">{{ busy ? 'Guardando…' : 'Guardar cambio' }}</button></div></form></section></div> }
    @if (pendingUnassign) { <div class="app-modal-backdrop" (click)="closeUnassign()"><section class="app-modal status-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="unassign-title" (click)="$event.stopPropagation()"><div class="app-modal-head"><div><span class="eyebrow dark">RESPONSABLES</span><h2 id="unassign-title">Desasignar responsable</h2></div><button class="app-modal-close" type="button" aria-label="Cerrar" (click)="closeUnassign()">×</button></div><div class="status-confirm-message"><div class="status-confirm-icon" aria-hidden="true">!</div><p class="modal-intro">¿Desasignar a <strong>{{ pendingUnassign.personName }}</strong> de esta obra? Su historial se conservará.</p></div>@if (unassignError) { <div class="alert error" role="alert">{{ unassignError }}</div> }<div class="actions modal-actions"><button class="ghost" type="button" (click)="closeUnassign()">Cancelar</button><button class="primary" type="button" [disabled]="busy" (click)="confirmUnassign()">{{ busy ? 'Desasignando…' : 'Desasignar' }}</button></div></section></div> }
  `,
})
export class WorkAssignmentsComponent implements OnInit {
  @Input({ required: true }) workId!: string;
  @Input() primaryForemanName = '';
  @Input() primaryForemanId = '';
  @Output() foremanChanged = new EventEmitter<void>();
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly roles: PersonalRole[] = ['SITE_MANAGER', 'FOREMAN'];
  readonly label = roleLabel;
  people: PersonSummary[] = [];
  foremen: Foreman[] = [];
  assignments: WorkAssignment[] = [];
  selected: Record<PersonalRole, string> = { SITE_MANAGER: '', FOREMAN: '' };
  loading = true;
  busy = false;
  historyOpen = false;
  error = '';
  notice = '';
  changeOpen = false;
  selectedForemanId = '';
  changeError = '';
  pendingUnassign: WorkAssignment | null = null;
  unassignError = '';

  ngOnInit() {
    void this.load();
  }

  async load() {
    try {
      [this.people, this.assignments, this.foremen] = await Promise.all([
        this.api.get<PersonSummary[]>('admin/people'),
        this.api.get<WorkAssignment[]>(`admin/works/${this.workId}/assignments`),
        this.api.get<Foreman[]>('admin/foremen'),
      ]);
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  activeFor(role: PersonalRole) {
    return this.assignments.filter((item) => item.active && item.roleCode === role);
  }

  roleTitle(role: PersonalRole) {
    if (role === 'SITE_MANAGER') return this.activeFor(role).length === 1 ? 'Jefe de Obra' : 'Jefes de obra';
    return this.visibleFor(role).length + (this.primaryForemanName ? 1 : 0) === 1 ? 'Capataz' : 'Capataces';
  }

  get changeOptions(): SearchOption[] {
    return this.foremen.filter(person => person.isActive && person.id !== this.primaryForemanId)
      .map(person => ({ value: person.id, label: `${person.firstName} ${person.lastName}` }));
  }

  openChange() {
    this.selectedForemanId = '';
    this.changeError = '';
    this.changeOpen = true;
    this.cdr.detectChanges();
  }

  closeChange() {
    if (this.busy) return;
    this.changeOpen = false;
    this.changeError = '';
    this.cdr.detectChanges();
  }

  async saveChange() {
    if (!this.selectedForemanId || this.busy) return;
    this.busy = true;
    this.changeError = '';
    try {
      await this.api.patch(`admin/works/${this.workId}/foreman`, { foremanId: this.selectedForemanId });
      this.changeOpen = false;
      this.notice = 'Capataz cambiado.';
      this.foremanChanged.emit();
      await this.load();
    } catch (error) {
      this.changeError = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  visibleFor(role: PersonalRole) {
    return this.activeFor(role).filter(item => role !== 'FOREMAN' || !this.primaryForemanName || !item.isPrimary);
  }

  eligible(role: PersonalRole) {
    const assigned = new Set(this.activeFor(role).map((item) => item.personId));
    return this.people.filter(
      (person) => person.isActive && person.roles.includes(role) && !assigned.has(person.id),
    );
  }

  openHistory() { this.historyOpen = true; this.cdr.detectChanges(); }

  closeHistory() { this.historyOpen = false; this.cdr.detectChanges(); }

  historyFor(role: PersonalRole) {
    return this.assignments.filter(item => item.roleCode === role)
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }

  async assign(role: PersonalRole) {
    const personId = this.selected[role];
    if (!personId) return;
    this.busy = true;
    this.error = '';
    try {
      await this.api.post(`admin/works/${this.workId}/assignments`, {
        personId,
        roleCode: role,
      });
      this.selected[role] = '';
      this.notice = 'Responsable asignado.';
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  requestUnassign(assignment: WorkAssignment) {
    this.pendingUnassign = assignment;
    this.unassignError = '';
    this.cdr.detectChanges();
  }

  closeUnassign() {
    if (this.busy) return;
    this.pendingUnassign = null;
    this.unassignError = '';
    this.cdr.detectChanges();
  }

  async confirmUnassign() {
    const assignment = this.pendingUnassign;
    if (!assignment || this.busy) return;
    this.busy = true;
    this.unassignError = '';
    try {
      await this.api.patch(
        `admin/works/${this.workId}/assignments/${assignment.id}/unassign`,
        {},
      );
      this.notice = 'Responsable desasignado. El historial permanece disponible.';
      this.pendingUnassign = null;
      await this.load();
    } catch (error) {
      this.unassignError = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  arDateTime(value: string) {
    const date = new Date(value);
    return `${formatArDate(date.toISOString().slice(0, 10))} ${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)}`;
  }
}
