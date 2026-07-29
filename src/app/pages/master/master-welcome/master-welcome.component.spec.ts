import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterWelcomeComponent } from './master-welcome.component';

describe('MasterWelcomeComponent', () => {
  let component: MasterWelcomeComponent;
  let fixture: ComponentFixture<MasterWelcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterWelcomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterWelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
