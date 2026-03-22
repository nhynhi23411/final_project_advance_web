import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

// layouts
import { AuthComponent } from "./layouts/auth/auth.component";

// auth views
import { LoginComponent } from "./views/auth/login/login.component";
import { RegisterComponent } from "./views/auth/register/register.component";
import { ForgotPasswordComponent } from "./views/auth/forgot-password/forgot-password.component";
import { ResetPasswordComponent } from "./views/auth/reset-password/reset-password.component";

// no layouts views
import { LandingComponent } from "./views/landing/landing.component";
import { ProfileComponent } from "./views/profile/profile.component";
import { PostItemComponent } from "./views/post-item/post-item.component";
import { ItemDetailComponent } from "./views/item-detail/item-detail.component";
import { PostsComponent } from "./views/posts/posts.component";
import { SuggestionsComponent } from "./views/suggestions/suggestions.component";
import { AboutComponent } from "./views/about/about.component";
import { ArchiveComponent } from "./views/archive/archive.component";
import { GuidePostingComponent } from "./views/guide-posting/guide-posting.component";
import { ReturnProcessComponent } from "./views/return-process/return-process.component";
import { TermsComponent } from "./views/terms/terms.component";
import { EditItemComponent } from "./views/edit-item/edit-item.component";
import { MyClaimsComponent } from "./views/my-claims/my-claims.component";

import { AuthGuard } from "./guards/auth.guard";

const routes: Routes = [
  // auth views (login/register pages use auth layout)
  {
    path: "auth",
    component: AuthComponent,
    children: [
      { path: "login", component: LoginComponent },
      { path: "register", component: RegisterComponent },
      { path: "forgot-password", component: ForgotPasswordComponent },
      { path: "reset-password", component: ResetPasswordComponent },
      { path: "", redirectTo: "login", pathMatch: "full" },
    ],
  },
  // application views
  { path: "profile", component: ProfileComponent, canActivate: [AuthGuard] },
  { path: "archive", component: ArchiveComponent, canActivate: [AuthGuard] },
  { path: "edit-item/:id", component: EditItemComponent, canActivate: [AuthGuard] },
  { path: "my-claims", component: MyClaimsComponent, canActivate: [AuthGuard] },
  { path: "post-item", component: PostItemComponent, canActivate: [AuthGuard] },
  { path: "posts", component: PostsComponent },
  { path: "suggestions", component: SuggestionsComponent },
  { path: "about", component: AboutComponent },
  { path: "guide-posting", component: GuidePostingComponent },
  { path: "return-process", component: ReturnProcessComponent },
  { path: "terms", component: TermsComponent },
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
