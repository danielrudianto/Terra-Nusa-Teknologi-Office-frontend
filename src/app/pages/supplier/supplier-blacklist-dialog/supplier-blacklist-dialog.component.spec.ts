import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplierBlacklistDialogComponent } from './supplier-blacklist-dialog.component';

describe('SupplierBlacklistDialogComponent', () => {
  let component: SupplierBlacklistDialogComponent;
  let fixture: ComponentFixture<SupplierBlacklistDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierBlacklistDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplierBlacklistDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
