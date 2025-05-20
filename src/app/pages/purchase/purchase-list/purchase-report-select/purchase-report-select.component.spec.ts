import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseReportSelectComponent } from './purchase-report-select.component';

describe('PurchaseReportSelectComponent', () => {
  let component: PurchaseReportSelectComponent;
  let fixture: ComponentFixture<PurchaseReportSelectComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PurchaseReportSelectComponent]
    });
    fixture = TestBed.createComponent(PurchaseReportSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
