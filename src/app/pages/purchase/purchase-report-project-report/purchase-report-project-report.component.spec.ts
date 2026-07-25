import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseReportProjectReportComponent } from './purchase-report-project-report.component';

describe('PurchaseReportProjectReportComponent', () => {
  let component: PurchaseReportProjectReportComponent;
  let fixture: ComponentFixture<PurchaseReportProjectReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseReportProjectReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseReportProjectReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
