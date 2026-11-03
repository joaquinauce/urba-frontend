import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Api,
  PersonSummary,
  Work,
  WorkAssignment,
  message,
} from './api';
import { formatArDate } from './date';
import { PersonalRole, roleLabel } from './session';

type PersonForm = {
  fullName: string;
  siteManager: boolean;
  foreman: boolean;
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
          <p>Gestioná jefes de obra, capataces y sus códigos personales.</p>
        </div>
      </div>

      <div class="management-steps" aria-label="Pasos para habilitar el acceso">
        <div><span>1</span><strong>Creá la persona</strong><small>Elegí uno o ambos roles.</small></div>
        <div><span>2</span><strong>Entregá su código</strong><small>Se muestra una sola vez.</small></div>
        <div><span>3</span><strong>Asigná obras</strong><small>Desde el detalle de cada obra.</small></div>
      </div>

      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (notice) { <div class="alert success">{{ notice }}</div> }
      @if (revealedCode) {
        <section class="panel personal-code" aria-live="polite">
          <span class="eyebrow dark">CÓDIGO PERSONAL · SE MUESTRA UNA VEZ</span>
          <h2>{{ revealedName }}</h2>
          <div class="code-value">{{ revealedCode }}</div>
          <p>Compartilo por un medio seguro. Al cerrar este aviso no podremos volver a mostrarlo.</p>
          <div class="actions">
            <button class="primary" type="button" (click)="copyCode()">Copiar código de 6 dígitos</button>
            <button class="ghost" type="button" (click)="dismissCode()">Cerrar</button>
          </div>
        </section>
      }

      <div class="two-column people-layout">
        <section class="panel">
          <h2>{{ editing ? 'Editar persona' : 'Nueva persona' }}</h2>
          <form (ngSubmit)="save()">
            <label>Nombre completo
              <input name="fullName" [(ngModel)]="form.fullName" maxlength="201" required>
            </label>
            <fieldset class="role-fieldset">
              <legend>¿Qué puede hacer?</legend>
              <label class="role-option" [class.selected]="form.siteManager"><input type="checkbox" name="siteManager" [(ngModel)]="form.siteManager"><span><strong>Jefe de obra</strong><small>Consulta objetivos, avances, informes y fotografías.</small></span></label>
              <label class="role-option" [class.selected]="form.foreman"><input type="checkbox" name="foreman" [(ngModel)]="form.foreman"><span><strong>Capataz</strong><small>Consulta la obra y registra avances, informes y fotos.</small></span></label>
            </fieldset>
            @if (editing) {
              <label class="check"><input type="checkbox" name="isActive" [(ngModel)]="form.isActive"> Persona activa</label>
            }
            <div class="actions">
              <button class="primary" [disabled]="busy">{{ busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear y generar código' }}</button>
              @if (editing) { <button class="ghost" type="button" (click)="reset()">Cancelar</button> }
            </div>
          </form>
        </section>

        <section>
          <div class="people-list-head"><h2 class="list-heading">Equipo <span>{{ filteredPeople().length }}</span></h2><label class="search-field"><span class="sr-only">Buscar persona</span><input type="search" name="peopleSearch" [(ngModel)]="query" placeholder="Buscar por nombre o rol"></label></div>
          @if (loading) { <div class="empty compact">Cargando personas…</div> }
          @else if (!people.length) { <div class="empty compact">Todavía no hay personas operativas.</div> }
          @for (person of filteredPeople(); track person.id) {
            <article class="person-card" [class.inactive]="!person.isActive">
              <div class="person-card-head">
                <div class="avatar">{{ initials(person.fullName) }}</div>
                <div class="row-main">
                  <strong>{{ person.fullName }}</strong>
                  <small>{{ person.isActive ? 'Activa' : 'Inactiva' }} · {{ person.hasCode ? 'Código configurado' : 'Sin código' }}</small>
                </div>
                <span class="status" [class.verde]="person.isActive">{{ person.isActive ? 'Activa' : 'Inactiva' }}</span>
              </div>
              <div class="role-chips">
                @for (role of person.roles; track role) { <span>{{ label(role) }}</span> }
              </div>
              <p class="assignment-summary">
                <strong>{{ person.activeAssignments }}</strong> asignación(es) activa(s)
                @if (workNames[person.id]?.length) { · {{ workNames[person.id].join(' · ') }} }
              </p>
              @if (person.lastAccessAt) { <small>Último acceso: {{ dateTime(person.lastAccessAt) }}</small> }
              <div class="actions person-actions">
                <button class="ghost small" type="button" (click)="edit(person)">Editar</button>
                <button class="ghost small" type="button" (click)="rotate(person)">{{ person.hasCode ? 'Generar código nuevo' : 'Generar código' }}</button>
              </div>
            </article>
          }
          @if (!loading && people.length && !filteredPeople().length) { <div class="empty compact">No encontramos personas con esa búsqueda.</div> }
        </section>
      </div>
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
  editing = '';
  originalActive = true;
  error = '';
  notice = '';
  query = '';
  revealedCode = '';
  revealedName = '';
  form = this.blank();
  readonly label = roleLabel;

  ngOnInit() {
    void this.load();
  }

  blank(): PersonForm {
    return { fullName: '', siteManager: false, foreman: true, isActive: true };
  }

  roles(): PersonalRole[] {
    return [
      ...(this.form.siteManager ? (['SITE_MANAGER'] as const) : []),
      ...(this.form.foreman ? (['FOREMAN'] as const) : []),
    ];
  }

  filteredPeople() {
    const value = this.query.trim().toLocaleLowerCase('es-AR');
    if (!value) return this.people;
    return this.people.filter(
      (person) =>
        person.fullName.toLocaleLowerCase('es-AR').includes(value) ||
        person.roles.some((role) => roleLabel(role).toLocaleLowerCase('es-AR').includes(value)),
    );
  }

  async load() {
    this.error = '';
    try {
      [this.people, this.works] = await Promise.all([
        this.api.get<PersonSummary[]>('admin/people'),
        this.api.get<Work[]>('admin/works'),
      ]);
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
    this.editing = person.id;
    this.originalActive = person.isActive;
    this.form = {
      fullName: person.fullName,
      siteManager: person.roles.includes('SITE_MANAGER'),
      foreman: person.roles.includes('FOREMAN'),
      isActive: person.isActive,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.editing = '';
    this.originalActive = true;
    this.form = this.blank();
  }

  async save() {
    this.error = '';
    this.notice = '';
    const roles = this.roles();
    if (!roles.length) {
      this.error = 'Seleccioná al menos un rol.';
      return;
    }
    if (
      this.editing &&
      this.originalActive &&
      !this.form.isActive &&
      !confirm('La persona perderá acceso inmediatamente. ¿Desactivarla?')
    )
      return;
    this.busy = true;
    try {
      if (this.editing) {
        await this.api.patch(`admin/people/${this.editing}`, {
          fullName: this.form.fullName,
          roles,
          isActive: this.form.isActive,
        });
        this.notice = 'Persona actualizada.';
      } else {
        const created = await this.api.post<{ id: string; fullName: string }>(
          'admin/people',
          { fullName: this.form.fullName, roles },
        );
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
      this.reset();
      await this.load();
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  async rotate(person: PersonSummary) {
    if (
      person.hasCode &&
      !confirm('El código anterior y las sesiones abiertas dejarán de funcionar. ¿Continuar?')
    )
      return;
    this.error = '';
    try {
      const result = await this.api.post<{ code: string }>(
        `admin/people/${person.id}/code/rotate`,
        {},
      );
      this.revealedName = person.fullName;
      this.revealedCode = result.code;
      await this.load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.error = message(error);
    } finally {
      this.cdr.detectChanges();
    }
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
  imports: [CommonModule, FormsModule],
  template: `
    <section class="panel assignment-panel">
      <div class="section-title">
        <div><h2>Responsables</h2><p>Jefes de obra y capataces con acceso a esta obra.</p></div>
        <button class="ghost small" type="button" (click)="showHistory = !showHistory">{{ showHistory ? 'Ocultar historial' : 'Ver historial' }}</button>
      </div>
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (notice) { <div class="alert success">{{ notice }}</div> }
      @if (loading) { <div class="empty compact">Cargando responsables…</div> }
      @else {
        <div class="assignment-groups">
          @for (role of roles; track role) {
            <div>
              <div class="assignment-role-head"><h3>{{ label(role) }}</h3><span>{{ activeFor(role).length }} activo(s)</span></div>
              @for (assignment of activeFor(role); track assignment.id) {
                <div class="assignment-row">
                  <div><strong>{{ assignment.personName }}</strong><small>Desde {{ arDateTime(assignment.assignedAt) }}</small></div>
                  <button class="ghost small" type="button" (click)="unassign(assignment)">Desasignar</button>
                </div>
              }
              @if (!activeFor(role).length) { <div class="assignment-empty">Sin responsables asignados para este rol.</div> }
              <div class="inline-assignment">
                <select [name]="'person-' + role" [(ngModel)]="selected[role]" [disabled]="!eligible(role).length" [attr.aria-label]="'Seleccionar ' + label(role)">
                  <option value="">{{ eligible(role).length ? 'Seleccionar persona' : 'No hay personas disponibles' }}</option>
                  @for (person of eligible(role); track person.id) { <option [value]="person.id">{{ person.fullName }}</option> }
                </select>
                <button class="primary small" type="button" [disabled]="!selected[role] || busy" (click)="assign(role)">Asignar</button>
              </div>
            </div>
          }
        </div>
        @if (showHistory) {
          <div class="assignment-history">
            <h3>Historial</h3>
            @for (assignment of history(); track assignment.id) {
              <div class="assignment-row historical">
                <div><strong>{{ assignment.personName }}</strong><small>{{ label(assignment.roleCode) }} · {{ arDateTime(assignment.assignedAt) }} → {{ assignment.unassignedAt ? arDateTime(assignment.unassignedAt) : 'Actual' }}</small></div>
              </div>
            }
            @if (!history().length) { <p class="hint">Todavía no hay desasignaciones registradas.</p> }
          </div>
        }
      }
    </section>
  `,
})
export class WorkAssignmentsComponent implements OnInit {
  @Input({ required: true }) workId!: string;
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly roles: PersonalRole[] = ['SITE_MANAGER', 'FOREMAN'];
  readonly label = roleLabel;
  people: PersonSummary[] = [];
  assignments: WorkAssignment[] = [];
  selected: Record<PersonalRole, string> = { SITE_MANAGER: '', FOREMAN: '' };
  loading = true;
  busy = false;
  showHistory = false;
  error = '';
  notice = '';

  ngOnInit() {
    void this.load();
  }

  async load() {
    try {
      [this.people, this.assignments] = await Promise.all([
        this.api.get<PersonSummary[]>('admin/people'),
        this.api.get<WorkAssignment[]>(`admin/works/${this.workId}/assignments`),
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

  eligible(role: PersonalRole) {
    const assigned = new Set(this.activeFor(role).map((item) => item.personId));
    return this.people.filter(
      (person) => person.isActive && person.roles.includes(role) && !assigned.has(person.id),
    );
  }

  history() {
    return this.assignments.filter((item) => !item.active);
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

  async unassign(assignment: WorkAssignment) {
    if (!confirm(`¿Desasignar a ${assignment.personName}? El historial se conservará.`)) return;
    this.busy = true;
    this.error = '';
    try {
      await this.api.patch(
        `admin/works/${this.workId}/assignments/${assignment.id}/unassign`,
        {},
      );
      this.notice = 'Responsable desasignado. El historial permanece disponible.';
      await this.load();
    } catch (error) {
      this.error = message(error);
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
