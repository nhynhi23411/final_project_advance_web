import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-auth-navbar",
  templateUrl: "./auth-navbar.component.html",
})
export class AuthNavbarComponent implements OnInit {
  navbarOpen = false;

  constructor(public authService: AuthService) {}

  ngOnInit(): void {}

  setNavbarOpen() {
    this.navbarOpen = !this.navbarOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
