import { Component } from '@angular/core';
import { DashboardBodyComponent } from './dashboard-body/dashboard-body.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [DashboardBodyComponent],
})
export class DashboardComponent {}
