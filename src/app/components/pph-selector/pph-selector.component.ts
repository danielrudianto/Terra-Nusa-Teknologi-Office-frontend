import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { availablePPhSearch, IPPh, availablePPh } from 'src/app/utils/pph';

@Component({
  selector: 'app-pph-selector',
  templateUrl: './pph-selector.component.html',
  styleUrls: ['./pph-selector.component.scss'],
})
export class PphSelectorComponent {
  constructor(private dialog: MatDialogRef<PphSelectorComponent>) {}

  pphList: IPPh[] = [];
  pphSearchFormControl: FormControl = new FormControl('');

  ngOnInit(): void {
    this.pphList = availablePPh;
    this.pphSearchFormControl.valueChanges.subscribe((value) => {
      this.pphList = availablePPhSearch.search(value);
    });
  }

  selectPph(pph: IPPh) {
    this.dialog.close(pph);
  }

  onClose() {
    this.dialog.close();
  }
}
