import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { SearchSelect } from './search-select';

@Component({ imports: [FormsModule, SearchSelect], template: `<app-search-select name="responsable" [(ngModel)]="selected" [options]="options" label="Responsable"></app-search-select>` })
class Host { selected = ''; options = [{ value: 'ana', label: 'Ana Pérez' }, { value: 'juan', label: 'Juan López' }]; }

describe('selector con búsqueda', () => {
  it('filtra opciones y guarda una única selección', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.search-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'juan';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const options = [...fixture.nativeElement.querySelectorAll('[role="option"]')] as HTMLButtonElement[];
    expect(options.map(option => option.textContent?.trim())).toEqual(['Juan López']);
    options[0].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selected).toBe('juan');
    fixture.destroy();
  });

  it('selecciona la primera coincidencia al pulsar Enter sin enviar el formulario', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.search-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.selected).toBe('ana');
    fixture.destroy();
  });
});
