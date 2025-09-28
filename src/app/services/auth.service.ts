import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private router: Router) {}

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

  get userInfo() {
    if (this.isLoggedIn) {
      return null;
    } else {
      return {
        name: 'Daniel Tri',
      };
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/Login']);
  }
}
