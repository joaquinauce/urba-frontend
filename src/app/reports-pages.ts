import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, Foreman, Work, localDate, message, unitNames } from './api';
import { DateField } from './date-field';
import { formatArDate } from './date';
import { formatQuantity } from './quantity';

@Component({
  selector: 'app-reports-hub',
  imports: [RouterLink],
  template: `
    <main class="page">
      <div class="page-heading"><div><span class="eyebrow dark">SEGUIMIENTO</span><h1>Informes</h1><p>Consultá los datos diarios de tus obras.</p></div></div>
      <div class="report-options">
        <a class="report-option" routerLink="/informes/objetivos-diarios">
          <span class="report-option-icon" aria-hidden="true">▦</span>
          <div><h2>Objetivos diarios</h2><p>Consultá el porcentaje de avance por obra, capataz y fecha.</p><span class="report-option-action">Ver informe →</span></div>
        </a>
        <a class="report-option" routerLink="/informes/rendiciones">
          <span class="report-option-icon" aria-hidden="true">▤</span>
          <div><h2>Rendiciones</h2><p>Consultá los gastos por obra, capataz y fecha, con sus comprobantes.</p><span class="report-option-action">Ver informe →</span></div>
        </a>
      </div>
    </main>`,
  styles: [`
    .report-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,380px));gap:18px}
    .report-option{display:flex;align-items:flex-start;gap:18px;padding:25px;border:1px solid #e9e1d6;border-radius:18px;background:#fff;box-shadow:0 6px 28px #16362a08;transition:border-color .15s,transform .15s}
    .report-option:hover{border-color:#f0b567;transform:translateY(-2px)}.report-option:focus-visible{outline:3px solid #fb8d00;outline-offset:3px}
    .report-option-icon{display:grid;place-items:center;flex:none;width:46px;height:46px;border-radius:12px;background:#fff2e3;color:#a65a00;font-size:1.6rem}
    h2{margin:1px 0 8px}p{margin:0 0 16px;color:#75695c;font-size:.9rem}.report-option-action{color:#9b590d;font-size:.84rem;font-weight:800}
  `],
})
export class ReportsHubPage {}

export interface DailyGoalProgress {
  reportId: string;
  date: string;
  workId: string;
  workName: string;
  foremanId: string;
  foremanName: string;
  compliance: number | null;
  items: { id: string; description: string; expected: number; actual: number; unit: string; customUnit?: string; quantityStep?: number | null; quantityDecimals?: number | null; percentage: number }[];
}
type ProgressGroup = { key: string; title: string; reports: DailyGoalProgress[] };

