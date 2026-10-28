import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthStore, ForemanStore } from './api';
import { LoginPage, AliasLoginPage, DashboardPage, ForemenPage, WorksPage, WorkPage, PublicPage, InstallPage } from './pages';

const guard = () => inject(AuthStore).token() ? true : inject(Router).createUrlTree(['/login']);
const foremanGuard = () => inject(ForemanStore).token() ? true : inject(Router).createUrlTree(['/capataz']);
export const routes: Routes = [
  {path:'',pathMatch:'full',redirectTo:'dashboard'},
  {path:'login',component:LoginPage},
  {path:'capataz',component:AliasLoginPage},
  {path:'mi-obra',component:PublicPage,canActivate:[foremanGuard]},
  {path:'dashboard',component:DashboardPage,canActivate:[guard]},
  {path:'capataces',component:ForemenPage,canActivate:[guard]},
  {path:'obras',component:WorksPage,canActivate:[guard]},
  {path:'obras/:id',component:WorkPage,canActivate:[guard]},
  {path:'obra/:code',component:PublicPage},
  {path:'instalar',component:InstallPage},
  {path:'**',redirectTo:'dashboard'},
];
