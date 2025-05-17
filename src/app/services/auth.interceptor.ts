import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('auth/refresh')) {
          // Attempt to refresh the token
          return this.apiService.post('auth/refresh', {}).pipe(
            switchMap((newTokens: any) => {
              // Save the new tokens
              localStorage.setItem('access_token', newTokens.access_token);

              // Clone the original request with the new token
              const clonedRequest = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newTokens.access_token}`,
                },
              });

              // Retry the original request
              return next.handle(clonedRequest);
            }),
            catchError((error) => {
              // If the refresh token request fails, log out the user
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');

              // Close any opened dialogs
              this.dialog.closeAll();

              // route to login page
              this.router.navigate(['/Login']);

              return throwError(() => error);
            })
          );
        }

        // If not a 401 error, propagate the error
        return throwError(error);
      })
    );
  }
}
