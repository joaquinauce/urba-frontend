import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthStore, ForemanStore } from './api';
import { LoginPage, DashboardPage, ForemenPage, WorkPage, PublicPage, InstallPage } from './pages';
import { PeoplePage } from './people-page';
import { MemberWorkPage, MemberWorksPage } from './member-pages';
import { PersonalSessionStore, personalLanding } from './session';

export const adminGuard = () => inject(AuthStore).token() ? true : inject(Router).createUrlTree(['/login']);
export const legacyForemanGuard = () => inject(ForemanStore).token() ? true : inject(Router).createUrlTree(['/capataz']);
export const personGuard = () => inject(PersonalSessionStore).session() ? true : inject(Router).createUrlTree(['/login']);
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
  {path:'capataz',component:LoginPage,data:{foremanModal:true}},
  {path:'mi-obra/gastos',loadComponent:()=>import('./expense-pages').then(module=>module.MemberExpensesPage),canActivate:[legacyForemanGuard]},
  {path:'mi-obra',component:PublicPage,canActivate:[legacyForemanGuard]},
  {path:'dashboard',component:DashboardPage,canActivate:[adminGuard]},
  {path:'personas',component:PeoplePage,canActivate:[adminGuard]},
  {path:'capataces',component:ForemenPage,canActivate:[adminGuard]},
  {path:'obras',loadComponent:()=>import('./works-page').then(module=>module.WorksPage),canActivate:[adminGuard]},
  {path:'informes',loadComponent:()=>import('./reports-pages').then(module=>module.ReportsHubPage),canActivate:[adminGuard]},
  {path:'informes/objetivos-diarios',loadComponent:()=>import('./reports-pages').then(module=>module.DailyGoalsReportPage),canActivate:[adminGuard]},
  {path:'informes/rendiciones',loadComponent:()=>import('./expense-pages').then(module=>module.AdminExpensesPage),canActivate:[adminGuard]},
  {path:'rendiciones',pathMatch:'full',redirectTo:'informes/rendiciones'},
  {path:'configuracion',loadComponent:()=>import('./expense-type-pages').then(module=>module.SettingsHubPage),canActivate:[adminGuard]},
  {path:'configuracion/tipos-de-gasto',loadComponent:()=>import('./expense-type-pages').then(module=>module.ExpenseTypesSettingsPage),canActivate:[adminGuard]},
  {path:'obras/:id',component:WorkPage,canActivate:[adminGuard]},
  {path:'supervision',component:MemberWorksPage,canActivate:[personGuard,siteManagerGuard]},
  {path:'supervision/:id',component:MemberWorkPage,canActivate:[personGuard,siteManagerGuard]},
  {path:'mis-obras',component:MemberWorksPage,canActivate:[personGuard,personalForemanGuard]},
  {path:'mis-obras/:id/gastos',loadComponent:()=>import('./expense-pages').then(module=>module.MemberExpensesPage),canActivate:[personGuard,personalForemanGuard]},
  {path:'mis-obras/:id',component:MemberWorkPage,canActivate:[personGuard,personalForemanGuard]},
  {path:'obra/:code',component:PublicPage},
  {path:'instalar',component:InstallPage},
  {path:'**',redirectTo:'login'},
];
