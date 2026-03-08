import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface UserInfo {
  id?: string;
  userId?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly userInfoKey = 'user_info';

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(this.getStoredUserInfo());

  isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();
  userInfo$: Observable<UserInfo | null> = this.userInfoSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  get userInfo(): UserInfo | null {
    return this.userInfoSubject.value;
  }

  get currentUserId(): string | null {
    const info = this.userInfoSubject.value;
    if (info?.id) return String(info.id);
    if (info?.userId) return String(info.userId);
    return localStorage.getItem('user_id') || null;
  }

  private hasToken(): boolean {
    return !!(localStorage.getItem(this.tokenKey) || localStorage.getItem('user_id'));
  }

  private getStoredUserInfo(): UserInfo | null {
    try {
      const raw = localStorage.getItem(this.userInfoKey);
      if (!raw) return null;
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  setAuth(token: string, user?: UserInfo): void {
    localStorage.setItem(this.tokenKey, token);
    if (user) {
      const id = (user as any).id ?? (user as any).userId;
      if (id) localStorage.setItem('user_id', String(id));
      localStorage.setItem(this.userInfoKey, JSON.stringify(user));
      this.userInfoSubject.next(user);
    }
    this.isLoggedInSubject.next(true);
  }

  logout(redirectTo = '/'): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userInfoKey);
    localStorage.removeItem('user_id');
    this.isLoggedInSubject.next(false);
    this.userInfoSubject.next(null);
    this.router.navigate([redirectTo]);
  }

  login(email: string, password: string): Observable<{ accessToken: string; user: UserInfo }> {
    return this.http.post<{ accessToken?: string; access_token?: string; user?: UserInfo }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ) as Observable<{ accessToken: string; user: UserInfo }>;
  }

  register(data: { name: string; username: string; email: string; phone: string; password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, data);
  }
}
