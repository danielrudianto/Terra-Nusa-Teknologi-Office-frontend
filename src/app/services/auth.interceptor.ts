import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // single-flight refresh: only ONE refresh runs at a time; other 401s wait for it
  private isRefreshing = false;
  private refreshedToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthCall =
          req.url.includes('auth/refresh') || req.url.endsWith('/auth');

        if (error.status === 401 && !isAuthCall) {
          return this.handle401(req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private handle401(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // a refresh is already in flight → queue this request until it finishes
    if (this.isRefreshing) {
      return this.refreshedToken$.pipe(
        filter((token) => token != null),
        take(1),
        switchMap((token) => next.handle(this.addToken(req, token as string))),
      );
    }

    // start a new refresh
    this.isRefreshing = true;
    this.refreshedToken$.next(null);

    return this.apiService.post('auth/refresh', {}).pipe(
      switchMap((tokens: any) => {
        this.isRefreshing = false;

        localStorage.setItem('access_token', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token);
        }

        // release all queued requests with the fresh token
        this.refreshedToken$.next(tokens.access_token);

        // retry the request that triggered the refresh
        return next.handle(this.addToken(req, tokens.access_token));
      }),
      catchError((err) => {
        this.isRefreshing = false;
        this.refreshedToken$.next(null);
        this.forceLogout();
        return throwError(() => err);
      }),
    );
  }

  private forceLogout() {
    // remember where the user was so we can return after re-login
    const currentUrl = this.router.url;
    if (currentUrl && !currentUrl.startsWith('/Login')) {
      try {
        localStorage.setItem('returnUrl', currentUrl);
      } catch {}
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    this.dialog.closeAll();
    this.snackBar.open(
      'Sesi Anda telah berakhir. Silakan masuk kembali.',
      'Close',
      { duration: 4000 },
    );

    this.router.navigate(['/Login']);
  }
}
