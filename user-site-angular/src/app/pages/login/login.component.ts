import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.error = err?.message || 'Đăng nhập thất bại';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}
