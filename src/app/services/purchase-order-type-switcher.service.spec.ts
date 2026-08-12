import { TestBed } from '@angular/core/testing';

import { PurchaseOrderTypeSwitcherService } from './purchase-order-type-switcher.service';

describe('PurchaseOrderTypeSwitcherService', () => {
  let service: PurchaseOrderTypeSwitcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PurchaseOrderTypeSwitcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
