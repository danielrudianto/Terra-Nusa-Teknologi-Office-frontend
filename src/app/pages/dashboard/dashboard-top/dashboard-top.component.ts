import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-dashboard-top',
  templateUrl: './dashboard-top.component.html',
  styleUrls: ['./dashboard-top.component.scss'],
  standalone: true,
})
export class DashboardTopComponent {
  constructor(public authService: AuthService) {}

  ngOnInit(): void {}
}
