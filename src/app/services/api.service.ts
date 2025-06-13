import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  post(url: string, body: any) {
    const access_token = `Bearer ${localStorage.getItem('access_token')}`;
    const refresh_token = `Bearer ${localStorage.getItem('refresh_token')}`;

    return this.http.post(environment.url + url, body, {
      headers: {
        Authorization: access_token,
        'X-Refresh-Token': refresh_token,
      },
    });
  }

  get(url: string, queryParams: any) {
    const access_token = `Bearer ${localStorage.getItem('access_token')}`;
    const refresh_token = `Bearer ${localStorage.getItem('refresh_token')}`;

    return this.http.get(environment.url + url, {
      headers: {
        Authorization: access_token,
        'X-Refresh-Token': refresh_token,
      },
      params: queryParams,
    });
  }

  put(url: string, body: any) {
    const access_token = `Bearer ${localStorage.getItem('access_token')}`;
    const refresh_token = `Bearer ${localStorage.getItem('refresh_token')}`;

    return this.http.put(environment.url + url, body, {
      headers: {
        Authorization: access_token,
        'X-Refresh-Token': refresh_token,
      },
    });
  }

  delete(url: string) {
    const access_token = `Bearer ${localStorage.getItem('access_token')}`;
    const refresh_token = `Bearer ${localStorage.getItem('refresh_token')}`;

    return this.http.delete(environment.url + url, {
      headers: {
        Authorization: access_token,
        'X-Refresh-Token': refresh_token,
      },
    });
  }
}
