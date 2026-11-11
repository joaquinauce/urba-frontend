import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, type Foreman, type PersonSummary, type PublicToday, type Work, localDate, message } from './api';
import { formatArDate } from './date';
import { DateField } from './date-field';
import { prepareReceiptImage, RECEIPT_UPLOAD_LIMIT } from './receipt-image';

type ExpenseType = { id: string; name: string; isActive: boolean };
type Expense = { id: string; workId: string; workName: string; personId: string; personName: string; typeId: string; typeName: string; amountArs: string; occurredAt: string; workDate: string };
type ExpenseGroup = { key: string; workName: string; date: string; items: Expense[]; subtotal: number };
type ForemanOption = { value: string; name: string };
const ars = (amount: string | number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(amount));
const when = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

@Component({
  selector: 'app-member-expenses',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page member-page expense-mobile">
      <a class="back" [routerLink]="backPath()">← Volver a la obra</a>
      <div class="page-heading"><div><span class="eyebrow dark">CAPATAZ</span><h1>Rendición de gastos</h1><p>{{ workName }}</p></div></div>
      @if (error) { <div class="alert error" role="alert">{{ error }}</div> }
      @if (notice) { <div class="alert success" role="status">{{ notice }}</div> }
      <section class="panel expense-form-panel">
        <h2>Registrar gasto</h2>
        <form (ngSubmit)="submit()">
          <label>Monto en ARS<input type="number" name="amount" inputmode="decimal" min="0.01" step="0.01" [(ngModel)]="amount" required placeholder="0,00"></label>
          <label>Tipo de gasto<select name="typeId" [(ngModel)]="typeId" required><option value="" disabled>Elegí un tipo</option>@for (type of types; track type.id) {<option [value]="type.id">{{ type.name }}</option>}</select></label>
          <label class="expense-file">Fotografía del comprobante<input type="file" accept="image/*" (change)="choosePhoto($event)" required><small>Podés usar la cámara o elegir una foto de la galería. Las fotos grandes se optimizan automáticamente.</small></label>
          @if (photoPreparing) { <p class="expense-chosen" role="status">Preparando fotografía…</p> }
          @if (photo) { <p class="expense-chosen">✓ {{ photoName }} ({{ photoSize }})</p> }
          <button class="primary wide expense-submit" [disabled]="busy || photoPreparing || !types.length">{{ busy ? 'Registrando…' : 'Registrar gasto' }}</button>
        </form>
      </section>
      <section class="panel"><h2>Mis rendiciones recientes</h2>
        @if (loading) { <p>Cargando…</p> }
        @else if (!recent.length) { <p class="expense-muted">Todavía no registraste gastos en esta obra.</p> }
        @for (item of recent; track item.id) { <div class="expense-row"><div><strong>{{ item.typeName }}</strong><small>{{ at(item.occurredAt) }}</small></div><strong>{{ money(item.amountArs) }}</strong></div> }
      </section>
    </main>
  `,
})
export class MemberExpensesPage implements OnInit {
  private api = inject(Api); private route = inject(ActivatedRoute); private cdr = inject(ChangeDetectorRef);
  private photoSelection = 0;
  legacyMode = false;
  workId = ''; workName = ''; types: ExpenseType[] = []; recent: Expense[] = [];
  amount: number | null = null; typeId = ''; photo: File | null = null; photoInput: HTMLInputElement | null = null; requestId = crypto.randomUUID();
  busy = false; photoPreparing = false; photoName = ''; photoSize = ''; loading = true; error = ''; notice = ''; money = ars; at = when;
  ngOnInit() { this.workId = this.route.snapshot.paramMap.get('id') ?? ''; this.legacyMode = !this.workId; void this.load(); }
  backPath() { return this.legacyMode ? '/mi-obra' : `/mis-obras/${this.workId}`; }
  expensePath() { return this.legacyMode ? 'public/session/expenses' : `member/expenses/works/${this.workId}`; }
  mode(): 'foreman' | 'person' { return this.legacyMode ? 'foreman' : 'person'; }
  async load() {
    try {
      const [work, types, recent] = this.legacyMode ? await Promise.all([
        this.api.get<PublicToday>('public/session/today', this.mode()),
        this.api.get<ExpenseType[]>(`${this.expensePath()}/types`, this.mode()),
        this.api.get<Expense[]>(this.expensePath(), this.mode()),
      ]) : await Promise.all([
        this.api.get<{ work: { name: string } }>(`member/works/${this.workId}`, 'person'),
        this.api.get<ExpenseType[]>('member/expenses/types', 'person'),
        this.api.get<Expense[]>(`member/expenses/works/${this.workId}`, 'person'),
      ]);
      this.workName = work.work.name; this.types = types; this.recent = recent;
      if (!types.some(type => type.id === this.typeId)) this.typeId = '';
    } catch (error) { this.error = message(error); }
    finally { this.loading = false; this.cdr.detectChanges(); }
  }
  async choosePhoto(event: Event) {
    const selection = ++this.photoSelection;
    this.photoInput = event.target as HTMLInputElement;
    const selected = this.photoInput.files?.[0];
    this.photo = null; this.photoName = ''; this.photoSize = ''; this.error = '';
    if (!selected) return;
    this.photoPreparing = true; this.cdr.detectChanges();
    try {
      const prepared = await prepareReceiptImage(selected);
      if (selection !== this.photoSelection) return;
      if (prepared.size > RECEIPT_UPLOAD_LIMIT) throw new Error('La imagen supera los 25 MB. Elegí otra foto del comprobante.');
      this.photo = prepared;
      this.photoName = selected.name;
      this.photoSize = `${prepared.size < 1024 * 1024 ? `${Math.round(prepared.size / 1024)} KB` : `${(prepared.size / 1024 / 1024).toFixed(1)} MB`}${prepared !== selected ? ' optimizada' : ''}`;
    } catch (error) {
      if (selection !== this.photoSelection) return;
      this.error = message(error);
      this.photoInput.value = '';
    } finally { if (selection === this.photoSelection) { this.photoPreparing = false; this.cdr.detectChanges(); } }
  }
  async submit() {
    if (this.busy || this.photoPreparing) return;
    this.error = ''; this.notice = '';
    if (!this.amount || this.amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(String(this.amount))) { this.error = 'Ingresá un monto positivo con hasta dos decimales.'; this.cdr.detectChanges(); return; }
    if (!this.typeId) { this.error = 'Seleccioná el tipo de gasto.'; this.cdr.detectChanges(); return; }
    if (!this.photo) { this.error = 'Adjuntá una fotografía del comprobante.'; this.cdr.detectChanges(); return; }
    this.busy = true;
    try {
      await this.api.uploadExpense(this.expensePath(), { amount: String(this.amount), typeId: this.typeId, requestId: this.requestId }, this.photo, this.mode());
      this.notice = 'Gasto registrado. Ya aparece en tus rendiciones recientes.';
      this.amount = null; this.typeId = ''; this.photo = null; this.photoName = ''; this.photoSize = ''; if (this.photoInput) this.photoInput.value = ''; this.requestId = crypto.randomUUID();
      try { this.recent = await this.api.get<Expense[]>(this.expensePath(), this.mode()); }
      catch { this.notice = 'Gasto registrado. Actualizá la pantalla para ver la lista reciente.'; }
    } catch (error) { this.error = message(error); }
    finally { this.busy = false; this.cdr.detectChanges(); }
  }
}

@Component({
  selector: 'app-admin-expenses',
  imports: [FormsModule, DateField, RouterLink],
  template: `
    <main class="page expenses-admin">
      <a class="back" routerLink="/informes">← Informes</a>
      <div class="page-heading"><div><span class="eyebrow dark">INFORMES</span><h1>Rendiciones</h1><p>Gastos por obra y día, con comprobantes.</p></div></div>
      @if (error) { <div class="alert error" role="alert">{{ error }}</div> }
      <section class="panel"><div class="section-title"><h2>Consultar gastos</h2></div>
        <form class="expense-filters" (ngSubmit)="loadExpenses()">
          <label>Desde<app-date-field name="from" [(ngModel)]="from" [required]="true"></app-date-field></label>
          <label>Hasta<app-date-field name="to" [(ngModel)]="to" [required]="true"></app-date-field></label>
          <label>Obra<select name="workId" [(ngModel)]="workId"><option value="">Todas</option>@for (work of works; track work.id) {<option [value]="work.id">{{ work.name }}</option>}</select></label>
          <label>Capataz<select name="foremanSelection" [(ngModel)]="foremanSelection"><option value="">Todos</option>@for (foreman of foremen; track foreman.value) {<option [value]="foreman.value">{{ foreman.name }}</option>}</select></label>
          <label>Tipo<select name="typeId" [(ngModel)]="typeId"><option value="">Todos</option>@for (type of types; track type.id) {<option [value]="type.id">{{ type.name }}</option>}</select></label>
          <button class="primary" [disabled]="loading">{{ loading ? 'Buscando…' : 'Aplicar filtros' }}</button>
        </form>
      </section>
      <div class="expense-total"><span>Total del período</span><strong>{{ money(total) }}</strong></div>
      @if (!loading && !groups.length) { <div class="empty compact">No hay rendiciones para los filtros elegidos.</div> }
      @for (group of groups; track group.key) {
        <section class="panel expense-group"><div class="expense-group-head"><div><h2>{{ group.workName }}</h2><span>{{ arDate(group.date) }}</span></div><strong>Subtotal: {{ money(group.subtotal) }}</strong></div>
          @for (item of group.items; track item.id) { <div class="expense-row"><div><strong>{{ item.typeName }}</strong><small>{{ item.personName }} · {{ at(item.occurredAt) }}</small></div><strong>{{ money(item.amountArs) }}</strong><button type="button" class="ghost small" (click)="openReceipt(item.id)">Ver comprobante</button></div> }
        </section>
      }
      @if (receiptUrl) {<div class="expense-lightbox" role="dialog" aria-modal="true" aria-label="Comprobante" (click)="closeReceipt()"><button type="button" class="ghost expense-lightbox-close" aria-label="Cerrar comprobante" (click)="closeReceipt(); $event.stopPropagation()">×</button><img [src]="receiptUrl" alt="Fotografía del comprobante" (click)="$event.stopPropagation()"></div>}
    </main>
  `,
})
export class AdminExpensesPage implements OnInit, OnDestroy {
  private api = inject(Api); private cdr = inject(ChangeDetectorRef);
  from = `${localDate().slice(0, 7)}-01`; to = localDate(); workId = ''; foremanSelection = ''; typeId = '';
  works: Work[] = []; foremen: ForemanOption[] = []; types: ExpenseType[] = []; expenses: Expense[] = []; groups: ExpenseGroup[] = [];
  total = 0; loading = false; receiptUrl = ''; error = '';
  money = ars; at = when; arDate = formatArDate;
  ngOnInit() { void this.load(); }
  ngOnDestroy() { if (this.receiptUrl) URL.revokeObjectURL(this.receiptUrl); }
  @HostListener('document:keydown.escape') onEscape() { if (this.receiptUrl) this.closeReceipt(); }
  async load() {
    try { const [works, people, legacyForemen, types] = await Promise.all([
      this.api.get<Work[]>('admin/works'), this.api.get<PersonSummary[]>('admin/people'), this.api.get<Foreman[]>('admin/foremen'), this.api.get<ExpenseType[]>('admin/expenses/types')
    ]); this.works = works; this.foremen = [
      ...people.filter(person => person.roles.includes('FOREMAN')).map(person => ({ value: `PERSON:${person.id}`, name: person.fullName })),
      ...legacyForemen.map(foreman => ({ value: `FOREMAN:${foreman.id}`, name: `${foreman.firstName} ${foreman.lastName}`.trim() })),
    ].sort((a, b) => a.name.localeCompare(b.name, 'es')); this.types = types; await this.loadExpenses(); }
    catch (error) { this.error = message(error); this.cdr.detectChanges(); }
  }
  async loadExpenses() {
    this.error = '';
    if (this.from > this.to) { this.error = 'La fecha inicial debe ser anterior a la final.'; return; }
    this.loading = true;
    try {
      const query = new URLSearchParams({ from: this.from, to: this.to });
      if (this.workId) query.set('workId', this.workId);
      if (this.foremanSelection.startsWith('PERSON:')) query.set('personId', this.foremanSelection.slice(7));
      if (this.foremanSelection.startsWith('FOREMAN:')) query.set('foremanId', this.foremanSelection.slice(8));
      if (this.typeId) query.set('typeId', this.typeId);
      this.expenses = await this.api.get<Expense[]>(`admin/expenses?${query}`);
      const groups = new Map<string, ExpenseGroup>(); this.total = 0;
      for (const item of this.expenses) {
        const key = `${item.workId}:${item.workDate}`;
        if (!groups.has(key)) groups.set(key, { key, workName: item.workName, date: item.workDate, items: [], subtotal: 0 });
        groups.get(key)!.items.push(item); groups.get(key)!.subtotal += Number(item.amountArs); this.total += Number(item.amountArs);
      }
      this.groups = [...groups.values()];
    } catch (error) { this.error = message(error); }
    finally { this.loading = false; this.cdr.detectChanges(); }
  }
  async openReceipt(id: string) {
    this.error = '';
    try { this.closeReceipt(); this.receiptUrl = URL.createObjectURL(await this.api.expensePhoto(id)); }
    catch (error) { this.error = message(error); }
    finally { this.cdr.detectChanges(); }
  }
  closeReceipt() { if (this.receiptUrl) URL.revokeObjectURL(this.receiptUrl); this.receiptUrl = ''; this.cdr.detectChanges(); }
}
