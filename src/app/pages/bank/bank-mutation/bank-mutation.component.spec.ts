import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankMutationComponent } from './bank-mutation.component';

describe('BankMutationComponent', () => {
  let component: BankMutationComponent;
  let fixture: ComponentFixture<BankMutationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankMutationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankMutationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
