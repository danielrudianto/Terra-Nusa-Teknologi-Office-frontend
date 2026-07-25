import { TestBed } from '@angular/core/testing';

import { PdfThumbnailService } from './pdf-thumbnail.service';

describe('PdfThumbnailService', () => {
  let service: PdfThumbnailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfThumbnailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
