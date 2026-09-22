import { TestBed } from '@angular/core/testing';
import { KartuKerangkaComponent } from './kartu-kerangka/kartu-kerangka.component';
import { lembarBawah } from './gerak-lembar';

describe('gerak mobile', () => {
  it('kerangka menggambar sejumlah kartu yang diminta', () => {
    const f = TestBed.createComponent(KartuKerangkaComponent);
    f.componentInstance.jumlah = 3;
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.akn-m-kerangka__kartu').length).toBe(3);
  });

  it('lembar bawah punya gerak KELUAR (masuknya dari CSS)', () => {
    const defs = (lembarBawah as any).definitions;
    expect(defs.some((d: any) => d.expr === ':leave')).toBeTrue();
  });
});
