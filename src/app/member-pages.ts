import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Api,
  Goal,
  MemberWork,
  Report,
  message,
  quantity,
  reportText,
  share,
  unitNames,
} from './api';
import { DateField } from './date-field';
import { formatArDate } from './date';
import { timeGreeting } from './greeting';
import { formatQuantity, quantityRule, validQuantity } from './quantity';
import { PersonalSessionStore, roleLabel } from './session';

type MemberWorkDetail = {
  today: string;
  todayTime: string;
  work: {
    id: string;
    name: string;
    location: string | null;
    status: string;
    estimatedEndDate: string;
    closeTime: string;
  };
  goals: Goal[];
  reports: Array<{
    id: string;
    date: string;
    foremanName: string;
    submittedBy?: Report['submittedBy'];
  }>;
  progress: Array<{
    activityId: string;
    name: string;
    unit: string;
    planned: number;
    executed: number;
    compliance: number | null;
    risk: boolean;
    quantityStep?: number | null;
    quantityDecimals?: number | null;
  }>;
  items: Array<{
    reportId: string;
    actual: number;
    expected: number;
  }>;
};

@Component({
  selector: 'app-member-works',
  imports: [RouterLink],
  template: `
    <main class="page member-page">
      <div class="page-heading">
        <div>
          <span class="eyebrow dark">{{ session.canWrite() ? 'AVANCE DE OBRAS' : 'SUPERVISIÓN' }}</span>
          <h1>{{ greeting }}{{ session.person()?.fullName ? ', ' + session.person()?.fullName : '' }}.</h1>
          <p>{{ session.canWrite() ? 'Seleccioná una obra para consultar o informar el avance.' : 'Consultá objetivos, informes, fotografías y estadísticas.' }}</p>
        </div>
      </div>
      @if (session.canWrite()) {
        <div class="flow-steps compact-flow" aria-label="Flujo para informar avances">
          <div class="active"><span>1</span><strong>Elegí la obra</strong></div>
          <div><span>2</span><strong>Cargá el avance</strong></div>
          <div><span>3</span><strong>Revisá y enviá</strong></div>
        </div>
      }
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (loading) { <div class="empty">Cargando obras asignadas…</div> }
      @else if (!works.length) {
        <div class="empty"><h2>No tenés obras asignadas</h2><p>Contactá al administrador para revisar tus asignaciones.</p></div>
      } @else {
        <div class="cards-grid member-work-grid">
          @for (work of works; track work.id) {
            <a class="work-card" [routerLink]="[basePath(), work.id]">
              <div class="card-top"><span class="status" [class.verde]="work.status === 'ACTIVA'">{{ status(work.status) }}</span><span class="arrow">↗</span></div>
              <h3>{{ work.name }}</h3>
              <p>{{ work.location || 'Sin ubicación informada' }}</p>
              <div class="role-chips">@for (role of work.roles; track role) { <span>{{ label(role) }}</span> }</div>
              <div class="card-footer"><span>Finalización estimada</span><strong>{{ arDate(work.estimatedEndDate) }}</strong></div>
              <span class="card-action">{{ session.canWrite() ? 'Cargar avance' : 'Ver supervisión' }} →</span>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class MemberWorksPage implements OnInit {
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  readonly session = inject(PersonalSessionStore);
  readonly arDate = formatArDate;
  readonly greeting = timeGreeting();
  readonly label = roleLabel;
  works: MemberWork[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    void this.load();
  }

  async load() {
    try {
      this.works = await this.api.get<MemberWork[]>('member/works', 'person');
      if (this.session.canWrite() && this.works.length === 1)
        await this.router.navigate([this.basePath(), this.works[0].id]);
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  basePath() {
    return this.session.canWrite() ? '/mis-obras' : '/supervision';
  }

  status(value: string) {
    return ({ ACTIVA: 'Activa', PAUSADA: 'Pausada', FINALIZADA: 'Finalizada' } as Record<string, string>)[value] ?? value;
  }
}

@Component({
  selector: 'app-member-work',
  imports: [CommonModule, FormsModule, RouterLink, DateField],
  template: `
    <main class="page member-page">
      <a class="back" [routerLink]="backPath()">← Mis obras</a>
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (notice) { <div class="alert success">{{ notice }}</div> }
      @if (loading) { <div class="empty">Cargando obra…</div> }
      @if (detail) {
        <div class="page-heading member-heading">
          <div>
            <span class="eyebrow dark">{{ session.person()?.roles?.includes('SITE_MANAGER') ? 'JEFE DE OBRA' : 'CAPATAZ' }}</span>
            <p class="member-greeting">{{ greeting }}, {{ session.person()?.fullName }}.</p>
            <h1>{{ detail.work.name }}</h1>
            <p>{{ detail.work.location || 'Sin ubicación' }} · {{ detail.work.status }} · Finaliza {{ arDate(detail.work.estimatedEndDate) }}</p>
          </div>
          @if (!canWrite) { <span class="readonly-badge">Solo lectura</span> }
        </div>

        @if (!canWrite) {
          <section class="supervision-hero" aria-label="Resumen de supervisión">
            <div><span>Cumplimiento hoy</span><strong>{{ todayCompliance() }}</strong><small>{{ hasTodayReport() ? 'Informe recibido' : 'Pendiente de informe' }}</small></div>
            <div><span>Objetivos de hoy</span><strong>{{ todayGoals().length }}</strong><small>{{ arDate(detail.today) }}</small></div>
            <div><span>Actividades en riesgo</span><strong>{{ riskCount() }}</strong><small>Según avance acumulado</small></div>
            <div><span>Informes totales</span><strong>{{ detail.reports.length }}</strong><small>Disponibles para consulta</small></div>
          </section>
        }

        @if (canWrite) {
          <div class="flow-steps report-flow" aria-label="Pasos para enviar el informe">
            <div class="done"><span>1</span><strong>Obra elegida</strong></div>
            <div class="active"><span>2</span><strong>Cargá el avance</strong></div>
            <div><span>3</span><strong>Enviá el informe</strong></div>
          </div>
          <section class="panel member-submit-panel">
            <div class="section-title"><div><span class="eyebrow dark">AVANCE DEL DÍA</span><h2>Informe de hoy</h2><p>{{ arDate(detail.today) }} · Podés editarlo hasta las {{ detail.work.closeTime.slice(0, 5) }}</p></div>@if(todayReport){<span class="draft-state">Informe guardado</span>}</div>
            @if (!todayGoals().length) { <div class="empty compact"><h3>Sin objetivos para hoy</h3><p>No hace falta enviar un informe. Consultá con el administrador si esperabas ver tareas.</p></div> }
            @else if (!editable()) { <div class="alert"><strong>Informe cerrado.</strong> La obra no está activa o ya pasó el horario límite.</div> }
            @else {
              <form (ngSubmit)="submit()">
                <div class="public-goals">
                  @for (goal of todayGoals(); track goal.id) {
                    <div class="public-goal">
                      <div><span class="goal-number">{{ ($index + 1).toString().padStart(2, '0') }}</span><h2>{{ goal.description }}</h2><p>Objetivo: <strong>{{ qty(goal.expectedQuantity, goal.unit, goal) }} {{ unit(goal.unit, goal.customUnit) }}</strong></p></div>
                      <label>REALIZADO<input type="number" [attr.inputmode]="rule(goal.unit, goal).step === 1 ? 'numeric' : 'decimal'" min="0" [step]="rule(goal.unit, goal).step" [name]="goal.id" [(ngModel)]="values[goal.id]" (ngModelChange)="saveDraft()" required></label>
                    </div>
                  }
                </div>
                <label>Observaciones <span>(opcional)</span><textarea name="observations" rows="3" [(ngModel)]="observations" (ngModelChange)="saveDraft()" placeholder="Contá si hubo demoras, faltantes o algo importante"></textarea></label>
                <label class="photo-upload"><strong>📷 Adjuntar fotografías</strong><span> Podés seleccionar varias imágenes.</span><input type="file" accept="image/*" multiple (change)="chooseFiles($event)"></label>
                @if (files.length) { <div class="selected-files"><strong>{{ files.length }} foto(s) listas para subir</strong>@for(file of files;track file.name + file.size;let index=$index){<div><span>{{file.name}}</span><button type="button" class="ghost small" (click)="removeFile(index)" aria-label="Quitar fotografía">Quitar</button></div>}</div> }
                <div class="submit-review"><span>Revisá las cantidades antes de continuar.</span><button class="primary submit" [disabled]="busy">{{ busy ? 'Enviando informe…' : todayReport ? 'GUARDAR CAMBIOS' : 'ENVIAR INFORME' }}</button></div>
              </form>
            }
          </section>
        }

        @if (!canWrite) {
        <div class="two-column wide-left member-detail-grid supervisor-grid">
          <div>
            <section class="panel">
              <div class="section-title">
                <h2>Objetivos diarios</h2>
                <label class="date-control">Fecha <app-date-field name="memberGoalDate" [(ngModel)]="selectedDate" [required]="true"></app-date-field></label>
              </div>
              @for (goal of goalsForDate(); track goal.id) {
                <div class="goal-row"><div><strong>{{ goal.description }}</strong><small>{{ qty(goal.expectedQuantity, goal.unit, goal) }} {{ unit(goal.unit, goal.customUnit) }}</small></div></div>
              }
              @if (!goalsForDate().length) { <div class="empty compact">Sin objetivos para esta fecha.</div> }
            </section>

            <section class="panel">
              <h2>Avance acumulado</h2>
              @for (progress of detail.progress; track progress.activityId) {
                <div class="progress-row">
                  <div class="progress-main"><strong>{{ progress.name }}</strong><small>{{ qty(progress.executed, progress.unit, progress) }} / {{ qty(progress.planned, progress.unit, progress) }} {{ unit(progress.unit) }}</small><div class="progress-track"><span [style.width.%]="progressWidth(progress.compliance)"></span></div></div>
                  <span class="status" [class.rojo]="progress.risk">{{ progress.compliance === null ? 'Sin datos' : progress.compliance + '%' }}</span>
                </div>
              }
              @if (!detail.progress.length) { <div class="empty compact">Todavía no hay avances.</div> }
            </section>
          </div>

          <div>
            <section class="panel">
              <h2>Informes</h2>
              @for (report of detail.reports; track report.id) {
                <button class="report-link" type="button" (click)="showReport(report.id)"><strong>{{ arDate(report.date) }}</strong><span>{{ report.submittedBy?.name || report.foremanName }} ↗</span></button>
              }
              @if (!detail.reports.length) { <div class="empty compact">Todavía no hay informes.</div> }
            </section>
            @if (selectedReport) {
              <section class="panel report-detail">
                <div class="section-title"><h2>Informe {{ arDate(selectedReport.date) }}</h2><span class="status" [class.verde]="selectedReport.compliance === 100">{{ selectedReport.compliance === null ? 'Sin objetivos' : selectedReport.compliance + '%' }}</span></div>
                <p>Responsable: <strong>{{ selectedReport.submittedBy?.name || selectedReport.foremanName }}</strong></p>
                <p class="hint">{{ selectedReport.submittedBy?.accessType === 'PERSONAL' ? 'Identidad personal verificada' : 'Acceso legado' }}</p>
                @for (item of selectedReport.items; track item.id) {
                  <div class="report-item"><span>{{ item.description }}</span><strong>{{ qty(item.actual, item.unit, item) }} / {{ qty(item.expected, item.unit, item) }} {{ unit(item.unit, item.customUnit) }}</strong></div>
                }
                <p>Observaciones: {{ selectedReport.observations || 'Sin observaciones' }}</p>
                <div class="actions"><button class="ghost small" type="button" (click)="shareReport()">Compartir</button><button class="ghost small" type="button" (click)="copyReport()">Copiar</button></div>
                @if (selectedReport.photos.length) {
                  <div class="photo-grid">
                    @for (photo of selectedReport.photos; track photo.id) {
                      <button type="button" (click)="openPhoto(photo.id)">@if (photoSrc[photo.id]) { <img [src]="photoSrc[photo.id]" alt="Fotografía del informe"> } @else { Ver foto ↗ }</button>
                    }
                  </div>
                }
              </section>
            }
          </div>
        </div>
        } @else {
          <section class="panel foreman-history">
            <details>
              <summary>Ver informes anteriores <span>{{ detail.reports.length }}</span></summary>
              @for (report of detail.reports; track report.id) {
                <button class="report-link" type="button" (click)="showReport(report.id)"><strong>{{ arDate(report.date) }}</strong><span>{{ report.submittedBy?.name || report.foremanName }} ↗</span></button>
              }
              @if (!detail.reports.length) { <div class="empty compact">Todavía no hay informes anteriores.</div> }
            </details>
            @if (selectedReport) {
              <div class="compact-report"><strong>Informe {{ arDate(selectedReport.date) }}</strong><span>{{ selectedReport.compliance === null ? 'Sin objetivos' : selectedReport.compliance + '%' }}</span><p>{{ selectedReport.observations || 'Sin observaciones' }}</p></div>
            }
          </section>
        }
      }
    </main>
  `,
})
export class MemberWorkPage implements OnInit {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly session = inject(PersonalSessionStore);
  readonly arDate = formatArDate;
  readonly greeting = timeGreeting();
  readonly qty = formatQuantity;
  readonly rule = quantityRule;
  readonly quantity = quantity;
  id = '';
  detail: MemberWorkDetail | null = null;
  selectedDate = '';
  selectedReport: Report | null = null;
  todayReport: Report | null = null;
  values: Record<string, number> = {};
  observations = '';
  files: File[] = [];
  photoSrc: Record<string, string> = {};
  loading = true;
  busy = false;
  error = '';
  notice = '';
  canWrite = false;

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.canWrite = this.session.canWrite();
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const detail = await this.api.get<MemberWorkDetail>(`member/works/${this.id}`, 'person');
      this.detail = detail;
      this.selectedDate ||= detail.today;
      const today = detail.reports.find((report) => report.date === detail.today);
      if (today) {
        this.todayReport = await this.api.get<Report>(`member/reports/${today.id}`, 'person');
        for (const item of this.todayReport.items) this.values[item.goalId] = Number(item.actual);
        this.observations = this.todayReport.observations ?? '';
      } else {
        for (const goal of this.todayGoals()) this.values[goal.id] ??= 0;
        this.restoreDraft();
      }
    } catch (error) {
      this.error = message(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  todayGoals(): Goal[] {
    const detail = this.detail;
    return detail?.goals.filter((goal) => goal.date === detail.today) ?? [];
  }

  goalsForDate(): Goal[] {
    return this.detail?.goals.filter((goal: Goal) => goal.date === this.selectedDate) ?? [];
  }

  editable() {
    return this.detail?.work.status === 'ACTIVA' && this.detail.todayTime < this.detail.work.closeTime.slice(0, 5);
  }

  todayCompliance() {
    const detail = this.detail;
    if (!detail) return '—';
    const report = detail.reports.find((item) => item.date === detail.today);
    if (!report) return '—';
    const items = detail.items.filter((item) => item.reportId === report.id);
    if (!items.length) return '—';
    const score = items.reduce((sum: number, item: { actual: number; expected: number }) => sum + Math.min(100, Number(item.actual) / Number(item.expected) * 100), 0) / items.length;
    return `${Math.round(score)}%`;
  }

  unit(value: string, custom?: string) {
    return custom || unitNames[value] || value;
  }

  draftKey() {
    return `beurba-person-draft:${this.session.person()?.id}:${this.id}:${this.detail?.today ?? ''}`;
  }

  saveDraft() {
    if (this.editable()) localStorage.setItem(this.draftKey(), JSON.stringify({ values: this.values, observations: this.observations }));
  }

  restoreDraft() {
    const raw = localStorage.getItem(this.draftKey());
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { values?: Record<string, number>; observations?: string };
      this.values = { ...this.values, ...draft.values };
      this.observations = draft.observations ?? '';
    } catch {
      localStorage.removeItem(this.draftKey());
    }
  }

  chooseFiles(event: Event) {
    this.files = Array.from((event.target as HTMLInputElement).files ?? []);
  }

  removeFile(index: number) {
    this.files = this.files.filter((_, current) => current !== index);
  }

  hasTodayReport() {
    return this.detail?.reports.some((report) => report.date === this.detail?.today) ?? false;
  }

  riskCount() {
    return this.detail?.progress.filter((progress) => progress.risk).length ?? 0;
  }

  progressWidth(compliance: number | null) {
    return Math.max(0, Math.min(100, compliance ?? 0));
  }

  async submit() {
    const goals = this.todayGoals();
    if (!this.canWrite || !goals.length || !this.editable() || this.busy) return;
    if (goals.some((goal) => !validQuantity(this.values[goal.id], goal.unit, false, goal))) {
      this.error = 'Completá las cantidades con la precisión indicada.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.saveDraft();
    try {
      const report = await this.api.post<Report>(
        `member/works/${this.id}/reports`,
        {
          observations: this.observations,
          items: goals.map((goal) => ({ goalId: goal.id, actualQuantity: Number(this.values[goal.id]) })),
        },
        'person',
      );
      let failed = 0;
      for (const file of this.files) {
        try {
          await this.api.upload(`member/works/${this.id}/reports/${report.id}/photos`, file, 'person');
        } catch {
          failed += 1;
        }
      }
      this.files = [];
      localStorage.removeItem(this.draftKey());
      this.notice = failed ? `Informe guardado; ${failed} fotografía(s) no pudieron subirse.` : 'Informe guardado correctamente.';
      this.todayReport = report;
      await this.load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.error = message(error);
    } finally {
      this.busy = false;
      this.cdr.detectChanges();
    }
  }

  async showReport(id: string) {
    try {
      for (const url of Object.values(this.photoSrc)) URL.revokeObjectURL(url);
      this.photoSrc = {};
      this.selectedReport = await this.api.get<Report>(`member/reports/${id}`, 'person');
      for (const photo of this.selectedReport.photos) {
        try {
          this.photoSrc[photo.id] = URL.createObjectURL(await this.api.memberPhoto(photo.id));
        } catch {
          // Una fotografía inaccesible no bloquea el resto del informe.
        }
      }
    } catch (error) {
      this.error = message(error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async openPhoto(id: string) {
    try {
      const url = URL.createObjectURL(await this.api.memberPhoto(id));
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      this.error = message(error);
    }
  }

  async copyReport() {
    if (!this.selectedReport) return;
    await navigator.clipboard.writeText(reportText(this.selectedReport));
    this.notice = 'Informe copiado.';
  }

  async shareReport() {
    if (this.selectedReport) await share(this.selectedReport);
  }

  backPath() {
    return this.canWrite ? '/mis-obras' : '/supervision';
  }
}
