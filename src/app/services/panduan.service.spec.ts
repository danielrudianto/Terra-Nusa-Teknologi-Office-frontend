import { TestBed } from '@angular/core/testing';

import { PanduanService } from './panduan.service';

describe('PanduanService', () => {
  let service: PanduanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanduanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
