// Angular Import
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// project import
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { GuestGuard } from './guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    canActivate: [AdminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/analytics',
        pathMatch: 'full'
      },
      {
        path: 'analytics',
        loadComponent: () => import('./demo/dashboard/dash-analytics.component').then((c) => c.DashAnalyticsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./demo/users/users.component').then((c) => c.UsersComponent)
      },
      {
        path: 'moderation',
        loadComponent: () => import('./demo/admin-moderation/moderation.component').then((c) => c.ModerationComponent)
      },
      {
        path: 'matches',
        loadComponent: () => import('./demo/admin-matches/matches.component').then((c) => c.MatchesComponent)
      },
      {
        path: 'matches/weights',
        loadComponent: () => import('./demo/admin-match-weights/match-weights.component').then((c) => c.MatchWeightsComponent)
      }
    ]
  },
  {
    path: '',
    component: GuestComponent,
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/authentication/sign-in/sign-in.component').then((c) => c.SignInComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

