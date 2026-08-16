import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root',
})
export class PdfThumbnailService {
  private pdfjs = pdfjsLib;
  async generateThumbnails(
    pdfUrl: string,
    thumbnailWidth: number = 200
  ): Promise<string[]> {
    try {
      // Load the PDF document
      const loadingTask = this.pdfjs.getDocument(pdfUrl);
      const pdf: pdfjsLib.PDFDocumentProxy = await loadingTask.promise;
      const thumbnails: string[] = [];
      // Halaman pdfjs dinomori dari SATU, bukan nol.
      //
      // Perulangan sebelumnya dimulai dari 0 dan berakhir di `numPages`,
      // sehingga meminta satu halaman yang tidak ada di awal dan satu lagi
      // di akhir. `getPage(0)` melempar galat, dan seluruh pembuatan
      // thumbnail berhenti sebelum satu pun jadi.
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page: pdfjsLib.PDFPageProxy = await pdf.getPage(pageNum);
        // Get the natural viewport (scale 1) to compute the scaling factor
        const naturalViewport = page.getViewport({ scale: 1 });
        const scale = thumbnailWidth / naturalViewport.width;
        // Get the scaled viewport for rendering
        const viewport = page.getViewport({ scale });
        // Create a canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = Math.floor(viewport.height); // Floor to avoid fractional pixels
        canvas.width = Math.floor(viewport.width);
        // Render the page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };
        await page.render(renderContext).promise;
        // Convert canvas to data URL (PNG image)
        const thumbnailDataUrl = canvas.toDataURL('image/png');
        thumbnails.push(thumbnailDataUrl);
      }
      return thumbnails;
    } catch (error) {
      console.error('Error generating PDF thumbnails:', error);
      throw error;
    }
  }
}
