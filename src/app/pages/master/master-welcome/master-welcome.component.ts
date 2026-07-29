import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-master-welcome',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './master-welcome.component.html',
  styleUrl: './master-welcome.component.scss',
})
export class MasterWelcomeComponent {}
