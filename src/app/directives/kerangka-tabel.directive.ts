import {
  Directive,
  DoCheck,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

/**
 * Kerangka berkilau (skeleton) pada tabel yang sedang memuat.
 *
 *   <table mat-table [dataSource]="rows" [appKerangka]="isLoading">
 *
 * Tampil HANYA bila tabelnya sedang memuat DAN belum punya baris data —
 * yaitu pemuatan pertama, atau pindah ke halaman/penyaring yang
 * mengosongkan daftarnya. Memuat ulang daftar yang sudah berisi tidak
 * menggantinya dengan kerangka: baris lama tetap terbaca sampai yang baru
 * tiba, dan bilah muat di atas kartu sudah memberi tahu ada yang berjalan.
 *
 * Kerangkanya `<tbody>` TERSENDIRI yang ditambahkan ke tabel, bukan baris
 * di dalam `<tbody>` milik CDK — CDK menyisipkan barisnya relatif terhadap
 * penandanya sendiri dan tidak menyentuh simpul lain. Karena berada di
 * tabel yang sama, lebar kolom kerangka mengikuti kepala tabelnya.
 *
 * Selama kerangka tampil, baris "tidak ada data" disembunyikan: tabel yang
 * sedang memuat belum tentu kosong, dan tulisan "Tidak ada data" yang
 * berkedip sebelum datanya tiba membuat orang mengira datanya hilang.
 */
@Directive({ selector: 'table[appKerangka]', standalone: true })
export class KerangkaTabelDirective implements DoCheck, OnDestroy {
  @Input('appKerangka') memuat: boolean | null | undefined = false;
  @Input() kerangkaBaris = 6;

  private tbody: HTMLElement | null = null;
  private kolom = 0;

  constructor(
    private el: ElementRef<HTMLTableElement>,
    private r: Renderer2,
  ) {}

  /*
   * DoCheck, bukan OnChanges: baris datanya bisa datang atau pergi TANPA
   * `memuat` berubah (mis. datanya tiba pada putaran yang sama dengan
   * `isLoading = false`). Pemeriksaannya murah — satu querySelector.
   */
  ngDoCheck(): void {
    const tabel = this.el.nativeElement;
    // Baris "tidak ada data" juga berkelas `mat-mdc-row`/`cdk-row` — ia
    // tidak dihitung sebagai data.
    const adaBaris = !!tabel.querySelector(
      'tbody:not(.akn-kerangka) tr.cdk-row:not(.cdk-no-data-row)',
    );
    const tampil = !!this.memuat && !adaBaris;
    if (tampil) {
      // Kepala tabel baru tergambar SESUDAH pemeriksaan pertama; kerangka
      // yang dibuat lebih dulu hanya berkolom satu. Dibangun ulang begitu
      // jumlah kolomnya diketahui.
      const kolom = this.jumlahKolom();
      if (this.tbody && this.kolom !== kolom) this.lepas();
      if (!this.tbody) this.pasang(kolom);
    } else if (this.tbody) this.lepas();
  }

  ngOnDestroy(): void {
    this.lepas();
  }

  private jumlahKolom(): number {
    const kepala = this.el.nativeElement.querySelector('thead tr, tr.mat-mdc-header-row');
    return Math.max(1, kepala?.children.length ?? 1);
  }

  private pasang(kolom: number): void {
    const tabel = this.el.nativeElement;
    this.kolom = kolom;
    const tb: HTMLElement = this.r.createElement('tbody');
    this.r.addClass(tb, 'akn-kerangka');
    this.r.setAttribute(tb, 'aria-hidden', 'true');
    for (let i = 0; i < this.kerangkaBaris; i++) {
      const tr = this.r.createElement('tr');
      this.r.addClass(tr, 'akn-kerangka__baris');
      for (let k = 0; k < kolom; k++) {
        const td = this.r.createElement('td');
        this.r.addClass(td, 'akn-kerangka__sel');
        const balok = this.r.createElement('span');
        this.r.addClass(balok, 'akn-kerangka__balok');
        // Lebar berselang-seling: kerangka yang semua baloknya sama panjang
        // terbaca sebagai garis-garis, bukan sebagai tabel yang sedang datang.
        const lebar = [72, 54, 88, 40, 64, 80][(i + k * 2) % 6];
        this.r.setStyle(balok, 'width', `${k === kolom - 1 && kolom > 2 ? 28 : lebar}%`);
        this.r.appendChild(td, balok);
        this.r.appendChild(tr, td);
      }
      this.r.appendChild(tb, tr);
    }
    // Tepat sesudah `<tbody>` milik CDK, sebelum `<tfoot>`-nya.
    const tbodyCdk = tabel.querySelector('tbody:not(.akn-kerangka)');
    if (tbodyCdk) this.r.insertBefore(tabel, tb, tbodyCdk.nextSibling);
    else this.r.appendChild(tabel, tb);
    this.r.addClass(tabel, 'akn-tabel-memuat');
    this.tbody = tb;
  }

  private lepas(): void {
    if (!this.tbody) return;
    this.tbody.remove();
    this.tbody = null;
    this.r.removeClass(this.el.nativeElement, 'akn-tabel-memuat');
  }
}
