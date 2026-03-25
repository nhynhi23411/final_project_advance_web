import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { NgModule, ErrorHandler } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { MatDialogModule } from "@angular/material/dialog";
import { SocketIoConfig, SocketIoModule } from "ngx-socket-io";
import { ServiceWorkerModule } from "@angular/service-worker";
import { AuthInterceptor } from "./services/auth.interceptor";
import { environment } from "../environments/environment";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

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
import { ChatComponent } from "./views/chat/chat.component";

// shared components
import { ImageUploaderComponent } from "./components/image-uploader/image-uploader.component";
import { ClaimModalComponent } from "./components/claim-modal/claim-modal.component";
import { LinkFoundPostModalComponent } from "./components/link-found-post-modal/link-found-post-modal.component";
import { ClosePostModalComponent } from "./components/close-post-modal/close-post-modal.component";
import { ToastComponent } from "./components/toast/toast.component";
import { ChatbotComponent } from "./components/chatbot/chatbot.component";
import { AuthNavbarComponent } from "./components/navbars/auth-navbar/auth-navbar.component";
import { IndexNavbarComponent } from "./components/navbars/index-navbar/index-navbar.component";

// components for views and layouts

import { FooterComponent } from "./components/footers/footer/footer.component";
import { FooterSmallComponent } from "./components/footers/footer-small/footer-small.component";
import { HeaderStatsComponent } from "./components/headers/header-stats/header-stats.component";
import { MapExampleComponent } from "./components/maps/map-example/map-example.component";
import { TableDropdownComponent } from "./components/dropdowns/table-dropdown/table-dropdown.component";
import { NotificationDropdownComponent } from "./components/dropdowns/notification-dropdown/notification-dropdown.component";
import { UserDropdownComponent } from "./components/dropdowns/user-dropdown/user-dropdown.component";
import { OfflineStatusComponent } from "./components/offline-status/offline-status.component";
import { GlobalErrorHandler } from "./global-error.handler";

const socketConfig: SocketIoConfig = {
  url: `${environment.apiUrl.replace(/\/api$/, "")}/chat`,
  options: {
    path: "/socket.io",
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true,
  },
};

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
    IndexNavbarComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    LandingComponent,
    ProfileComponent,
    PostItemComponent,
    ImageUploaderComponent,
    ItemDetailComponent,
    ClaimModalComponent,
    LinkFoundPostModalComponent,
    ClosePostModalComponent,
    ToastComponent,
    ChatbotComponent,
    PostsComponent,
    SuggestionsComponent,
    AboutComponent,
    ArchiveComponent,
    GuidePostingComponent,
    ReturnProcessComponent,
    TermsComponent,
    EditItemComponent,
    MyClaimsComponent,
    ChatComponent,
    OfflineStatusComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatDialogModule,
    SocketIoModule.forRoot(socketConfig),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Đăng ký SW sau khi app ổn định 30s, không ảnh hưởng startup performance
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
