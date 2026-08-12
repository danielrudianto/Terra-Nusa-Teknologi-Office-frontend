import { Component, OnInit, ViewChild } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { PDFDocument } from 'pdf-lib';
import * as pdfjslib from 'pdfjs-dist';
import { FileDropComponent } from './file-drop/file-drop.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

pdfjslib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PageData {
  pdf: string;
  thumbnail: string;
  pageNumber: number;
  fileName: string;
  originalFile?: string; // Track original file name
  selected?: boolean;
}

@Component({
  selector: 'app-pdf-main',
  templateUrl: './pdf-main.component.html',
  styleUrls: ['./pdf-main.component.scss'],
  standalone: true,
  imports: [
    CdkDragPreview,
    CdkDragPlaceholder,
    CommonModule,
    FileDropComponent,
    CdkDrag,
    CdkDropList,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
  ],
})
export class PdfMainComponent implements OnInit {
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

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (
          file.type === 'application/pdf' &&
          file.name.toLowerCase().endsWith('.pdf')
        ) {
          this.processingProgress = `Processing ${file.name}...`;
          await this.processPdfFile(file);
        }
      }
    } catch (error) {
      console.error('Error processing PDFs:', error);
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
    }
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
      alert('Please add at least 2 PDFs to merge.');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 'Merging PDFs...';

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pageData of this.processedDocuments) {
        try {
          // Convert base64 to Uint8Array
          const pdfBytes = Uint8Array.from(atob(pageData.pdf), (c) =>
            c.charCodeAt(0),
          );
          const pagePdf = await PDFDocument.load(pdfBytes);
          const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0]);
          mergedPdf.addPage(copiedPage);
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
      alert('Error merging PDFs. Please try again.');
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

  async saveSelectedPages(): Promise<void> {
    const selectedPages = this.selectedPages;

    if (selectedPages.length === 0) {
      alert('Please select at least one page to save.');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 'Creating PDF from selected pages...';

    try {
      const newPdf = await PDFDocument.create();

      for (const pageData of selectedPages) {
        const pdfBytes = Uint8Array.from(atob(pageData.pdf), (c) =>
          c.charCodeAt(0),
        );
        const pagePdf = await PDFDocument.load(pdfBytes);
        const [copiedPage] = await newPdf.copyPages(pagePdf, [0]);
        newPdf.addPage(copiedPage);
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
      alert('Error creating PDF. Please try again.');
    } finally {
      this.isProcessing = false;
      this.processingProgress = '';
    }
  }

  async mergeSelectedPdfs(): Promise<void> {
    const selectedPages = this.selectedPages;

    if (selectedPages.length < 2) {
      alert('Please select at least 2 pages to merge.');
      return;
    }

    this.isProcessing = true;
    this.processingProgress = 'Merging selected pages...';

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pageData of selectedPages) {
        const pdfBytes = Uint8Array.from(atob(pageData.pdf), (c) =>
          c.charCodeAt(0),
        );
        const pagePdf = await PDFDocument.load(pdfBytes);
        const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0]);
        mergedPdf.addPage(copiedPage);
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
      alert('Error merging PDFs. Please try again.');
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
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:]/g, '-');
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
