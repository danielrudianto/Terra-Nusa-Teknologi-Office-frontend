import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { availablePPhSearch, IPPh, availablePPh } from 'src/app/utils/pph';

@Component({
  selector: 'app-pph-selector',
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    TranslatePipe,
  ],
  templateUrl: './pph-selector.component.html',
  styleUrls: ['./pph-selector.component.scss'],
  standalone: true,
})
export class PphSelectorComponent {
  constructor(private dialog: MatDialogRef<PphSelectorComponent>) {}

  pphList: IPPh[] = [];
  pphSearchFormControl: FormControl = new FormControl('');
  SKBFormControl: FormControl = new FormControl(false);

  ngOnInit(): void {
    this.pphList = availablePPh;
    this.pphSearchFormControl.valueChanges.subscribe((value) => {
      this.pphList = availablePPhSearch.search(value);
    });
  }

  selectPph(pph: IPPh) {
    if (this.SKBFormControl.value == true) {
      this.dialog.close({
        ...pph,
        tariff: 0,
      });
    } else {
      this.dialog.close(pph);
    }
  }

  onClose() {
    this.dialog.close();
  }
}
