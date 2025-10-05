import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PDFDocument } from 'pdf-lib';
import * as pdfjslib from 'pdfjs-dist';

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
  standalone: false,
})
export class PdfMainComponent implements OnInit {
  processedDocuments: PageData[] = [];
  isProcessing = false;
  isDragging = false;
  processingProgress = '';

  selectionMode = false;
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
      const individualPages = await this.splitPdfIntoPages(file);
      const pagesWithThumbnails = await this.convertPagesToThumbnails(
        individualPages,
        file.name
      );

      // Add original file reference to each page
      const pagesWithOrigin = pagesWithThumbnails.map((page) => ({
        ...page,
        originalFile: file.name,
      }));

      this.processedDocuments.push(...pagesWithOrigin);
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      throw error;
    }
  }

  private async splitPdfIntoPages(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);
    const pageCount = sourcePdf.getPageCount();
    const pages: string[] = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      // Create a new PDF for each individual page
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(sourcePdf, [
        pageIndex,
      ]);
      singlePagePdf.addPage(copiedPage);

      // Save as base64 (without data URI prefix)
      const pdfBytes = await singlePagePdf.saveAsBase64({ dataUri: false });
      pages.push(pdfBytes);
    }

    return pages;
  }

  private async convertPagesToThumbnails(
    pages: string[],
    fileName: string
  ): Promise<PageData[]> {
    const pagesWithThumbnails: PageData[] = [];

    for (let i = 0; i < pages.length; i++) {
      try {
        const thumbnail = await this.convertPdfPageToImage(pages[i]);

        pagesWithThumbnails.push({
          pdf: pages[i],
          thumbnail: thumbnail,
          pageNumber: i + 1,
          fileName: this.generatePageFileName(fileName, i + 1),
        });
      } catch (error) {
        console.error(`Error converting page ${i + 1}:`, error);
        // Add fallback thumbnail
        pagesWithThumbnails.push({
          pdf: pages[i],
          thumbnail: this.createFallbackThumbnail(i + 1),
          pageNumber: i + 1,
          fileName: this.generatePageFileName(fileName, i + 1),
        });
      }
    }

    return pagesWithThumbnails;
  }

  private async convertPdfPageToImage(pdfBase64: string): Promise<string> {
    try {
      // Convert base64 to Uint8Array
      const pdfData = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));

      // Load the PDF document
      const loadingTask = pdfjslib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      // Get the first page (since each PDF now contains only one page)
      const page = await pdf.getPage(1);

      // Set scale for thumbnail (adjust as needed)
      const scale = 0.5;
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convert canvas to base64 image (JPEG with 80% quality)
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Error in convertPdfPageToImage:', error);
      throw error;
    }
  }

  private generatePageFileName(
    originalName: string,
    pageNumber: number
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
      event.currentIndex
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
    }
  }

  moveFileDown(index: number): void {
    if (index < this.processedDocuments.length - 1) {
      const temp = this.processedDocuments[index];
      this.processedDocuments[index] = this.processedDocuments[index + 1];
      this.processedDocuments[index + 1] = temp;

      // Add animation class
      this.animateMovement(index, index + 1);
    }
  }

  private animateMovement(fromIndex: number, toIndex: number): void {
    // This will be handled by CSS transitions
    // You can add specific animation logic here if needed
  }

  reverseOrder(): void {
    this.processedDocuments.reverse();
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
  }

  async mergePdfs(): Promise<void> {
    if (this.processedDocuments.length < 2) return;

    this.isProcessing = true;
    this.processingProgress = 'Merging PDFs...';

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pageData of this.processedDocuments) {
        const pdfBytes = Uint8Array.from(atob(pageData.pdf), (c) =>
          c.charCodeAt(0)
        );
        const pagePdf = await PDFDocument.load(pdfBytes);
        const [copiedPage] = await mergedPdf.copyPages(pagePdf, [0]);
        mergedPdf.addPage(copiedPage);
      }

      const mergedPdfBytes = await mergedPdf.save();

      // FIX: Convert to regular ArrayBuffer if needed
      const blobData =
        mergedPdfBytes.buffer instanceof SharedArrayBuffer
          ? new Uint8Array(mergedPdfBytes).buffer
          : mergedPdfBytes.buffer;

      const blob = new Blob([blobData], { type: 'application/pdf' });
      this.downloadMergedPdf(blob);
    } catch (error) {
      console.error('Error merging PDFs:', error);
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

    if (this.selectionMode) {
      page.selected = !page.selected;
      this.updateSelectionState();
    }
  }

  toggleSelectAll(): void {
    this.allSelected = !this.allSelected;
    this.processedDocuments.forEach((page) => {
      page.selected = this.allSelected;
    });
  }

  clearAllSelections(): void {
    this.processedDocuments.forEach((page) => {
      page.selected = false;
    });
    this.allSelected = false;
  }

  private updateSelectionState(): void {
    const selectedCount = this.processedDocuments.filter(
      (page) => page.selected
    ).length;
    this.allSelected = selectedCount === this.processedDocuments.length;
  }

  get selectedPages(): PageData[] {
    return this.processedDocuments.filter((page) => page.selected);
  }

  get selectedCount(): number {
    return this.selectedPages.length;
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
          c.charCodeAt(0)
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
        `Successfully created PDF with ${selectedPages.length} selected pages!`
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
          c.charCodeAt(0)
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
        `Successfully merged ${selectedPages.length} selected pages!`
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
    this.allSelected = false;
  }
}
