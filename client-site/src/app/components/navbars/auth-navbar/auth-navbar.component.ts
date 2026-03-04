import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-auth-navbar",
  templateUrl: "./auth-navbar.component.html",
})
export class AuthNavbarComponent implements OnInit {
  navbarOpen = false;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  setNavbarOpen() {
    this.navbarOpen = !this.navbarOpen;
  }

  get isLoggedIn(): boolean {
    return !!(
      localStorage.getItem("access_token") ||
      localStorage.getItem("user_id")
    );
  }

  logout(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    this.router.navigate(["/"]);
  }
}
