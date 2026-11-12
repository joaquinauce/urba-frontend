import { Injectable, computed, signal } from '@angular/core';

export type PersonalRole = 'SITE_MANAGER' | 'FOREMAN';

export interface PersonIdentity {
  id: string;
  administratorId: string;
  clientId?: string;
  clientName?: string;
  fullName: string;
  roles: PersonalRole[];
}

export interface PersonalSession {
  accessToken: string;
  person: PersonIdentity;
}

const SESSION_KEY = 'beurba-person-session';

function restoredSession(): PersonalSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PersonalSession;
    if (
      typeof value.accessToken !== 'string' ||
      !value.accessToken ||
      typeof value.person?.id !== 'string' ||
      !Array.isArray(value.person.roles) ||
      value.person.roles.some(
        (role) => role !== 'SITE_MANAGER' && role !== 'FOREMAN',
      )
    )
      throw new Error('invalid');
    return value;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class PersonalSessionStore {
  readonly session = signal<PersonalSession | null>(restoredSession());
  readonly token = computed(() => this.session()?.accessToken ?? '');
  readonly person = computed(() => this.session()?.person ?? null);
  readonly canWrite = computed(() =>
    this.person()?.roles.some((role) => role === 'FOREMAN' || role === 'SITE_MANAGER') ?? false,
  );

  set(session: PersonalSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  clear() {
    sessionStorage.removeItem(SESSION_KEY);
    this.session.set(null);
  }
}

export function personalLanding(_person: PersonIdentity) {
  return '/mis-obras';
}

export function roleLabel(role: PersonalRole) {
  return role === 'SITE_MANAGER' ? 'Jefe de obra' : 'Capataz';
}

