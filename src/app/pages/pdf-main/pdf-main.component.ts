import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjslib from 'pdfjs-dist';
import { FileDropComponent } from './file-drop/file-drop.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { tanggalLokal } from '../../utils/tanggal';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { DragDropModule } from '@angular/cdk/drag-drop';

/*
 * Worker PDF disajikan SENDIRI, bukan dari CDN pihak ketiga.
 *
 * Sebelumnya berkas ini dimuat dari cdnjs.cloudflare.com. Itu berarti dua
 * hal: bila CDN-nya tidak dapat dijangkau — jaringan kantor memblokirnya,
 * atau layanannya sedang turun — halaman PDF berhenti bekerja tanpa
 * penjelasan; dan bila CDN-nya dibobol, kode asing berjalan di peramban
 * setiap orang yang membuka halaman ini.
 *
 * Berkasnya disalin ke `assets/` saat build lewat entri `assets` pada
 * angular.json, sehingga versinya selalu sama dengan paket yang terpasang —
 * jalur CDN sebelumnya menyebut 3.11.174 secara harfiah, dan akan salah
 * diam-diam begitu paketnya dinaikkan.
 *
 * Berakhiran `.mjs`, bukan `.js`. Sejak pdfjs 5, paketnya menjadi ESM murni
 * dan `pdf.worker.min.js` tidak ada lagi. Nama yang salah TIDAK menggagalkan
 * build: entri `assets` sekadar tidak menyalin apa pun, dan halaman PDF baru
 * gagal ketika seseorang membukanya.
 *
 * Berawalan GARIS MIRING. `'assets/pdf.worker.min.mjs'` tanpa garis miring
 * adalah "bare specifier" bagi ES module.
 *
 * Selama worker aslinya berhasil dimuat, bedanya tidak terasa: `new Worker()`
 * memakai aturan URL biasa, dan yang relatif diselesaikan terhadap
 * `<base href="/">`. Tetapi ketika pemuatan worker GAGAL — misalnya berkasnya
 * disajikan dengan tipe MIME yang keliru — pdfjs beralih ke "fake worker" dan
 * menjalankan `import(this.workerSrc)` (pdf.mjs:15672). Di situ aturannya
 * berbeda: penentu modul yang tidak diawali `/`, `./`, atau `../` harus
 * dipetakan lewat import map, dan tanpa itu peramban menolaknya:
 *
 *   Failed to resolve module specifier 'assets/pdf.worker.min.mjs'
 *
 * Galat itu tidak menyebut worker aslinya sama sekali, sehingga yang
 * membacanya mengira persoalannya pada berkas worker — padahal sebabnya ada
 * pada jawaban server satu langkah sebelumnya.
 */
// Menunjuk ke SHIM, bukan langsung ke worker aslinya: shim menambal
// `Promise.try` di dalam worker (pdf.js v5 memakainya) lalu memuat worker
// aslinya. Tanpa itu, unggah PDF melempar "Promise.try is not a function"
// di peramban lama.
/*
 * VERSI DITEMPELKAN PADA ALAMAT WORKER — dan itu bukan hiasan.
 *
 * `pdf-worker-shim.mjs` dan `pdf.worker.min.mjs` adalah dua-duanya berkas
 * TANPA hash pada namanya, sementara nginx menyajikan `/assets/` dengan
 * `expires 30d`. Akibatnya, sesudah pdfjs dinaikkan ke 6.3.289, peramban
 * yang sudah pernah membuka halaman PDF tetap memakai worker 5.6.205 dari
 * singgahannya sendiri — sampai tiga puluh hari:
 *
 *   The API version "6.3.289" does not match the Worker version "5.6.205".
 *
 * `Ctrl+Shift+R` pun kerap tidak menolongnya: worker-nya tidak dimuat
 * sebagai bagian halaman, melainkan lewat `import()` saat berjalan.
 *
 * Dengan versinya ikut pada alamat, naiknya paket otomatis mengubah
 * alamatnya — singgahan lama tidak pernah terpakai lagi, tanpa siapa pun
 * perlu membersihkan apa pun. Diambil dari `pdfjslib.version`, bukan
 * ditulis tangan: yang ditulis tangan akan tertinggal pada kenaikan
 * berikutnya, dan gejalanya persis sama.
 */
export const JALUR_WORKER_PDF = `/assets/pdf-worker-shim.mjs?v=${pdfjslib.version}`;

pdfjslib.GlobalWorkerOptions.workerSrc = JALUR_WORKER_PDF;

/**
 * Satu coretan pada halaman.
 *
 * Letaknya disimpan sebagai pecahan lebar dan tinggi halaman (0–1), bukan
 * piksel: ukuran pratinjau di layar berbeda dari ukuran halaman
 * sebenarnya, dan piksel yang benar di satu ukuran akan meleset di ukuran
 * lain.
 */
interface Anotasi {
  /**
   * `tutup` menutupi teks lama; `catatan` menambahkan tulisan di atasnya;
   * `ttd` menempelkan gambar tanda tangan.
   */
  jenis: 'tutup' | 'catatan' | 'ttd';
  /** Kiri, dari tepi kiri halaman (0–1). */
  x: number;
  /** Atas, dari tepi atas halaman (0–1). */
  y: number;
  /** Lebar kotak penutup (0–1); tidak dipakai pada catatan. */
  lebar?: number;
  /** Tinggi kotak penutup (0–1); tidak dipakai pada catatan. */
  tinggi?: number;
  /** Tulisan yang ditumpangkan; boleh kosong pada penutup polos. */
  teks?: string;
  /**
   * Gambar tanda tangan sebagai data-URI PNG.
   *
   * PNG, bukan JPEG: tanda tangan perlu LATAR TEMBUS PANDANG. JPEG tidak
   * punya kanal alfa, sehingga yang tertempel adalah kotak putih berisi
   * coretan — menutupi garis tanda tangan tercetak di bawahnya.
   */
  gambar?: string;
  /**
   * Isi penutup: warna polos, mosaik (`buram`), atau pola. Kosong berarti
   * `warna`. Untuk selain `warna`, isinya dibuat di dialog sunting sebagai
   * PNG dan disimpan pada `gambar`.
   */
  isi?: IsiTutup;
  /** Kepekatan 0–1; kosong = 1. */
  opasitas?: number;
  /**
   * Rupa huruf. Dipakai catatan DAN teks pengganti pada penutup; kosong =
   * `sans`.
   */
  fonta?: FontaCatatan;
  /**
   * Besar huruf (titik). Kosong pada catatan = 10; kosong pada penutup =
   * menyesuaikan tinggi kotaknya sendiri, seperti sebelum ukurannya dapat
   * dipilih.
   */
  ukuran?: number;
  /** Huruf tebal. */
  tebal?: boolean;
  /**
   * Warna teks pengganti pada penutup. Kosong = dihitung agar KONTRAS
   * terhadap warna penutupnya — perilaku sebelum warnanya dapat dipilih.
   *
   * Terpisah dari `warna`, yang pada penutup adalah warna ISIAN-nya.
   */
  warnaTeks?: string;
  /** Perataan teks pengganti pada penutup; kosong = kiri. */
  rata?: RataTeks;
  /**
   * Bentuk penutup. Kosong berarti `kotak` — supaya coretan yang sudah
   * terlanjur dibuat sebelum bentuk lain ada tetap tergambar seperti dulu.
   */
  bentuk?: BentukTutup;
  /**
   * Warna penutup, `#rrggbb`. Kosong berarti putih.
   *
   * Putih benar untuk menutupi teks di atas kertas putih, tetapi TIDAK
   * untuk menutupi sesuatu di atas kop berwarna atau di atas gambar —
   * di situ kotak putihnya justru lebih mencolok daripada yang ditutupi.
   */
  warna?: string;
}

