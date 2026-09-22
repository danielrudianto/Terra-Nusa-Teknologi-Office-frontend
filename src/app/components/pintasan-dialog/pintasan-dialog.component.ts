import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../directives/dialog-geser.directive';

@Component({
  selector: 'app-pintasan-dialog',
  standalone: true,
  imports: [MatDialogModule, TranslatePipe, DialogGeserDirective],
  templateUrl: './pintasan-dialog.component.html',
  styleUrl: './pintasan-dialog.component.scss',
})
export class PintasanDialogComponent {
  readonly daftar = [
    { tombol: ['Ctrl', 'K'], label: 'pintasan.cariGlobal' },
    { tombol: ['/'], label: 'pintasan.cari' },
    { tombol: ['N'], label: 'pintasan.baru' },
    { tombol: ['Esc'], label: 'pintasan.tutup' },
    { tombol: ['?'], label: 'pintasan.bantuan' },
  ];

  constructor(private ref: MatDialogRef<PintasanDialogComponent>) {}

  tutup(): void {
    this.ref.close();
  }
}
