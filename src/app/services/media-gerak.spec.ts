import { TestBed } from '@angular/core/testing';
import { MediaGerakMatcher } from './media-gerak';

describe('MediaGerakMatcher', () => {
  afterEach(() => document.documentElement.removeAttribute('data-gerak'));

  it('reduced-motion dari OS diabaikan; sakelar aplikasi yang menentukan', () => {
    TestBed.configureTestingModule({ providers: [MediaGerakMatcher] });
    const m = TestBed.inject(MediaGerakMatcher);
    expect(m.matchMedia('(prefers-reduced-motion)').matches).toBeFalse();
    document.documentElement.setAttribute('data-gerak', 'mati');
    expect(m.matchMedia('(prefers-reduced-motion)').matches).toBeTrue();
  });

  it('kueri lain diteruskan apa adanya', () => {
    TestBed.configureTestingModule({ providers: [MediaGerakMatcher] });
    const m = TestBed.inject(MediaGerakMatcher);
    expect(m.matchMedia('(min-width: 1px)').matches).toBeTrue();
  });
});
