import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name = '';
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
    this.auth.register(this.name.trim(), this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.error = err?.message || 'Đăng ký thất bại';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}