/** Bentuk penutup yang tersedia. */
export type BentukTutup = 'kotak' | 'lingkaran' | 'segitiga';

/** Isi penutup yang tersedia. */
export type IsiTutup = 'warna' | 'garis' | 'silang' | 'titik' | 'buram';

/** Rupa huruf catatan. */
export type FontaCatatan = 'sans' | 'serif' | 'mono';

/** Perataan teks pengganti pada penutup. */
export type RataTeks = 'kiri' | 'tengah' | 'kanan';

interface PageData {
  pdf: string;
  thumbnail: string;
  pageNumber: number;
  fileName: string;
  originalFile?: string; // Track original file name
  selected?: boolean;

  /**
   * Coretan pada halaman: penutup teks dan catatan.
   *
   * Disimpan pada data, bukan langsung ditulis ke berkasnya, sehingga masih
   * dapat digeser atau dibatalkan sebelum disimpan.
   */
  anotasi?: Anotasi[];

  /**
   * Sudut putar halaman, kelipatan 90 derajat.
   *
   * Disimpan pada data, bukan langsung diterapkan ke berkasnya: memutar
   * berarti membaca dan menulis ulang seluruh PDF, dan pada dokumen puluhan
   * halaman itu terasa setiap kali tombolnya ditekan. Rotasi baru
   * benar-benar diterapkan saat berkasnya disimpan.
   */
  rotation?: number;
}

