import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef, inject } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { formatArDate, parseArDate } from './date';

@Component({
  selector: 'app-date-field',
  imports: [CommonModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateField), multi: true },
  ],
  template: `
    <div class="date-field">
      <div class="date-input-row">
        <input type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="dd/MM/aaaa"
          [value]="display" [disabled]="disabled" [attr.aria-invalid]="error ? 'true' : null"
          (input)="onInput($event)" (click)="showCalendar()" (blur)="onTouched()" (keydown.escape)="open=false">
        <button type="button" class="calendar-toggle" aria-label="Abrir calendario" [disabled]="disabled" (click)="toggle($event)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>
        </button>
      </div>
      @if(error){<small class="date-error">{{error}}</small>}
      @if(open){<div class="calendar" role="dialog" aria-label="Seleccionar fecha">
        <div class="calendar-heading"><button type="button" aria-label="Mes anterior" (click)="moveMonth(-1,$event)">‹</button><strong>{{monthLabel}}</strong><button type="button" aria-label="Mes siguiente" (click)="moveMonth(1,$event)">›</button></div>
        <div class="calendar-days">@for(day of weekLabels;track day){<span>{{day}}</span>}</div>
        <div class="calendar-grid">@for(day of days;track $index){@if(day){<button type="button" [class.selected]="dayIso(day)===value" [attr.aria-label]="dayLabel(day)" (click)="choose(day,$event)">{{day}}</button>}@else{<span></span>}}</div>
      </div>}
    </div>`,
  styles: [`
    :host{display:block;min-width:0}.date-field{position:relative}.date-input-row{position:relative;margin-top:8px}.date-input-row input{width:100%!important;margin-top:0!important;padding-right:50px!important}.calendar-toggle{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;background:transparent;color:#15564b;border-radius:8px;display:grid;place-items:center}.calendar-toggle:hover{background:#e8f0eb}.calendar{position:absolute;top:calc(100% + 6px);left:0;z-index:30;width:min(318px,calc(100vw - 32px));padding:14px;background:#fff;border:1px solid #d7e1da;border-radius:14px;box-shadow:0 16px 40px #153d3626}.calendar-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;text-transform:capitalize}.calendar-heading button{border:0;background:#e8f0eb;color:#15564b;border-radius:8px;width:34px;height:34px;font-size:1.4rem}.calendar-days,.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;gap:3px}.calendar-days{color:#71837a;font-size:.72rem;font-weight:800;margin-bottom:5px}.calendar-grid button{border:0;background:transparent;color:#213b34;min-height:38px;border-radius:8px}.calendar-grid button:hover{background:#e8f0eb}.calendar-grid button.selected{background:#15564b;color:#fff}.date-error{display:block;color:#a53d2f;font-weight:600;margin-top:5px}.date-input-row input[aria-invalid=true]{border-color:#a53d2f!important}@media(max-width:600px){.calendar{left:auto;right:0}}
  `],
})
export class DateField implements ControlValueAccessor, Validator {
  private host = inject(ElementRef<HTMLElement>);
  @Input() required = false;
  value = '';
  display = '';
  error = '';
  disabled = false;
  open = false;
  month = new Date();
  weekLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  private change: (value: string) => void = () => {};
  private touched: () => void = () => {};
  private validationChanged: () => void = () => {};

  writeValue(value: string): void {
    this.value = value || '';
    this.display = formatArDate(this.value);
    this.error = '';
    if (this.value) this.month = new Date(`${this.value.slice(0, 7)}-01T12:00:00Z`);
  }
  registerOnChange(fn: (value: string) => void): void { this.change = fn; }
  registerOnTouched(fn: () => void): void { this.touched = fn; }
  registerOnValidatorChange(fn: () => void): void { this.validationChanged = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  validate(_: AbstractControl): ValidationErrors | null {
    if (this.required && !this.value) return { required: true };
    return this.error ? { date: true } : null;
  }
  onTouched(): void { this.touched(); }
  onInput(event: Event): void {
    this.display = (event.target as HTMLInputElement).value;
    const parsed = parseArDate(this.display);
    this.value = parsed ?? '';
    this.error = this.display && !parsed ? 'Fecha inválida. Usá dd/MM/aaaa.' : '';
    this.change(this.value);
    this.validationChanged();
  }
  showCalendar(): void { if (!this.disabled) this.open = true; }
  toggle(event?: Event): void { event?.preventDefault(); event?.stopPropagation(); this.open = !this.open; if (this.open && this.value) this.month = new Date(`${this.value.slice(0, 7)}-01T12:00:00Z`); }
  moveMonth(delta: number, event?: Event): void { event?.preventDefault(); event?.stopPropagation(); this.month = new Date(Date.UTC(this.month.getUTCFullYear(), this.month.getUTCMonth() + delta, 1, 12)); }
  get monthLabel(): string { return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(this.month); }
  get days(): (number | null)[] {
    const year = this.month.getUTCFullYear(), month = this.month.getUTCMonth();
    const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }
  dayIso(day: number): string { return `${this.month.getUTCFullYear()}-${String(this.month.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
  dayLabel(day: number): string { return formatArDate(this.dayIso(day)); }
  choose(day: number, event?: Event): void { event?.preventDefault(); event?.stopPropagation(); this.value = this.dayIso(day); this.display = formatArDate(this.value); this.error = ''; this.open = false; this.change(this.value); this.touched(); this.validationChanged(); }
  @HostListener('document:click', ['$event']) outside(event: MouseEvent): void { if (!this.host.nativeElement.contains(event.target as Node)) this.open = false; }
}
