import { describe, expect, it } from 'vitest';
import { formatArDate, overdueDates, parseArDate } from './date';
import { TestBed } from '@angular/core/testing';
import { DateField } from './date-field';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({ imports: [DateField, FormsModule], template: '<app-date-field name="day" [(ngModel)]="day" [required]="true"></app-date-field>' })
class DateHost { day = '2026-10-28'; }

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
});
