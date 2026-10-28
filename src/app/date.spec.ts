import { describe, expect, it } from 'vitest';
import { formatArDate, overdueDates, parseArDate } from './date';
import { TestBed } from '@angular/core/testing';
import { DateField } from './date-field';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({ imports: [DateField, FormsModule], template: '<app-date-field name="day" [(ngModel)]="day" [required]="true"></app-date-field>' })
class DateHost { day = '2026-10-28'; }

@Component({ imports: [DateField, FormsModule], template: `<form (ngSubmit)="submitted=true">
  <label>Inicio<app-date-field name="start" [(ngModel)]="start" [required]="true" /></label>
  <label>Finalización<app-date-field name="end" [(ngModel)]="end" [required]="true" /></label>
  <label>Objetivo<app-date-field name="goal" [(ngModel)]="goal" [required]="true" /></label>
  <label>Desde<app-date-field name="from" [(ngModel)]="from" [required]="true" /></label>
  <label>Hasta<app-date-field name="until" [(ngModel)]="until" [required]="true" /></label>
  <button type="submit">Guardar</button>
</form>` })
class AllDateHost {
  start='2026-10-28';end='2026-10-28';goal='2026-10-28';from='2026-10-28';until='2026-10-28';submitted=false;
}

describe('fechas de obra', () => {
  it('muestra dd/MM/aaaa y conserva ISO para la API', () => {
    expect(formatArDate('2026-10-28')).toBe('28/10/2026');
    expect(parseArDate('28/10/2026')).toBe('2026-10-28');
    expect(parseArDate('31/02/2026')).toBeNull();
    expect(parseArDate('29/02/2028')).toBe('2028-02-29');
  });
  it('no marca el día actual antes del cierre ni días futuros como vencidos', () => {
    const goals = ['2026-10-27','2026-10-28','2026-10-29','2026-10-30'].map(date => ({date}));
    expect(overdueDates(goals,[{date:'2026-10-27'}],'2026-10-29','02:00','19:00')).toEqual(['2026-10-28']);
    expect(overdueDates(goals,[{date:'2026-10-27'}],'2026-10-29','19:00','19:00')).toEqual(['2026-10-29','2026-10-28']);
  });
});

describe('selector de fecha', () => {
  it('abre un calendario con semana comenzando el lunes y conserva ISO', () => {
    const fixture = TestBed.configureTestingModule({ imports: [DateField] }).createComponent(DateField);
    const field = fixture.componentInstance;
    let emitted = '';
    field.registerOnChange(value => { emitted = value; });
    field.writeValue('2026-10-28');
    expect(field.display).toBe('28/10/2026');
    expect(field.weekLabels[0]).toBe('Lu');
    expect(field.days.slice(0, 3)).toEqual([null, null, null]);
    field.choose(29);
    expect(emitted).toBe('2026-10-29');
    field.onInput({ target: { value: '31/02/2026' } } as unknown as Event);
    expect(field.error).toContain('Fecha inválida');
    fixture.destroy();
  });
  it('muestra un error legible cuando se escribe una fecha imposible', () => {
    const fixture = TestBed.configureTestingModule({ imports: [DateHost] }).createComponent(DateHost);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = '31/02/2026';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fecha inválida');
    expect(fixture.componentInstance.day).toBe('');
    fixture.destroy();
  });
  it('permite elegir fechas en todos los campos sin enviar el formulario', async () => {
    const fixture = TestBed.configureTestingModule({ imports: [AllDateHost] }).createComponent(AllDateHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const fields = Array.from(fixture.nativeElement.querySelectorAll('app-date-field')) as HTMLElement[];
    for (const field of fields) {
      (field.querySelector('.calendar-toggle') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(field.querySelector('.calendar')).not.toBeNull();
      (field.querySelector('button[aria-label="29/10/2026"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect((field.querySelector('input') as HTMLInputElement).value).toBe('29/10/2026');
      expect(field.querySelector('.calendar')).toBeNull();
    }
    (fields[0].querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(fields[0].querySelector('.calendar')).not.toBeNull();
    (fields[0].querySelector('button[aria-label="Mes siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fields[0].textContent).toContain('noviembre de 2026');
    expect([fixture.componentInstance.start,fixture.componentInstance.end,fixture.componentInstance.goal,fixture.componentInstance.from,fixture.componentInstance.until]).toEqual(Array(5).fill('2026-10-29'));
    expect(fixture.componentInstance.submitted).toBe(false);
    fixture.destroy();
  });
});
