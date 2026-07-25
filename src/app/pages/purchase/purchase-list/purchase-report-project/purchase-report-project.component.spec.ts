import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseReportProjectComponent } from './purchase-report-project.component';

describe('PurchaseReportProjectComponent', () => {
  let component: PurchaseReportProjectComponent;
  let fixture: ComponentFixture<PurchaseReportProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseReportProjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseReportProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
