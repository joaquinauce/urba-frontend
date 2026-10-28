import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthStore } from './api';
import { LoginPage, DashboardPage, ForemenPage, WorksPage, WorkPage, PublicPage, InstallPage } from './pages';

const guard = () => inject(AuthStore).token() ? true : inject(Router).createUrlTree(['/login']);
export const routes: Routes = [
  {path:'',pathMatch:'full',redirectTo:'dashboard'},
  {path:'login',component:LoginPage},
  {path:'dashboard',component:DashboardPage,canActivate:[guard]},
  {path:'capataces',component:ForemenPage,canActivate:[guard]},
  {path:'obras',component:WorksPage,canActivate:[guard]},
  {path:'obras/:id',component:WorkPage,canActivate:[guard]},
  {path:'obra/:code',component:PublicPage},
  {path:'instalar',component:InstallPage},
  {path:'**',redirectTo:'dashboard'},
];
