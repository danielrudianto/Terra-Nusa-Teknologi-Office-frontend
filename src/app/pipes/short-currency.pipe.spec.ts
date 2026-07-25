import { ShortCurrencyPipe } from './short-currency.pipe';

describe('ShortCurrencyPipe', () => {
  it('create an instance', () => {
    const pipe = new ShortCurrencyPipe();
    expect(pipe).toBeTruthy();
  });
});
