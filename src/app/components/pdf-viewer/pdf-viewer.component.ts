import { Component, Inject, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  NgxExtendedPdfViewerComponent,
  NgxExtendedPdfViewerModule,
  pdfDefaultOptions,
} from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-pdf-viewer',
  imports: [MatDialogModule, NgxExtendedPdfViewerModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  standalone: true,
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
