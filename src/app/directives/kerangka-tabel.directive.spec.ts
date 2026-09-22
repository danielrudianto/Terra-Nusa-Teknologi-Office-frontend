import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';
import { KerangkaTabelDirective } from './kerangka-tabel.directive';

@Component({
  standalone: true,
  imports: [MatTableModule, KerangkaTabelDirective],
  template: `
    <table mat-table [dataSource]="rows" [appKerangka]="memuat">
      <ng-container matColumnDef="a">
        <th mat-header-cell *matHeaderCellDef>A</th>
        <td mat-cell *matCellDef="let r">{{ r.a }}</td>
      </ng-container>
      <ng-container matColumnDef="b">
        <th mat-header-cell *matHeaderCellDef>B</th>
        <td mat-cell *matCellDef="let r">{{ r.b }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="['a', 'b']"></tr>
      <tr mat-row *matRowDef="let row; columns: ['a', 'b']"></tr>
      <tr class="kosong" *matNoDataRow><td colspan="2">Tidak ada data</td></tr>
    </table>
  `,
})
class Tuan {
  rows: any[] = [];
  memuat = true;
}

describe('KerangkaTabelDirective', () => {
  function buat() {
    const f = TestBed.createComponent(Tuan);
    f.detectChanges();
    f.detectChanges();
    return f;
  }
  const kerangka = (f: any) => f.nativeElement.querySelector('tbody.akn-kerangka');

  it('memuat tanpa baris: kerangka tampil, selebar kolom kepalanya', () => {
    const f = buat();
    const tb = kerangka(f);
    expect(tb).not.toBeNull();
    expect(tb.querySelectorAll('tr').length).toBe(6);
    expect(tb.querySelector('tr').children.length).toBe(2);
    expect(f.nativeElement.querySelector('table').classList).toContain('akn-tabel-memuat');
  });

  it('data tiba: kerangka hilang', () => {
    const f = buat();
    f.componentInstance.rows = [{ a: 1, b: 2 }];
    f.componentInstance.memuat = false;
    f.detectChanges();
    f.detectChanges();
    expect(kerangka(f)).toBeNull();
    expect(f.nativeElement.querySelector('table').classList).not.toContain('akn-tabel-memuat');
  });

  it('memuat ulang daftar yang SUDAH berisi: tidak ada kerangka', () => {
    const f = TestBed.createComponent(Tuan);
    f.componentInstance.rows = [{ a: 1, b: 2 }];
    f.componentInstance.memuat = true;
    f.detectChanges();
    f.detectChanges();
    expect(kerangka(f)).toBeNull();
  });

  it('selesai memuat dan memang kosong: kerangka hilang, baris kosong kembali', () => {
    const f = buat();
    f.componentInstance.memuat = false;
    f.detectChanges();
    expect(kerangka(f)).toBeNull();
    expect(f.nativeElement.querySelector('.kosong')).not.toBeNull();
  });
});
