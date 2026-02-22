import { Injectable, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User, LoginResponse } from '../models/user.model';

const TOKEN_KEY = 'lf.token';
const USER_KEY = 'lf.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string>(localStorage.getItem(TOKEN_KEY) ?? '');
  private user = signal<User | null>(this.parseUser(localStorage.getItem(USER_KEY)));

  isLoggedIn = computed(() => !!this.token());
  currentUser = computed(() => this.user());

  constructor(private api: ApiService) {}

  private parseUser(raw: string | null): User | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  getToken(): string {
    return this.token();
  }

  register(name: string, email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/auth/register', { name, email, password }).pipe(
      tap((res) => {
        if (res.accessToken) {
          this.token.set(res.accessToken);
          localStorage.setItem(TOKEN_KEY, res.accessToken);
        }
        if (res.user) {
          this.user.set(res.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap((res) => {
        if (res.accessToken) {
          this.token.set(res.accessToken);
          localStorage.setItem(TOKEN_KEY, res.accessToken);
        }
        if (res.user) {
          this.user.set(res.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  logout(): void {
    this.token.set('');
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