@Component({
  selector: 'app-pdf-main',
  templateUrl: './pdf-main.component.html',
  styleUrls: ['./pdf-main.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    CdkDragPreview,
    CdkDragPlaceholder,
    CommonModule,
    FileDropComponent,
    CdkDrag,
    CdkDropList,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
    MatSnackBarModule,
    DragDropModule,
  ],
})
export class PdfMainComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  /**
   * Pemberitahuan singkat, menggantikan `alert()`.
   *
   * `alert()` menghentikan seluruh halaman sampai ditutup, tampilannya
   * berbeda di tiap peramban, tidak mengikuti tema, dan judulnya ditempeli
   * nama domain. Untuk pesan yang hanya perlu dibaca sekilas — "pilih dulu
   * dua halaman" — menghentikan segalanya jelas berlebihan.
   *
   * Galat diberi waktu baca lebih lama daripada peringatan biasa.
   */
  private beritahu(kunci: string, galat = false): void {
    this.snackBar.open(this.translate.instant(kunci), 'Close', {
      duration: galat ? 6000 : 4000,
    });
  }

  processedDocuments: PageData[] = [];

  /*
   * Halaman terpilih dihitung di `updateSelectionState()`, bukan lewat getter.
   *
   * `selected` diubah per item (bukan dengan mengganti arraynya), sehingga
   * setter pada `processedDocuments` tidak akan menangkapnya. Titik
   * perubahannya sedikit dan jelas, jadi semuanya diarahkan memanggil satu
   * metode ini — bukan cache berkunci yang harus ditebak kapan basinya.
   */
  selectedPages: PageData[] = [];
  selectedCount = 0;
  isProcessing = false;
  /*
   * Kemajuan pemrosesan: berkas ke berapa dari berapa.
   *
   * Dipakai bilah kemajuan pada lapisan "Memproses berkas PDF". Tanpa angka
   * ini, lapisannya hanya berputar — dan yang mengunggah dua puluh berkas
   * tidak punya cara tahu apakah ia baru mulai atau hampir selesai.
   */
  prosesKe = 0;
  prosesTotal = 0;
  isDragging = false;
  processingProgress = '';

  selectionMode = true;
  allSelected = false;

  // Merge options
  mergeOptions = {
    addPageNumbers: false,
    pageNumberPosition: 'bottom',
    addTableOfContents: false,
    quality: 'standard',
  };

  constructor() {}

  ngOnInit(): void {}

  @ViewChild('fileInput') fileInput!: any;

  // Method to open file dialog
  openFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // Handle file selection from the FAB
  async onFilesSelected(event: any): Promise<void> {
    const files = event.target.files;
    if (files && files.length > 0) {
      await this.onFilesDropped(files);
      // Reset the input
      event.target.value = '';
    }
  }

  async onFilesDropped(files: FileList): Promise<void> {
    this.isProcessing = true;
    const daftar = Array.from(files).filter(
      (f) =>
        f.type === 'application/pdf' && f.name.toLowerCase().endsWith('.pdf'),
    );
    this.prosesTotal = daftar.length;
    this.prosesKe = 0;

    try {
      for (const file of daftar) {
        this.prosesKe++;
        this.processingProgress = file.name;
        await this.processPdfFile(file);
      }
    } catch (error) {
      console.error('Error processing PDFs:', error);
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
      this.prosesKe = 0;
      this.prosesTotal = 0;
    }
  }

  /** Persentase kemajuan; 0 berarti tidak diketahui (bilah bergerak sendiri). */
  get prosesPersen(): number {
    if (!this.prosesTotal) return 0;
    return Math.round((this.prosesKe / this.prosesTotal) * 100);
  }

  private async processPdfFile(file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer();

      // Parse ONCE per library (not once per page).
      // Load pdf-lib first (it reads its own copy synchronously), then give
      // pdf.js a fresh copy so its worker transfer can't neuter pdf-lib's data.
      const libDoc = await PDFDocument.load(buffer);
      const pdfjsDoc = await pdfjslib.getDocument({
        data: new Uint8Array(buffer.slice(0)),
      }).promise;

      const pageCount = pdfjsDoc.numPages;

      for (let i = 0; i < pageCount; i++) {
        // 1) thumbnail — rendered from the ALREADY-OPEN pdf.js document
        let thumbnail: string;
        try {
          thumbnail = await this.renderThumbnail(pdfjsDoc, i + 1);
        } catch (e) {
          console.error(`Thumbnail failed for page ${i + 1}:`, e);
          thumbnail = this.createFallbackThumbnail(i + 1);
        }

        // 2) per-page PDF bytes — still needed for merge / reorder / save,
        //    but produced from the single pdf-lib doc we already loaded.
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(libDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        const pdfBase64 = await singlePagePdf.saveAsBase64({ dataUri: false });

        // 3) push immediately so pages appear progressively as they finish
        this.processedDocuments.push({
          pdf: pdfBase64,
          thumbnail,
          pageNumber: i + 1,
          fileName: this.generatePageFileName(file.name, i + 1),
          originalFile: file.name,
        } as PageData);
        this.updateSelectionState();

        // Let the UI breathe every few pages (a micro-yield, not a 100ms wall)
        if ((i & 3) === 3) {
          await this.delay(0);
        }
      }

      // Release pdf.js resources
      try {
        await (pdfjsDoc as any).cleanup?.();
        await (pdfjsDoc as any).destroy?.();
      } catch {}
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      throw error;
    }
  }

  /** Render a single page of an already-loaded pdf.js document to a JPEG data URL. */
  private async renderThumbnail(
    pdfjsDoc: any,
    pageNum: number,
  ): Promise<string> {
    const page = await pdfjsDoc.getPage(pageNum);
    try {
      const scale = 0.4; // slightly sharper than the old 0.2 — still cheap now
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.7);
    } finally {
      (page as any).cleanup?.();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generatePageFileName(
    originalName: string,
    pageNumber: number,
  ): string {
    const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
    return `${nameWithoutExt}_page_${pageNumber}.pdf`;
  }

  private createFallbackThumbnail(pageNumber: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 200;
    canvas.height = 280;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    // PDF icon
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(30, 40, canvas.width - 60, 80);

    // Document lines
    ctx.fillStyle = 'white';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(40, 55 + i * 20, canvas.width - 80, 10);
    }

    // Text
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PDF Preview', canvas.width / 2, canvas.height - 60);

    ctx.font = '12px Arial';
    ctx.fillText(`Page ${pageNumber}`, canvas.width / 2, canvas.height - 40);

    ctx.fillStyle = '#dc3545';
    ctx.fillRect(canvas.width / 2 - 25, canvas.height - 25, 50, 20);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('PDF', canvas.width / 2, canvas.height - 12);

    return canvas.toDataURL('image/png');
  }

  getShortFileName(fullName: string): string {
    if (fullName.length > 20) {
      return fullName.substring(0, 17) + '...';
    }
    return fullName;
  }

  getFileOrigin(fileName: string): string {
    // Extract original file name from page file name
    const match = fileName.match(/(.*)_page_\d+\.pdf$/);
    return match ? match[1] : fileName;
  }

  // ENHANCED DRAG & DROP
  onFileDropped(event: CdkDragDrop<PageData[]>): void {
    this.isDragging = false;
    moveItemInArray(
      this.processedDocuments,
      event.previousIndex,
      event.currentIndex,
    );
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    this.isDragging = false;
  }

  moveFileUp(index: number): void {
    if (index > 0) {
      const temp = this.processedDocuments[index];
      this.processedDocuments[index] = this.processedDocuments[index - 1];
      this.processedDocuments[index - 1] = temp;

      // Add animation class
      this.animateMovement(index, index - 1);
      this.updateSelectionState();
    }
  }

  moveFileDown(index: number): void {
    if (index < this.processedDocuments.length - 1) {
      const temp = this.processedDocuments[index];
      this.processedDocuments[index] = this.processedDocuments[index + 1];
      this.processedDocuments[index + 1] = temp;

      // Add animation class
      this.animateMovement(index, index + 1);
      this.updateSelectionState();
    }
  }

  private animateMovement(fromIndex: number, toIndex: number): void {
    // This will be handled by CSS transitions
    // You can add specific animation logic here if needed
  }

  reverseOrder(): void {
    this.processedDocuments.reverse();
    this.updateSelectionState();
  }

  shuffleOrder(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.processedDocuments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.processedDocuments[i], this.processedDocuments[j]] = [
        this.processedDocuments[j],
        this.processedDocuments[i],
      ];
    }
    this.updateSelectionState();
  }

  async mergePdfs(): Promise<void> {
    if (this.processedDocuments.length < 2) {
      this.beritahu('pdf.needTwoDocs');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = '';
    this.prosesKe = 0;
    this.prosesTotal = 0;

    try {
      const mergedPdf = await PDFDocument.create();
      // Font disematkan SEKALI untuk seluruh halaman; berulang kali hanya
      // membuat berkas hasilnya membesar tanpa guna.
      const font = await this.sediakanFonta(
        mergedPdf,
        this.processedDocuments,
      );
      const gambar = await this.sematkanGambar(
        mergedPdf,
        this.processedDocuments,
      );

      for (const pageData of this.processedDocuments) {
        try {
          await this.salinHalaman(mergedPdf, pageData, font, gambar);
        } catch (pageError) {
          console.error(
            `Error processing page ${pageData.fileName}:`,
            pageError,
          );
          // Continue with other pages even if one fails
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const compatibleBytes = new Uint8Array(mergedPdfBytes);
      const blob = new Blob([compatibleBytes], { type: 'application/pdf' });

      this.downloadMergedPdf(blob);

      this.showSuccessMessage(
        `Successfully merged ${this.processedDocuments.length} pages!`,
      );
    } catch (error) {
      console.error('Error merging PDFs:', error);
      this.beritahu('pdf.mergeFailed', true);
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
    }
  }

  private downloadMergedPdf(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.generateFileName('merge');
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      // Exit selection mode - clear all selections
      this.clearAllSelections();
    }
  }

  togglePageSelection(page: PageData, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    page.selected = !page.selected;
    this.updateSelectionState();
  }

  toggleSelectAll(): void {
    const target = !this.allSelected;
    this.processedDocuments.forEach((page) => {
      page.selected = target;
    });
    this.updateSelectionState();
  }

  clearAllSelections(): void {
    this.processedDocuments.forEach((page) => {
      page.selected = false;
    });
    this.updateSelectionState();
  }

  private updateSelectionState(): void {
    this.selectedPages = this.processedDocuments.filter((page) => page.selected);
    this.selectedCount = this.selectedPages.length;
    // Tanpa halaman sama sekali, "semua terpilih" tidak punya arti — 0 === 0
    // membuat sakelar pilih-semua menyala pada daftar kosong.
    this.allSelected =
      this.processedDocuments.length > 0 &&
      this.selectedCount === this.processedDocuments.length;
  }

  /**
   * Buka halaman ini pada dialog sunting.
   *
   * MENYUNTING TIDAK LAGI DILAKUKAN DI ATAS THUMBNAIL.
   *
   * Dulu alat "Tutup teks"/"Catatan" menaruh coretan langsung di pratinjau
   * setinggi ~150px, dan tulisannya diketik pada kotak isian sekecil itu
   * juga. Akibatnya dua hal yang dua-duanya tidak menghasilkan galat: yang
   * diketik tidak terbaca, dan letak coretannya meleset karena satu piksel
   * di pratinjau sama dengan enam piksel di halaman sebenarnya.
   *
   * Dialognya menggambar ulang halaman pada ukuran penuh lewat pdf.js,
   * sehingga yang ditaruh terlihat persis di tempatnya.
   *
   * Dimuat LAMBAT (`import()` di dalam fungsi): dialog ini membawa serta
   * pdf.js, dan yang hanya menggabung berkas tidak perlu ikut mengunduhnya.
   */
  async bukaSunting(page: PageData, ev?: Event): Promise<void> {
    ev?.stopPropagation();

    const { SuntingHalamanComponent } = await import(
      './sunting-halaman/sunting-halaman.component'
    );

    const hasil = await firstValueFrom(
      this.dialog
        .open(SuntingHalamanComponent, {
          data: {
            pdf: page.pdf,
            nomor: this.processedDocuments.indexOf(page) + 1,
            fileName: page.fileName,
            rotation: page.rotation || 0,
            anotasi: page.anotasi || [],
          },
          maxWidth: '96vw',
          autoFocus: false,
        })
        .afterClosed(),
    );

    // `undefined` berarti DIBATALKAN — bukan "tidak ada coretan". Menyamakan
    // keduanya membuat tombol Batal menghapus seluruh coretan yang sudah ada.
    if (!hasil) return;
    page.anotasi = hasil;
  }

  /**
   * Salin satu halaman ke dokumen tujuan — BERIKUT rotasi dan coretannya.
   *
   * SATU JALUR UNTUK SELURUH TOMBOL YANG MENGHASILKAN BERKAS.
   *
   * Sebelumnya tiap tombol menyalin halamannya sendiri-sendiri, dan hanya
   * "Simpan halaman terpilih" yang ikut menggambar coretan serta menerapkan
   * rotasi. Tombol "Gabungkan" tidak. Akibatnya: catatan yang baru saja
   * diketik HILANG tanpa jejak pada berkas yang terunduh — tanpa galat,
   * tanpa peringatan, dan hanya pada sebagian tombol. Yang mengalaminya
   * menyimpulkan catatannya tidak pernah tersimpan.
   *
   * Karena itu penyalinannya dikumpulkan di sini. Menambah tombol keempat
   * kelak berarti memanggil fungsi ini, bukan menyalin sepuluh baris yang
   * harus diingat untuk ikut diperbaiki.
   */
  /**
   * Sematkan SELURUH gambar tanda tangan yang dipakai, satu kali saja.
   *
   * Satu tanda tangan kerap dibubuhkan pada banyak halaman. Menyematkannya
   * per halaman menyalin bita PNG-nya sebanyak itu pula — pada berkas dua
   * puluh halaman, ukurannya membengkak tanpa satu piksel pun bertambah.
   *
   * Berkunci data-URI-nya: dua tanda tangan yang isinya persis sama hanya
   * disematkan sekali.
   *
   * Gambar yang gagal disematkan DILEWATI, bukan menjatuhkan seluruh
   * penyimpanan: satu coretan rusak tidak boleh membuat dua puluh halaman
   * lain ikut gagal terbit.
   */
  private async sematkanGambar(
    tujuan: PDFDocument,
    halaman: PageData[],
  ): Promise<Map<string, any>> {
    const peta = new Map<string, any>();
    const alamat = new Set<string>();
    for (const h of halaman) {
      for (const a of h.anotasi || []) {
        // Bukan hanya tanda tangan: penutup buram dan berpola juga
        // dibawa sebagai gambar.
        if (a.gambar) alamat.add(a.gambar);
      }
    }
    for (const src of alamat) {
      try {
        peta.set(src, await tujuan.embedPng(src));
      } catch (e) {
        console.error('Tanda tangan gagal disematkan:', e);
      }
    }
    return peta;
  }

  /** Rupa huruf catatan → salah satu dari empat belas font baku PDF. */
  private static readonly FONTA_PDF: Record<string, StandardFonts> = {
    sans: StandardFonts.Helvetica,
    'sans-tebal': StandardFonts.HelveticaBold,
    serif: StandardFonts.TimesRoman,
    'serif-tebal': StandardFonts.TimesRomanBold,
    mono: StandardFonts.Courier,
    'mono-tebal': StandardFonts.CourierBold,
  };

  static kunciFonta(fonta?: FontaCatatan, tebal?: boolean): string {
    const f = fonta === 'serif' || fonta === 'mono' ? fonta : 'sans';
    return tebal ? `${f}-tebal` : f;
  }

  /**
   * Sematkan HANYA rupa huruf yang benar-benar terpakai.
   *
   * Keenamnya termasuk empat belas font baku PDF, jadi tidak ada bita
   * huruf yang ikut disalin — tetapi tiap satunya tetap menambah objek ke
   * berkasnya, dan menyematkan yang tidak dipakai tidak ada gunanya.
   */
  private async sediakanFonta(
    tujuan: PDFDocument,
    halaman: PageData[],
  ): Promise<Map<string, any>> {
    // `sans` selalu ada: ia juga dipakai teks pengganti pada penutup.
    const perlu = new Set<string>(['sans']);
    for (const h of halaman) {
      for (const a of h.anotasi || []) {
        // Teks pengganti pada PENUTUP kini punya rupa hurufnya sendiri —
        // bukan hanya catatan. Melewatkannya di sini membuat `font.get()`
        // mengembalikan undefined saat menggambar, dan seluruh tulisannya
        // jatuh kembali ke `sans` tanpa ada yang tahu.
        if (a.teks && (a.jenis === 'catatan' || a.jenis === 'tutup')) {
          perlu.add(PdfMainComponent.kunciFonta(a.fonta, a.tebal));
        }
      }
    }
    const peta = new Map<string, any>();
    for (const k of perlu) {
      peta.set(k, await tujuan.embedFont(PdfMainComponent.FONTA_PDF[k]));
    }
    return peta;
  }

  private async salinHalaman(
    tujuan: PDFDocument,
    pageData: PageData,
    font: Map<string, any>,
    /*
     * Gambar tanda tangan yang SUDAH disematkan, berkunci data-URI-nya.
     *
     * Satu tanda tangan kerap dipakai pada banyak halaman. Menyematkannya
     * ulang tiap halaman menyalin bita PNG-nya sebanyak itu juga — pada
     * berkas dua puluh halaman, ukurannya membengkak tanpa satu piksel pun
     * bertambah.
     */
    gambarTersemat?: Map<string, any>,
  ): Promise<void> {
    const pdfBytes = Uint8Array.from(atob(pageData.pdf), (c) =>
      c.charCodeAt(0),
    );
    const pagePdf = await PDFDocument.load(pdfBytes);
    const [copiedPage] = await tujuan.copyPages(pagePdf, [0]);

    /*
     * SUDUT YANG DIPAKAI MEMETAKAN CORETAN = SUDUT BAWAAN BERKAS + SUDUT
     * YANG DIPILIH PENGGUNA. Bukan yang dipilih pengguna saja.
     *
     * Inilah sebab "Tutup teks kelihatan tidak bekerja" pada dokumen hasil
     * SCAN. Banyak pemindai menulis `/Rotate 90` ke dalam berkasnya, dan
     * pdf.js — yang menggambar pratinjaunya — menghormati sudut itu. Jadi
     * yang dilihat pengguna sudah berputar, sementara koordinat pdf-lib
     * mengacu pada halaman dalam keadaan ASLI.
     *
     * Dulu hanya `pageData.rotation` yang diperhitungkan, sehingga pada
     * scan ber-`/Rotate` — tanpa pengguna memutar apa pun — pemetaannya
     * dianggap nol. Kotak penutupnya tetap tergambar, hanya di sisi yang
     * sama sekali lain: kerap di luar bagian halaman yang terlihat, dan
     * yang menaruhnya menyimpulkan alatnya tidak bekerja.
     */
    const asal = copiedPage.getRotation().angle ?? 0;
    const putar = pageData.rotation ?? 0;
    const efektif = (((asal + putar) % 360) + 360) % 360;

    // Rotasi DITAMBAHKAN pada sudut bawaan berkasnya, bukan menggantikannya:
    // menimpanya membuat halaman yang tadinya benar jadi ikut miring.
    if (putar) {
      copiedPage.setRotation(degrees(efektif));
    }

    for (const a of pageData.anotasi || []) {
      this.gambarAnotasi(
        copiedPage,
        a,
        efektif,
        font,
        a.gambar ? gambarTersemat?.get(a.gambar) : undefined,
      );
    }

    tujuan.addPage(copiedPage);
  }

  /**
   * Letak & ukuran coretan pada koordinat PDF.
   *
   * DIPISAH DARI PENGGAMBARANNYA supaya dapat diuji tanpa membuat PDF
   * sama sekali — hitungannya yang rumit, bukan pemanggilan pdf-lib-nya.
   *
   * Tiga hal bertemu di sini, dan tiap satunya pernah salah sendiri:
   *
   *   1. SUMBU Y TERBALIK. Layar menghitung dari kiri-ATAS, PDF dari
   *      kiri-BAWAH.
   *
   *   2. HALAMAN YANG BERPUTAR. Pengguna menaruh coretan di atas pratinjau
   *      yang sudah berputar; koordinat pdf-lib mengacu pada halaman dalam
   *      keadaan ASLI.
   *
   *   3. SISI YANG IKUT BERTUKAR. Pada 90° dan 270°, lebar tampilan adalah
   *      TINGGI halaman aslinya. Memakai `lebar * W` di situ menghasilkan
   *      kotak yang ukurannya melar atau menciut — dan pada halaman A4
   *      bedanya hampir satu setengah kali.
   *
   * `putar` adalah sudut EFEKTIF: bawaan berkas ditambah pilihan pengguna.
   */
  static petaAnotasi(
    a: { x: number; y: number; lebar?: number; tinggi?: number },
    W: number,
    H: number,
    putar: number,
  ): { x: number; y: number; width: number; height: number } {
    const r = (((putar % 360) + 360) % 360);
    const x = a.x;
    const y = a.y;
    const lw = a.lebar ?? 0;
    const lh = a.tinggi ?? 0;

    // Pecahan pada ruang HALAMAN ASLI: sudut kiri-atas, lalu lebar & tinggi.
    let fx: number, fy: number, fw: number, fh: number;
    switch (r) {
      case 90:
        fx = y;
        fy = 1 - x - lw;
        fw = lh;
        fh = lw;
        break;
      case 180:
        fx = 1 - x - lw;
        fy = 1 - y - lh;
        fw = lw;
        fh = lh;
        break;
      case 270:
        fx = 1 - y - lh;
        fy = x;
        fw = lh;
        fh = lw;
        break;
      default:
        fx = x;
        fy = y;
        fw = lw;
        fh = lh;
    }

    const width = fw * W;
    const height = fh * H;
    return {
      x: fx * W,
      // Sumbu Y dibalik, lalu dikurangi tingginya: pada PDF titik acuan
      // persegi adalah sudut kiri-BAWAH.
      y: H - fy * H - height,
      width,
      height,
    };
  }

  /**
   * Warna `#rrggbb` menjadi warna pdf-lib. Kosong atau tidak terbaca =
   * PUTIH — bentuk lama yang tidak menyimpan warna tetap tergambar putih
   * persis seperti sebelum warnanya dapat dipilih.
   */
  static keRgb(hex?: string): { r: number; g: number; b: number } {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return { r: 1, g: 1, b: 1 };
    const n = parseInt(m[1], 16);
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
    };
  }

  /**
   * Kepekatan 0–1. Di luar jangkauan itu dijepit, bukan dibiarkan: pdf-lib
   * menolak nilai di luar 0–1 dengan galat, dan satu coretan bernilai aneh
   * akan menjatuhkan seluruh unduhan.
   */
  static keOpasitas(n?: number): number {
    if (typeof n !== 'number' || !isFinite(n)) return 1;
    return Math.min(1, Math.max(0, n));
  }

  /**
   * Geser mendatar teks di dalam kotak selebar `lebar`, menurut perataannya.
   *
   * Dihitung dari LEBAR TULISANNYA yang sebenarnya (`widthOfTextAtSize`),
   * bukan dari perkiraan jumlah huruf: huruf proporsional membuat "IIII"
   * dan "WWWW" berbeda jauh, dan tengah yang diperkirakan akan meleset
   * justru pada tulisan pendek — yang paling sering dipakai pada penutup.
   *
   * Tidak pernah kurang dari sisipannya: tulisan yang lebih lebar daripada
   * kotaknya tetap mulai dari tepi kiri, bukan menjorok keluar ke kiri.
   */
  static geserRata(
    rata: RataTeks | undefined,
    lebar: number,
    lebarTeks: number,
    sisip: number,
  ): number {
    if (rata === 'tengah') return Math.max(sisip, (lebar - lebarTeks) / 2);
    if (rata === 'kanan') return Math.max(sisip, lebar - lebarTeks - sisip);
    return sisip;
  }

  /** Besar huruf catatan, dijepit ke jangkauan yang masuk akal. */
  static ukuranCatatan(n?: number): number {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return 10;
    return Math.min(96, Math.max(4, n));
  }

  /**
   * Warna catatan. Kosong = merah, seperti sebelum warnanya dapat dipilih —
   * catatan lama tidak boleh berubah warna diam-diam.
   */
  static warnaCatatan(hex?: string): { r: number; g: number; b: number } {
    if (!/^#?[0-9a-f]{6}$/i.test((hex || '').trim())) {
      return { r: 0.72, g: 0.11, b: 0.11 };
    }
    return PdfMainComponent.keRgb(hex);
  }

  /**
   * Hitam atau putih — mana pun yang TERBACA di atas `hex`.
   *
   * Teks pengganti selalu digambar hitam sebelumnya. Itu benar selama
   * penutupnya putih; di atas penutup biru tua, tulisannya lenyap.
   *
   * Ambangnya memakai luminansi berbobot (mata jauh lebih peka pada hijau
   * daripada biru), bukan rata-rata ketiga kanal.
   */
  static teksKontras(hex?: string): { r: number; g: number; b: number } {
    const c = PdfMainComponent.keRgb(hex);
    const terang = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    return terang > 0.55 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
  }

  /**
   * Tiga titik segitiga penutup, pada koordinat PDF halaman ASLI.
   *
   * Puncaknya menghadap ATAS SEBAGAIMANA TERLIHAT — bukan atas pada
   * halaman aslinya. Pada scan ber-`/Rotate 90`, "atas layar" adalah sisi
   * kiri halaman aslinya; segitiga yang tidak memperhitungkan itu tampil
   * rebah menyamping.
   *
   * Titiknya dihitung langsung, bukan lewat pemutaran pdf-lib: segitiga
   * tidak punya "kotak sebelum diputar" yang masuk akal, dan menghitung
   * jangkarnya jauh lebih mudah salah daripada menyebut ketiga sudutnya.
   */
  static titikSegitiga(
    k: { x: number; y: number; width: number; height: number },
    putar: number,
  ): [number, number][] {
    const r = (((putar % 360) + 360) % 360);
    const { x, y, width: w, height: h } = k;
    switch (r) {
      case 90:
        // "Atas layar" = sisi kiri halaman asli.
        return [
          [x, y + h / 2],
          [x + w, y + h],
          [x + w, y],
        ];
      case 180:
        return [
          [x + w / 2, y],
          [x, y + h],
          [x + w, y + h],
        ];
      case 270:
        return [
          [x + w, y + h / 2],
          [x, y],
          [x, y + h],
        ];
      default:
        return [
          [x + w / 2, y + h],
          [x, y],
          [x + w, y],
        ];
    }
  }

  /**
   * Jangkar & sudut gambar untuk kotak `k` pada halaman ber-`/Rotate`.
   *
   * `petaAnotasi` sudah menaruh KOTAKNYA di tempat yang benar, tetapi ISI
   * kotaknya — tulisan, tanda tangan — digambar pada ruang halaman ASLI.
   * Pada halaman yang diputar, isi yang tegak di ruang itu tampil REBAH di
   * layar: tanda tangan yang dibubuhkan di atas garis tanda tangan justru
   * terbaca dari samping, dan pada 90°/270° ia juga tergencet karena sisi
   * kotaknya bertukar.
   *
   * Jadi isinya ikut diputar sebesar sudut halamannya (pdf-lib memutar
   * BERLAWANAN arah jarum jam, PDF menampilkan SEARAH — keduanya saling
   * meniadakan, hasilnya tegak). Karena pdf-lib memutar terhadap titik
   * `(x, y)`, titik itu pindah ke sudut kotak yang lain, dan lebar-tinggi
   * yang dikirim adalah ukuran SEBELUM diputar.
   */
  static jangkarPutar(
    k: { x: number; y: number; width: number; height: number },
    putar: number,
  ): { x: number; y: number; width: number; height: number; sudut: number } {
    const r = (((putar % 360) + 360) % 360);
    switch (r) {
      case 90:
        return {
          x: k.x + k.width,
          y: k.y,
          width: k.height,
          height: k.width,
          sudut: 90,
        };
      case 180:
        return {
          x: k.x + k.width,
          y: k.y + k.height,
          width: k.width,
          height: k.height,
          sudut: 180,
        };
      case 270:
        return {
          x: k.x,
          y: k.y + k.height,
          width: k.height,
          height: k.width,
          sudut: 270,
        };
      default:
        return { x: k.x, y: k.y, width: k.width, height: k.height, sudut: 0 };
    }
  }

  /**
   * Geser sebesar `(dx, dy)` PADA KERANGKA YANG SUDAH DIPUTAR.
   *
   * Sisipan tiga titik dari tepi kiri-bawah kotak harus tetap tiga titik
   * dari tepi kiri-bawah SEBAGAIMANA TERLIHAT; ditambahkan mentah-mentah,
   * pada halaman terbalik ia justru mendorong tulisan keluar kotaknya.
   */
  static geserPutar(
    dx: number,
    dy: number,
    putar: number,
  ): { dx: number; dy: number } {
    const r = (((putar % 360) + 360) % 360);
    switch (r) {
      case 90:
        return { dx: -dy, dy: dx };
      case 180:
        return { dx: -dx, dy: -dy };
      case 270:
        return { dx: dy, dy: -dx };
      default:
        return { dx, dy };
    }
  }

  /**
   * Gambar satu coretan pada halaman PDF.
   *
   * Hitungan letaknya ada di `petaAnotasi`; di sini tinggal menggambar.
   */
  private gambarAnotasi(
    page: any,
    a: Anotasi,
    putar: number,
    font: Map<string, any>,
    gambar?: any,
  ): void {
    const { width: W, height: H } = page.getSize();

    if (a.jenis === 'ttd') {
      // Tanpa gambarnya tidak ada yang dapat digambar — dan menggambar
      // kotak kosong sebagai gantinya justru menutupi isi halaman.
      if (!gambar) return;
      const k = PdfMainComponent.petaAnotasi(
        { ...a, lebar: a.lebar ?? 0.22, tinggi: a.tinggi ?? 0.06 },
        W,
        H,
        putar,
      );
      const j = PdfMainComponent.jangkarPutar(k, putar);
      page.drawImage(gambar, {
        x: j.x,
        y: j.y,
        width: j.width,
        height: j.height,
        rotate: degrees(j.sudut),
      });
      return;
    }

    if (a.jenis === 'tutup') {
      const k = PdfMainComponent.petaAnotasi(
        { ...a, lebar: a.lebar ?? 0.24, tinggi: a.tinggi ?? 0.024 },
        W,
        H,
        putar,
      );
      const c = PdfMainComponent.keRgb(a.warna);
      const isi = rgb(c.r, c.g, c.b);
      const tembus = PdfMainComponent.keOpasitas(a.opasitas);

      // Buram & pola datang sebagai GAMBAR yang sudah terpotong mengikuti
      // bentuknya; kalau gambarnya gagal disematkan, jatuh ke warna polos —
      // yang tetap menutupi. Membiarkannya kosong justru membuat yang
      // hendak ditutup tetap terbaca.
      if (a.gambar && gambar) {
        const jg = PdfMainComponent.jangkarPutar(k, putar);
        page.drawImage(gambar, {
          x: jg.x,
          y: jg.y,
          width: jg.width,
          height: jg.height,
          rotate: degrees(jg.sudut),
          opacity: tembus,
        });
      } else if (a.bentuk === 'lingkaran') {
        // Elips tidak perlu diputar: memutar elips terhadap PUSATNYA hanya
        // menukar kedua sumbunya, dan `petaAnotasi` sudah menukarnya.
        page.drawEllipse({
          x: k.x + k.width / 2,
          y: k.y + k.height / 2,
          xScale: k.width / 2,
          yScale: k.height / 2,
          color: isi,
          opacity: tembus,
        });
      } else if (a.bentuk === 'segitiga') {
        const t = PdfMainComponent.titikSegitiga(k, putar);
        // `drawSvgPath` memakai sumbu Y KE BAWAH dari titik asalnya, jadi
        // asalnya ditaruh di kiri-ATAS halaman dan ordinatnya dibalik.
        const jalur =
          `M ${t[0][0]} ${H - t[0][1]} ` +
          `L ${t[1][0]} ${H - t[1][1]} ` +
          `L ${t[2][0]} ${H - t[2][1]} Z`;
        page.drawSvgPath(jalur, { x: 0, y: H, color: isi, opacity: tembus });
      } else {
        page.drawRectangle({
          x: k.x,
          y: k.y,
          width: k.width,
          height: k.height,
          color: isi,
          opacity: tembus,
        });
      }

      if (a.teks) {
        const j = PdfMainComponent.jangkarPutar(k, putar);
        const f =
          font.get(PdfMainComponent.kunciFonta(a.fonta, a.tebal)) ??
          font.get('sans');

        // Tanpa ukuran, menyesuaikan tinggi kotaknya — persis seperti
        // sebelum ukurannya dapat dipilih. `j.height` adalah tinggi kotak
        // SEBAGAIMANA TERLIHAT; pada 90° dan 270° itu `k.width`.
        const ukuran =
          a.ukuran && a.ukuran > 0
            ? PdfMainComponent.ukuranCatatan(a.ukuran)
            : Math.min(11, j.height * 0.75);

        // Tanpa warna sendiri, dihitung agar kontras terhadap penutupnya.
        const tk = a.warnaTeks
          ? PdfMainComponent.keRgb(a.warnaTeks)
          : PdfMainComponent.teksKontras(a.warna);

        const lebarTeks = f?.widthOfTextAtSize
          ? f.widthOfTextAtSize(a.teks, ukuran)
          : 0;
        const dx = PdfMainComponent.geserRata(
          a.rata,
          j.width,
          lebarTeks,
          2,
        );
        const g = PdfMainComponent.geserPutar(dx, 3, putar);

        page.drawText(a.teks, {
          x: j.x + g.dx,
          y: j.y + g.dy,
          size: ukuran,
          font: f,
          color: rgb(tk.r, tk.g, tk.b),
          rotate: degrees(j.sudut),
        });
      }
      return;
    }

    // Catatan: tulisan saja, tanpa menutupi apa pun di bawahnya.
    if (!a.teks) return;
    const t = PdfMainComponent.petaAnotasi(a, W, H, putar);
    const jt = PdfMainComponent.jangkarPutar(t, putar);
    const wc = PdfMainComponent.warnaCatatan(a.warna);
    page.drawText(a.teks, {
      x: jt.x,
      // `t.y` adalah tepi BAWAH kotak setinggi nol, jadi ia sekaligus garis
      // dasar tulisannya.
      y: jt.y,
      size: PdfMainComponent.ukuranCatatan(a.ukuran),
      // Rupa huruf yang tidak tersemat (mestinya tidak terjadi — `sediakanFonta`
      // memindai coretannya lebih dulu) jatuh ke `sans`, bukan menjatuhkan
      // seluruh unduhan.
      font:
        font.get(PdfMainComponent.kunciFonta(a.fonta, a.tebal)) ??
        font.get('sans'),
      color: rgb(wc.r, wc.g, wc.b),
      rotate: degrees(jt.sudut),
    });
  }

  hapusAnotasi(page: PageData, i: number): void {
    page.anotasi?.splice(i, 1);
  }

  /** Ada coretan yang belum tersimpan pada berkas mana pun. */
  get adaAnotasi(): boolean {
    return this.processedDocuments.some((p) => (p.anotasi?.length ?? 0) > 0);
  }

  /**
   * Putar satu halaman 90 derajat searah jarum jam.
   *
   * Dokumen dari luar — scan tagihan vendor, faktur pajak, surat jalan —
   * kerap masuk dalam keadaan terbaring atau terbalik. Tanpa ini, satu
   * halaman miring memaksa seluruh berkas diproses ulang di aplikasi lain.
   */
  putarHalaman(page: PageData, arah: 1 | -1 = 1): void {
    const sekarang = page.rotation ?? 0;
    // Dijaga pada 0/90/180/270: nilai negatif atau di atas 360 membingungkan
    // saat dibaca, dan pdf-lib menolaknya.
    page.rotation = (((sekarang + arah * 90) % 360) + 360) % 360;
  }

  /** Putar seluruh halaman yang sedang terpilih. */
  putarTerpilih(arah: 1 | -1 = 1): void {
    const terpilih = this.processedDocuments.filter((p) => p.selected);
    const sasaran = terpilih.length ? terpilih : this.processedDocuments;
    sasaran.forEach((p) => this.putarHalaman(p, arah));
  }

  /** Ada halaman yang sudah diputar dan belum disimpan. */
  get adaRotasi(): boolean {
    return this.processedDocuments.some((p) => (p.rotation ?? 0) !== 0);
  }

  async saveSelectedPages(): Promise<void> {
    const selectedPages = this.selectedPages;

    if (selectedPages.length === 0) {
      this.beritahu('pdf.needOnePage');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 'Creating PDF from selected pages...';

    try {
      const newPdf = await PDFDocument.create();

      // Font disiapkan sekali untuk seluruh halaman: menyematkannya
      // berulang membuat berkas hasilnya membesar tanpa guna.
      const font = await this.sediakanFonta(newPdf, selectedPages);
      const gambar = await this.sematkanGambar(newPdf, selectedPages);

      for (const pageData of selectedPages) {
        await this.salinHalaman(newPdf, pageData, font, gambar);
      }

      const mergedPdfBytes = await newPdf.save();

      // FIX: Create a new Uint8Array to ensure compatibility
      const compatibleBytes = new Uint8Array(mergedPdfBytes);
      const blob = new Blob([compatibleBytes], { type: 'application/pdf' });
      this.downloadPdf(blob, 'selected-pages');

      // Optional: Show success message
      this.showSuccessMessage(
        `Successfully created PDF with ${selectedPages.length} selected pages!`,
      );
    } catch (error) {
      console.error('Error creating PDF from selected pages:', error);
      this.beritahu('pdf.createFailed', true);
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
    }
  }

  async mergeSelectedPdfs(): Promise<void> {
    const selectedPages = this.selectedPages;

    if (selectedPages.length < 2) {
      this.beritahu('pdf.needTwoPages');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 'Merging selected pages...';

    try {
      const mergedPdf = await PDFDocument.create();
      const font = await this.sediakanFonta(mergedPdf, selectedPages);
      const gambar = await this.sematkanGambar(mergedPdf, selectedPages);

      for (const pageData of selectedPages) {
        await this.salinHalaman(mergedPdf, pageData, font, gambar);
      }

      const mergedPdfBytes = await mergedPdf.save();
      const compatibleBytes = new Uint8Array(mergedPdfBytes);
      const blob = new Blob([compatibleBytes], { type: 'application/pdf' });
      this.downloadPdf(blob, 'selected-pages');

      this.showSuccessMessage(
        `Successfully merged ${selectedPages.length} selected pages!`,
      );
    } catch (error) {
      console.error('Error merging selected PDFs:', error);
      this.beritahu('pdf.mergeFailed', true);
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
    }
  }

  private downloadPdf(blob: Blob, prefix: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.generateFileName(prefix);
    a.click();
    URL.revokeObjectURL(url);
  }

  private generateFileName(prefix: string): string {
    // Waktu lokal: dengan toISOString(), berkas yang dibuat sebelum pukul
    // tujuh pagi WIB bernama tanggal kemarin.
    const n = new Date();
    const dua = (x: number) => String(x).padStart(2, '0');
    const timestamp =
      `${tanggalLokal(n)}T${dua(n.getHours())}-${dua(n.getMinutes())}-${dua(n.getSeconds())}`;
    return `${prefix}-${timestamp}.pdf`;
  }

  private showSuccessMessage(message: string): void {
    // You can replace this with a proper toast notification
    console.log(message);
    // For now, we'll just log it. You can integrate a toast service here.
  }

  // NEW: Bulk selection actions
  selectAllFromDocument(documentName: string): void {
    this.processedDocuments.forEach((page) => {
      if (page.originalFile === documentName) {
        page.selected = true;
      }
    });
    this.updateSelectionState();
  }

  deselectAllFromDocument(documentName: string): void {
    this.processedDocuments.forEach((page) => {
      if (page.originalFile === documentName) {
        page.selected = false;
      }
    });
    this.updateSelectionState();
  }

  // NEW: Quick selection patterns
  selectOddPages(): void {
    this.processedDocuments.forEach((page, index) => {
      page.selected = (index + 1) % 2 === 1;
    });
    this.updateSelectionState();
  }

  selectEvenPages(): void {
    this.processedDocuments.forEach((page, index) => {
      page.selected = (index + 1) % 2 === 0;
    });
    this.updateSelectionState();
  }

  selectFirstPageOfEachDocument(): void {
    const processedDocs = new Set();
    this.processedDocuments.forEach((page) => {
      if (page.originalFile && !processedDocs.has(page.originalFile)) {
        page.selected = true;
        processedDocs.add(page.originalFile);
      } else {
        page.selected = false;
      }
    });
    this.updateSelectionState();
  }

  removeFile(index: number): void {
    this.processedDocuments.splice(index, 1);
    this.updateSelectionState();
  }

  clearAll(): void {
    this.processedDocuments = [];
    this.selectionMode = false;
    this.updateSelectionState();
  }
}
