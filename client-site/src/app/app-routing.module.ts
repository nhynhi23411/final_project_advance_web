import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

// layouts
import { AuthComponent } from "./layouts/auth/auth.component";

// auth views
import { LoginComponent } from "./views/auth/login/login.component";
import { RegisterComponent } from "./views/auth/register/register.component";

// no layouts views
import { LandingComponent } from "./views/landing/landing.component";
import { ProfileComponent } from "./views/profile/profile.component";
import { PostItemComponent } from "./views/post-item/post-item.component";
import { ItemDetailComponent } from "./views/item-detail/item-detail.component";
import { PostsComponent } from "./views/posts/posts.component";
import { SuggestionsComponent } from "./views/suggestions/suggestions.component";

import { AuthGuard } from "./guards/auth.guard";

const routes: Routes = [
  // auth views (login/register pages use auth layout)
  {
    path: "auth",
    component: AuthComponent,
    children: [
      { path: "login", component: LoginComponent },
      { path: "register", component: RegisterComponent },
      { path: "", redirectTo: "login", pathMatch: "full" },
    ],
  },
  // application views
  { path: "profile", component: ProfileComponent, canActivate: [AuthGuard] },
  { path: "post-item", component: PostItemComponent },
  { path: "posts", component: PostsComponent },
  { path: "suggestions", component: SuggestionsComponent, canActivate: [AuthGuard] },
  { path: "items/:id", component: ItemDetailComponent },
  // landing page becomes home
  { path: "", component: LandingComponent },
  // keep a redirect from the old landing path for backward compatibility
  { path: "landing", redirectTo: "", pathMatch: "full" },
  { path: "**", redirectTo: "", pathMatch: "full" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
