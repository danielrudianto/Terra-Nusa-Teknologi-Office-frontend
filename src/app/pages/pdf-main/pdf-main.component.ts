// pages/merge/merge.component.ts
import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PdfService, MergeOptions } from '../../services/pdf.service';

interface PdfFile {
  id: number;
  file: File;
  name: string;
  pageCount: number;
  size: string;
  thumbnail?: string;
  uploadProgress: number;
}

@Component({
  selector: 'app-pdf-main',
  templateUrl: './pdf-main.component.html',
  styleUrls: ['./pdf-main.component.scss'],
  standalone: false,
})
export class MergeComponent implements OnInit {
  pdfFiles: PdfFile[] = [];
  nextId: number = 1;
  isMerging: boolean = false;
  mergeProgress: number = 0;

  // Merge options
  mergeOptions: MergeOptions = {
    addPageNumbers: false,
    pageNumberPosition: 'bottom',
    addTableOfContents: false,
    quality: 'standard',
  };

  get totalPages(): number {
    return this.pdfFiles.reduce((sum, file) => sum + file.pageCount, 0);
  }

  get totalSize(): string {
    const totalBytes = this.pdfFiles.reduce(
      (sum, file) => sum + file.file.size,
      0
    );
    return this.pdfService['formatFileSize'](totalBytes);
  }

  constructor(private pdfService: PdfService) {}

  ngOnInit(): void {}

  async onFilesDropped(files: FileList): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (
        file.type !== 'application/pdf' &&
        !file.name.toLowerCase().endsWith('.pdf')
      ) {
        continue;
      }

      const pdfInfo = await this.pdfService.getPdfInfo(file);

      const pdfFile: PdfFile = {
        id: this.nextId++,
        file: file,
        name: file.name,
        pageCount: pdfInfo.pageCount,
        size: pdfInfo.size,
        uploadProgress: 100,
      };

      this.pdfFiles.push(pdfFile);
    }
  }

  onFileDropped(event: CdkDragDrop<PdfFile[]>): void {
    moveItemInArray(this.pdfFiles, event.previousIndex, event.currentIndex);
  }

  removeFile(id: number): void {
    this.pdfFiles = this.pdfFiles.filter((file) => file.id !== id);
  }

  moveFileUp(index: number): void {
    if (index > 0) {
      [this.pdfFiles[index - 1], this.pdfFiles[index]] = [
        this.pdfFiles[index],
        this.pdfFiles[index - 1],
      ];
    }
  }

  moveFileDown(index: number): void {
    if (index < this.pdfFiles.length - 1) {
      [this.pdfFiles[index], this.pdfFiles[index + 1]] = [
        this.pdfFiles[index + 1],
        this.pdfFiles[index],
      ];
    }
  }

  async mergePdfs(): Promise<void> {
    if (this.pdfFiles.length < 2) return;

    this.isMerging = true;
    this.mergeProgress = 0;

    try {
      const files = this.pdfFiles.map((pdfFile) => pdfFile.file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        this.mergeProgress = Math.min(this.mergeProgress + 10, 90);
      }, 200);

      const mergedBlob = await this.pdfService.mergePdfs(
        files,
        this.mergeOptions
      );

      clearInterval(progressInterval);
      this.mergeProgress = 100;

      // Create download
      // this.downloadMergedPdf(mergedBlob);

      // Reset after short delay
      setTimeout(() => {
        this.isMerging = false;
        this.mergeProgress = 0;
      }, 1000);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      this.isMerging = false;
      this.mergeProgress = 0;
    }
  }

  private downloadMergedPdf(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.generateFileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  private generateFileName(): string {
    if (this.pdfFiles.length === 1) {
      return `merged-${this.pdfFiles[0].name}`;
    }
    return 'merged-document.pdf';
  }

  clearAll(): void {
    this.pdfFiles = [];
  }
}
