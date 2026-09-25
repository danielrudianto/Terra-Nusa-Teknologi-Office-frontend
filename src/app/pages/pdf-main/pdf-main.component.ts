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
pdfjslib.GlobalWorkerOptions.workerSrc = '/assets/pdf-worker-shim.mjs';

/**
 * Satu coretan pada halaman.
 *
 * Letaknya disimpan sebagai pecahan lebar dan tinggi halaman (0–1), bukan
 * piksel: ukuran pratinjau di layar berbeda dari ukuran halaman
 * sebenarnya, dan piksel yang benar di satu ukuran akan meleset di ukuran
 * lain.
 */
interface Anotasi {
  /** `tutup` menutupi teks lama; `catatan` menambahkan tulisan di atasnya. */
  jenis: 'tutup' | 'catatan';
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
}

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
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

      for (const pageData of this.processedDocuments) {
        try {
          await this.salinHalaman(mergedPdf, pageData, font);
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
  private async salinHalaman(
    tujuan: PDFDocument,
    pageData: PageData,
    font: any,
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
      this.gambarAnotasi(copiedPage, a, efektif, font);
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
   * Gambar satu coretan pada halaman PDF.
   *
   * Hitungan letaknya ada di `petaAnotasi`; di sini tinggal menggambar.
   */
  private gambarAnotasi(
    page: any,
    a: Anotasi,
    putar: number,
    font: any,
  ): void {
    const { width: W, height: H } = page.getSize();

    if (a.jenis === 'tutup') {
      const k = PdfMainComponent.petaAnotasi(
        { ...a, lebar: a.lebar ?? 0.24, tinggi: a.tinggi ?? 0.024 },
        W,
        H,
        putar,
      );
      page.drawRectangle({
        x: k.x,
        y: k.y,
        width: k.width,
        height: k.height,
        color: rgb(1, 1, 1),
      });

      if (a.teks) {
        page.drawText(a.teks, {
          x: k.x + 2,
          y: k.y + 3,
          size: Math.min(11, k.height * 0.75),
          font,
          color: rgb(0, 0, 0),
        });
      }
      return;
    }

    // Catatan: tulisan saja, tanpa menutupi apa pun di bawahnya.
    if (!a.teks) return;
    const t = PdfMainComponent.petaAnotasi(a, W, H, putar);
    page.drawText(a.teks, {
      x: t.x,
      // `t.y` adalah tepi BAWAH kotak setinggi nol, jadi ia sekaligus garis
      // dasar tulisannya.
      y: t.y,
      size: 10,
      font,
      color: rgb(0.72, 0.11, 0.11),
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
      const font = await newPdf.embedFont(StandardFonts.Helvetica);

      for (const pageData of selectedPages) {
        await this.salinHalaman(newPdf, pageData, font);
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
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

      for (const pageData of selectedPages) {
        await this.salinHalaman(mergedPdf, pageData, font);
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
