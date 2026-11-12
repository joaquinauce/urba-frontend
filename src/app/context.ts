import { Injectable, signal } from '@angular/core';
import type { AdministratorIdentity, AuthStore, ForemanStore } from './api';
import type { PersonalSessionStore, PersonIdentity } from './session';

export type ClientOption = { clientId: string; name: string; roles: string[] };
export type LoginResult = { accessToken?: string; administrator?: AdministratorIdentity;
  person?: PersonIdentity; requiresClientSelection?: boolean; selectionToken?: string; clients?: ClientOption[] };
export type PendingSelection = { selectionToken: string; mode: 'password' | 'pin'; clients: ClientOption[] };

const PENDING_KEY = 'beurba-client-selection';
const WORK_KEY = 'beurba-selected-work';
const SWITCH_KEY = 'beurba-can-switch-client';

@Injectable({ providedIn: 'root' })
export class ClientSelectionStore {
  readonly pending = signal<PendingSelection | null>(this.restore());
  readonly canSwitch = signal(sessionStorage.getItem(SWITCH_KEY) === '1');
  private restore(): PendingSelection | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as PendingSelection | null;
      return value?.selectionToken && Array.isArray(value.clients) ? value : null;
    } catch { return null; }
  }
  set(value: PendingSelection) { sessionStorage.setItem(PENDING_KEY, JSON.stringify(value)); this.pending.set(value); }
  clear() { sessionStorage.removeItem(PENDING_KEY); this.pending.set(null); }
  setAvailable(count: number) { const available=count>1; this.canSwitch.set(available);
    if (available) sessionStorage.setItem(SWITCH_KEY,'1'); else sessionStorage.removeItem(SWITCH_KEY); }
  reset() { this.clear(); this.setAvailable(0); }
}

export type SelectedWork = { clientId: string; id: string; name: string };
@Injectable({ providedIn: 'root' })
export class WorkSelectionStore {
  readonly selected = signal<SelectedWork | null>(this.restore());
  private restore(): SelectedWork | null {
    try { const value = JSON.parse(sessionStorage.getItem(WORK_KEY) ?? 'null') as SelectedWork | null;
      return value?.clientId && value?.id && value?.name ? value : null;
    } catch { return null; }
  }
  set(value: SelectedWork) { sessionStorage.setItem(WORK_KEY, JSON.stringify(value)); this.selected.set(value); }
  clear() { sessionStorage.removeItem(WORK_KEY); this.selected.set(null); }
}

export function validToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch { return false; }
}

export function activeClientId(admin: AdministratorIdentity | null, person: PersonIdentity | null) {
  return admin?.clientId ?? person?.clientId ?? '';
}

export function clientName(admin: AdministratorIdentity | null, person: PersonIdentity | null) {
  return admin?.clientName ?? person?.clientName ?? '';
}

export function applyLoginResult(result: LoginResult, auth: AuthStore, personal: PersonalSessionStore,
  foreman: ForemanStore, works: WorkSelectionStore, selection: ClientSelectionStore) {
  if (!result.accessToken || (!result.administrator && !result.person)) throw new Error('La sesión no es válida');
  works.clear();
  auth.clear(); personal.clear(); foreman.clear(); selection.clear();
  if (result.administrator) auth.set(result.accessToken, result.administrator);
  if (result.person) personal.set({ accessToken: result.accessToken, person: result.person });
  return result.administrator ? '/dashboard' : '/mis-obras';
}
