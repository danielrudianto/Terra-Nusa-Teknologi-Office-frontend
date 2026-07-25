// services/pdf.service.ts - Alternative version with better types
import { Injectable } from '@angular/core';
import { PDFDocument, rgb, PDFPage } from 'pdf-lib';

export interface MergeOptions {
  addPageNumbers: boolean;
  pageNumberPosition: 'top' | 'bottom';
  addTableOfContents: boolean;
  quality: 'standard' | 'high';
}

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {}

  async mergePdfs(
    pdfFiles: File[],
    options: MergeOptions = {
      addPageNumbers: false,
      pageNumberPosition: 'bottom',
      addTableOfContents: false,
      quality: 'standard',
    }
  ): Promise<void> {
    const mergedPdf = await PDFDocument.create();

    // Add table of contents if requested
    if (options.addTableOfContents && pdfFiles.length > 1) {
      await this.addTableOfContents(mergedPdf, pdfFiles);
    }

    let currentPageNumber = 1;

    for (const file of pdfFiles) {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const pageIndices = Array.from(
        { length: pdf.getPageCount() },
        (_, i) => i
      );
      const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

      copiedPages.forEach((page) => {
        const addedPage = mergedPdf.addPage(page);

        // Add page numbers if requested
        if (options.addPageNumbers) {
          this.addPageNumber(
            addedPage,
            currentPageNumber,
            options.pageNumberPosition
          );
        }
        currentPageNumber++;
      });
    }

    const saveOptions =
      options.quality === 'high' ? {} : { useObjectStreams: true };
    const mergedPdfBytes = await mergedPdf.save(saveOptions);
    // return new Blob([mergedPdfBytes], { type: 'application/pdf' });
  }

  private async addTableOfContents(
    pdf: PDFDocument,
    files: File[]
  ): Promise<void> {
    // Create a TOC page
    const tocPage = pdf.addPage([600, 800]);
    const { width, height } = tocPage.getSize();

    tocPage.drawText('Table of Contents', {
      x: 50,
      y: height - 100,
      size: 20,
      color: rgb(0, 0, 0),
    });

    let yPosition = height - 150;
    for (let i = 0; i < files.length; i++) {
      tocPage.drawText(`${i + 1}. ${files[i].name}`, {
        x: 50,
        y: yPosition,
        size: 12,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
    }
  }

  private addPageNumber(
    page: PDFPage,
    pageNumber: number,
    position: 'top' | 'bottom'
  ): void {
    const { width, height } = page.getSize();
    const yPosition = position === 'top' ? height - 30 : 30;

    page.drawText(`${pageNumber}`, {
      x: width - 30,
      y: yPosition,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  async getPdfInfo(file: File): Promise<{ pageCount: number; size: string }> {
    try {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      return {
        pageCount: pdf.getPageCount(),
        size: this.formatFileSize(file.size),
      };
    } catch (error) {
      console.error('Error reading PDF info:', error);
      return {
        pageCount: 1, // Fallback
        size: this.formatFileSize(file.size),
      };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
