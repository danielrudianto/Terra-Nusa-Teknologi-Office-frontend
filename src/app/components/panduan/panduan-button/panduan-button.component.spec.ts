import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanduanButtonComponent } from './panduan-button.component';

describe('PanduanButtonComponent', () => {
  let component: PanduanButtonComponent;
  let fixture: ComponentFixture<PanduanButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanduanButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanduanButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
