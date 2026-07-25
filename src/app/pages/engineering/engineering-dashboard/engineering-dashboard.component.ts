import { Component } from '@angular/core';
import { EngineeringTableComponent } from './engineering-table/engineering-table.component';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-engineering-dashboard',
  imports: [
    EngineeringTableComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './engineering-dashboard.component.html',
  styleUrl: './engineering-dashboard.component.scss',
})
export class EngineeringDashboardComponent {
  formControl: FormControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[A-Z0-9]{4,5}$/),
  ]);

  openProjectSelector() {}
}
