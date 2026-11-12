import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './login-page';

describe('contraseña del login', () => {
  it('arranca oculta y se muestra solo al tocar el botón', () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const password = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement;
    expect(password.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
  it('al entrar como capataz cambia el ojo tachado de ambos códigos', () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.foremanOpen = true;
    fixture.detectChanges();
    for (const name of ['pin', 'personalCode']) {
      const input = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      const button = input.closest('.password-field')!.querySelector('button') as HTMLButtonElement;
      expect(input.type).toBe('password');
      expect(button.querySelectorAll('svg path')).toHaveLength(2);
      button.click();
      fixture.detectChanges();
      expect(input.type).toBe('text');
      expect(button.querySelectorAll('svg path')).toHaveLength(1);
      button.click();
      fixture.detectChanges();
      expect(input.type).toBe('password');
      expect(button.querySelectorAll('svg path')).toHaveLength(2);
    }
    fixture.destroy();
  });
});
