import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
}

const AUTH_TOKEN_KEY = 'access_token';
const AUTH_USER_KEY = 'admin_user';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _isAuthenticated$ = new BehaviorSubject<boolean>(false);
  private readonly _currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  readonly isAuthenticated$: Observable<boolean> = this._isAuthenticated$.asObservable();
  readonly currentUser$: Observable<AuthUser | null> = this._currentUser$.asObservable();

  constructor() {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (storedToken) {
      this._isAuthenticated$.next(true);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as AuthUser;
          this._currentUser$.next(parsed);
        } catch {
          this._currentUser$.next(null);
        }
      }
    }
  }

  loginSuccess(token: string, user: AuthUser): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    this._isAuthenticated$.next(true);
    this._currentUser$.next(user);
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    this._isAuthenticated$.next(false);
    this._currentUser$.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getCurrentUserSnapshot(): AuthUser | null {
    return this._currentUser$.getValue();
  }
}

