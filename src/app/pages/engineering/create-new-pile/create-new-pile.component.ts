import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-create-new-pile',
  providers: [provideNgxMask()],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    NgxMaskDirective,
  ],
  templateUrl: './create-new-pile.component.html',
  styleUrl: './create-new-pile.component.scss',
})
export class CreateNewPileComponent {
  constructor(private apiService: ApiService) {}

  formGroup: FormGroup = new FormGroup({
    projectName: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[A-Z0-9]{4,5}$/),
    ]),
    pileName: new FormControl('', Validators.required),
    diameter: new FormControl(0, [Validators.required, Validators.min(0.4)]),
    type: new FormControl(0, Validators.required),
    col: new FormControl(0, Validators.required),
    tip: new FormControl(0, Validators.required),
    gs: new FormControl(0, Validators.required),
    x: new FormControl(0, Validators.required),
    y: new FormControl(0, Validators.required),
  });
}