@Component({
  selector: 'app-daily-goals-report',
  imports: [FormsModule, RouterLink, DateField],
  template: `
    <main class="page daily-goals-report">
      <a class="back" routerLink="/informes">← Informes</a>
      <div class="page-heading"><div><span class="eyebrow dark">INFORMES</span><h1>Objetivos diarios</h1><p>Avance informado de cada objetivo en el período seleccionado.</p></div></div>
      <section class="panel report-controls" aria-label="Filtros del informe">
        <label>Obra<select name="work" [(ngModel)]="workId" (ngModelChange)="load()"><option value="">Todas las obras</option>@for(work of works;track work.id){<option [value]="work.id">{{work.name}}</option>}</select></label>
        <label>Capataz<select name="foreman" [(ngModel)]="foremanId" (ngModelChange)="load()"><option value="">Todos los capataces</option>@for(foreman of foremen;track foreman.id){<option [value]="foreman.id">{{foreman.firstName}} {{foreman.lastName}}</option>}</select></label>
        <label>Desde<app-date-field name="from" [(ngModel)]="from" (ngModelChange)="load()" [required]="true"></app-date-field></label>
        <label>Hasta<app-date-field name="to" [(ngModel)]="to" (ngModelChange)="load()" [required]="true"></app-date-field></label>
        <label>Agrupar por<select name="groupBy" [(ngModel)]="groupBy"><option value="date">Fecha</option><option value="foreman">Capataz</option></select></label>
        <button class="ghost" type="button" (click)="print()" [disabled]="loading || !reports.length">Imprimir</button>
      </section>
      @if(error){<div class="alert error" role="alert">{{error}}</div>}
      @if(loading){<div class="empty compact">Cargando avances…</div>}
      @else if(!reports.length){<div class="empty compact">No hay objetivos informados para estos filtros.</div>}
      @else {
        <div class="report-summary">{{reports.length}} {{reports.length===1?'informe':'informes'}} · {{totalGoals}} {{totalGoals===1?'objetivo':'objetivos'}} · {{arDate(from)}} al {{arDate(to)}}</div>
        @for(group of groups;track group.key){
          <section class="report-group">
            <h2 class="report-group-title">{{group.title}}</h2>
            @for(report of group.reports;track report.reportId){
              <article class="panel report-work">
                <div class="report-work-head"><div><span class="eyebrow dark">{{groupBy==='date'?report.foremanName:arDate(report.date)}}</span><h3>{{report.workName}}</h3><small>{{groupBy==='date'?'Capataz: '+report.foremanName:'Fecha: '+arDate(report.date)}}</small></div><div class="report-work-actions"><strong class="report-percentage">{{report.compliance===null?'—':report.compliance+'%'}}</strong><a class="ghost small" [routerLink]="['/obras',report.workId]">Ver obra ↗</a></div></div>
                <div class="report-goals">@for(item of report.items;track item.id){
                  <div class="report-goal"><div><strong>{{item.description}}</strong><small>{{qty(item.actual,item.unit,item)}} / {{qty(item.expected,item.unit,item)}} {{unit(item.unit,item.customUnit)}}</small></div><span>{{item.percentage}}%</span></div>
                }</div>
              </article>
            }
          </section>
        }
      }
    </main>`,
  styles: [`
    .daily-goals-report .page-heading{margin-top:18px}.report-controls{display:grid;grid-template-columns:repeat(5,minmax(140px,1fr)) auto;align-items:end;gap:14px;margin-bottom:20px}
    .report-controls label{min-width:0;margin:0}.report-controls select{width:100%}.report-controls .ghost{white-space:nowrap}.report-summary{margin:0 0 18px;color:#75695c;font-size:.9rem}.report-group{margin-bottom:28px}.report-group-title{font-size:1.2rem;margin:0 0 12px}.report-work{margin-bottom:12px}
    .report-work-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:17px;border-bottom:1px solid #eee5da}.report-work-head h3{margin:4px 0 6px;font-size:1.15rem}.report-work-head small,.report-goal small{display:block;color:#75695c}.report-work-actions{display:flex;align-items:center;gap:14px}.report-percentage{font-size:1.4rem;color:#15564b}
    .report-goal{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #f0ebe4}.report-goal:last-child{border-bottom:0;padding-bottom:0}.report-goal>span{font-weight:800;white-space:nowrap;color:#15564b}.report-goal small{margin-top:4px}
    @media(max-width:1050px){.report-controls{grid-template-columns:repeat(3,minmax(150px,1fr))}}@media(max-width:620px){.report-controls{grid-template-columns:1fr 1fr}.report-controls label:first-child,.report-controls label:nth-child(2){grid-column:span 2}.report-work-actions{flex-direction:column;align-items:flex-end}.report-goal{align-items:flex-start}}
    @media print{.back,.report-controls,.report-work-head a{display:none!important}.daily-goals-report{padding:0}.report-work{break-inside:avoid;box-shadow:none}}
  `],
})
export class DailyGoalsReportPage implements OnInit {
  private readonly api = inject(Api);
  private readonly cdr = inject(ChangeDetectorRef);
  from = new Date(Date.parse(`${localDate()}T12:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10);
  to = localDate();
  workId = '';
  foremanId = '';
  groupBy: 'date' | 'foreman' = 'date';
  works: Work[] = [];
  foremen: Foreman[] = [];
  reports: DailyGoalProgress[] = [];
  loading = true;
  error = '';
  private requestId = 0;
  arDate = formatArDate;
  qty = formatQuantity;
  get totalGoals() { return this.reports.reduce((sum, report) => sum + report.items.length, 0); }
  get groups(): ProgressGroup[] {
    const groups = new Map<string, ProgressGroup>();
    for (const report of this.reports) {
      const key = this.groupBy === 'date' ? report.date : report.foremanId;
      let group = groups.get(key);
      if (!group) {
        group = { key, title: this.groupBy === 'date' ? this.arDate(report.date) : report.foremanName, reports: [] };
        groups.set(key, group);
      }
      group.reports.push(report);
    }
    return [...groups.values()];
  }
  unit(value: string, custom?: string) { return custom || unitNames[value] || value; }
  async ngOnInit() {
    try { [this.works, this.foremen] = await Promise.all([this.api.get<Work[]>('admin/works'), this.api.get<Foreman[]>('admin/foremen')]); }
    catch (error) { this.error = message(error); this.loading = false; this.cdr.detectChanges(); return; }
    await this.load();
  }
  async load() {
    const request = ++this.requestId;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.from) || !/^\d{4}-\d{2}-\d{2}$/.test(this.to)) { this.reports = []; this.error = ''; this.loading = false; this.cdr.detectChanges(); return; }
    if (this.from > this.to) { this.reports = []; this.error = 'La fecha desde debe ser anterior a la fecha hasta.'; this.loading = false; this.cdr.detectChanges(); return; }
    this.loading = true;
    this.error = '';
    try {
      const params = new URLSearchParams({ from: this.from, to: this.to });
      if (this.workId) params.set('workId', this.workId);
      if (this.foremanId) params.set('foremanId', this.foremanId);
      const reports = await this.api.get<DailyGoalProgress[]>(`admin/reports/daily-goals?${params}`);
      if (request === this.requestId) this.reports = reports;
    } catch (error) {
      if (request === this.requestId) { this.reports = []; this.error = message(error); }
    } finally {
      if (request === this.requestId) { this.loading = false; this.cdr.detectChanges(); }
    }
  }
  print() { window.print(); }
}
