import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  NgxExtendedPdfViewerComponent,
  pdfDefaultOptions,
} from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  standalone: false,
})
export class PdfViewerComponent {
  @ViewChild(NgxExtendedPdfViewerComponent, { static: false })
  private pdfViewer!: NgxExtendedPdfViewerComponent;
  file: File | undefined;
  src: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    dialog: MatDialogRef<PdfViewerComponent>
  ) {
    this.file = data.file;
    this.toBase64(this.file!)
      .then((base64: any) => {
        this.src = base64;
      })
      .catch((error) => {
        console.error('Error converting file to base64:', error);
      });

    dialog.beforeClosed().subscribe((result) => {
      console.log('The dialog is about to be closed');
      // Here's the interesting bit:
      this.pdfViewer.ngOnDestroy();
    });
  }

  toBase64 = (file: File) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
}
