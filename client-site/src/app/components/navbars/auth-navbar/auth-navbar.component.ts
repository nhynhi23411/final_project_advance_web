import { Component, OnInit, HostListener } from "@angular/core";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-auth-navbar",
  templateUrl: "./auth-navbar.component.html",
})
export class AuthNavbarComponent implements OnInit {
  navbarOpen = false;
  userMenuOpen = false;
  notifOpen = false;
  notifCount = 2;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {}

  setNavbarOpen(): void {
    this.navbarOpen = !this.navbarOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest(".app-nav-user-wrap")) this.userMenuOpen = false;
    if (!target.closest(".app-nav-notif-wrap")) this.notifOpen = false;
  }
}
