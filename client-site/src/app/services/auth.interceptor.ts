import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    const message = error.error?.message || '';
                    if (message === 'ACCOUNT_BANNED') {
                        // Force logout banned user
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('user_info');
                        localStorage.removeItem('user_id');
                        alert('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
                        this.router.navigate(['/auth/login']);
                    }
                }
                return throwError(() => error);
            }),
        );
    }
}
