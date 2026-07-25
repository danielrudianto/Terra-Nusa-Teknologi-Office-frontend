import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankCreateComponent } from './bank-create.component';

describe('BankCreateComponent', () => {
  let component: BankCreateComponent;
  let fixture: ComponentFixture<BankCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
