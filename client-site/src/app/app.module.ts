import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

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

// shared components
import { ImageUploaderComponent } from "./components/image-uploader/image-uploader.component";
import { ClaimModalComponent } from "./components/claim-modal/claim-modal.component";
import { AuthNavbarComponent } from "./components/navbars/auth-navbar/auth-navbar.component";

// components for views and layouts

import { FooterComponent } from "./components/footers/footer/footer.component";
import { FooterSmallComponent } from "./components/footers/footer-small/footer-small.component";
import { HeaderStatsComponent } from "./components/headers/header-stats/header-stats.component";
import { MapExampleComponent } from "./components/maps/map-example/map-example.component";
import { TableDropdownComponent } from "./components/dropdowns/table-dropdown/table-dropdown.component";
import { NotificationDropdownComponent } from "./components/dropdowns/notification-dropdown/notification-dropdown.component";
import { UserDropdownComponent } from "./components/dropdowns/user-dropdown/user-dropdown.component";

@NgModule({
  declarations: [
    AppComponent,
    TableDropdownComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
    FooterComponent,
    FooterSmallComponent,
    HeaderStatsComponent,
    MapExampleComponent,
    AuthComponent,
    AuthNavbarComponent,
    LoginComponent,
    RegisterComponent,
    LandingComponent,
    ProfileComponent,
    PostItemComponent,
    ImageUploaderComponent,
    ItemDetailComponent,
    ClaimModalComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
