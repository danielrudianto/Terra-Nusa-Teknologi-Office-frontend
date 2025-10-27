import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PillDangerComponent } from './pill-danger.component';

describe('PillDangerComponent', () => {
  let component: PillDangerComponent;
  let fixture: ComponentFixture<PillDangerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillDangerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PillDangerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
