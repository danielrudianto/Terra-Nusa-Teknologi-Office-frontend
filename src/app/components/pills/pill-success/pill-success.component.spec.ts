import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PillSuccessComponent } from './pill-success.component';

describe('PillSuccessComponent', () => {
  let component: PillSuccessComponent;
  let fixture: ComponentFixture<PillSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PillSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
