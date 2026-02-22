import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent) },
  { path: 'detail/:id', loadComponent: () => import('./pages/detail/detail.component').then((m) => m.DetailComponent) },
  {
    path: 'my',
    loadComponent: () => import('./pages/my-items/my-items.component').then((m) => m.MyItemsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/create/create.component').then((m) => m.CreateComponent),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/edit/edit.component').then((m) => m.EditComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'home' },
];
