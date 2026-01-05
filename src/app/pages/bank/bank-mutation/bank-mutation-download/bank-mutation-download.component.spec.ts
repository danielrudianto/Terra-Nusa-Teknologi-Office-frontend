import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankMutationDownloadComponent } from './bank-mutation-download.component';

describe('BankMutationDownloadComponent', () => {
  let component: BankMutationDownloadComponent;
  let fixture: ComponentFixture<BankMutationDownloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankMutationDownloadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankMutationDownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
