import { TestBed } from '@angular/core/testing';

import { PurchaseOrderTypeSwitcher } from './purchase-order-type-switcher.service';

describe('PurchaseOrderTypeSwitcher', () => {
  let service: PurchaseOrderTypeSwitcher;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PurchaseOrderTypeSwitcher);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
