import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-master-welcome',
  standalone: true,
  imports: [TranslatePipe, CommonModule, MatIconModule],
  templateUrl: './master-welcome.component.html',
  styleUrl: './master-welcome.component.scss',
})
export class MasterWelcomeComponent {}
