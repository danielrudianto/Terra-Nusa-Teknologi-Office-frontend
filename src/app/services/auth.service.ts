import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from './permission.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private router: Router,
    private permissionService: PermissionService,
  ) {}

  get isLoggedIn() {
    // const token = localStorage.getItem('token');
    // if (token == null) {
    //   this.logout();
    //   return false;
    // }

    // const decodedToken = JSON.parse(atob(token.split('.')[1]));
    // const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
    // if (Date.now() >= expirationTime) {
    //   return true;
    // }

    // return false;
    return false;
  }

  /** Decoded JWT payload of the logged in user (null when not logged in). */
  get userInfo(): { user_id?: number; name?: string; email?: string } | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const rawPayload = token.split('.')[1];
      if (!rawPayload) return null;
      // base64url -> base64, then decode as UTF-8
      const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      const payload = JSON.parse(json);

      // The JWT only carries user_id; login also stores the full user object,
      // so merge it in for name/email.
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          return { ...JSON.parse(stored), ...payload };
        }
      } catch {
        // ignore a malformed cached user
      }

      return payload;
    } catch {
      return null;
    }
  }

  /** Convenience: id of the logged in user. */
  get userId(): number | null {
    const info: any = this.userInfo;
    return info?.user_id ?? info?.id ?? null;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Izin dibersihkan agar pengguna berikutnya di perangkat yang sama tidak
    // sempat melihat menu milik pengguna sebelumnya.
    this.permissionService.clear();
    this.router.navigate(['/Login']);
  }
}
