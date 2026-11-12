import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthStore, ForemanStore } from './api';
import { LoginPage } from './login-page';
import { PersonalSessionStore, personalLanding } from './session';
import { validToken } from './context';

export const adminGuard = () => { const store=inject(AuthStore); const token=store.token(); if(token && validToken(token)) return true; store.clear(); return inject(Router).createUrlTree(['/login']); };
export const platformGuard = () => inject(AuthStore).administrator()?.platformOperator ? true : inject(Router).createUrlTree(['/dashboard']);
export const legacyForemanGuard = () => inject(ForemanStore).token() ? true : inject(Router).createUrlTree(['/capataz']);
export const personGuard = () => { const store=inject(PersonalSessionStore); const token=store.token(); if(token && validToken(token)) return true; store.clear(); return inject(Router).createUrlTree(['/login']); };
export const siteManagerGuard = () => {
  const person = inject(PersonalSessionStore).person();
  return person?.roles.includes('SITE_MANAGER') ? true : person ? inject(Router).createUrlTree([personalLanding(person)]) : inject(Router).createUrlTree(['/login']);
};
export const personalForemanGuard = () => {
  const person = inject(PersonalSessionStore).person();
  return person?.roles.some((role) => role === 'FOREMAN' || role === 'SITE_MANAGER') ? true : person ? inject(Router).createUrlTree([personalLanding(person)]) : inject(Router).createUrlTree(['/login']);
};
export const routes: Routes = [
  {path:'',pathMatch:'full',redirectTo:'login'},
  {path:'login',component:LoginPage},
  {path:'seleccionar-constructora',loadComponent:()=>import('./client-choice-page').then(module=>module.ClientChoicePage)},
  {path:'capataz',component:LoginPage,data:{foremanModal:true}},
  {path:'mi-obra/gastos',loadComponent:()=>import('./expense-pages').then(module=>module.MemberExpensesPage),canActivate:[legacyForemanGuard]},
  {path:'mi-obra',loadComponent:()=>import('./pages').then(module=>module.PublicPage),canActivate:[legacyForemanGuard]},
  {path:'dashboard',loadComponent:()=>import('./pages').then(module=>module.DashboardPage),canActivate:[adminGuard]},
  {path:'personas',loadComponent:()=>import('./people-page').then(module=>module.PeoplePage),canActivate:[adminGuard]},
  {path:'clientes',loadComponent:()=>import('./clients-page').then(module=>module.ClientsPage),canActivate:[adminGuard,platformGuard]},
  {path:'invitaciones',loadComponent:()=>import('./invitations-page').then(module=>module.InvitationsPage)},
  {path:'capataces',loadComponent:()=>import('./pages').then(module=>module.ForemenPage),canActivate:[adminGuard]},
  {path:'obras',loadComponent:()=>import('./works-page').then(module=>module.WorksPage),canActivate:[adminGuard]},
  {path:'informes',loadComponent:()=>import('./reports-pages').then(module=>module.ReportsHubPage),canActivate:[adminGuard]},
  {path:'informes/objetivos-diarios',loadComponent:()=>import('./reports-pages').then(module=>module.DailyGoalsReportPage),canActivate:[adminGuard]},
  {path:'informes/rendiciones',loadComponent:()=>import('./expense-pages').then(module=>module.AdminExpensesPage),canActivate:[adminGuard]},
  {path:'rendiciones',pathMatch:'full',redirectTo:'informes/rendiciones'},
  {path:'configuracion',loadComponent:()=>import('./expense-type-pages').then(module=>module.SettingsHubPage),canActivate:[adminGuard]},
  {path:'configuracion/tipos-de-gasto',loadComponent:()=>import('./expense-type-pages').then(module=>module.ExpenseTypesSettingsPage),canActivate:[adminGuard]},
  {path:'obras/:id',loadComponent:()=>import('./pages').then(module=>module.WorkPage),canActivate:[adminGuard]},
  {path:'supervision',loadComponent:()=>import('./member-pages').then(module=>module.MemberWorksPage),canActivate:[personGuard,siteManagerGuard]},
  {path:'supervision/:id',loadComponent:()=>import('./member-pages').then(module=>module.MemberWorkPage),canActivate:[personGuard,siteManagerGuard]},
  {path:'mis-obras',loadComponent:()=>import('./member-pages').then(module=>module.MemberWorksPage),canActivate:[personGuard,personalForemanGuard]},
  {path:'mis-obras/:id/gastos',loadComponent:()=>import('./expense-pages').then(module=>module.MemberExpensesPage),canActivate:[personGuard,personalForemanGuard]},
  {path:'mis-obras/:id',loadComponent:()=>import('./member-pages').then(module=>module.MemberWorkPage),canActivate:[personGuard,personalForemanGuard]},
  {path:'obra/:code',loadComponent:()=>import('./pages').then(module=>module.PublicPage)},
  {path:'instalar',loadComponent:()=>import('./pages').then(module=>module.InstallPage)},
  {path:'**',redirectTo:'login'},
];
