import { describe, it, expect } from '@jest/globals';
import '../../src/ottoman-global-config';
import HotelModel from '../../src/hotels/hotels.model';

const validHotel = {
  name: 'Test Hotel',
  address: '1 Test Street',
  city: 'Testville',
  country: 'United States',
};

const validate = (data: Record<string, unknown>) => new HotelModel(data)._validate();

describe('HotelModel validation', () => {
  it('accepts a valid hotel', () => {
    expect(() => validate({ ...validHotel, phone: '(555) 555-1234', url: 'https://example.com' })).not.toThrow();
  });

  it('accepts a hotel without optional fields', () => {
    expect(() => validate(validHotel)).not.toThrow();
  });

  it.each(['name', 'address', 'city', 'country'])('requires %s', (field) => {
    const hotel: Record<string, unknown> = { ...validHotel };
    delete hotel[field];
    expect(() => validate(hotel)).toThrow(field);
  });

  it('rejects a phone number that is not in US format', () => {
    expect(() => validate({ ...validHotel, phone: 'call me maybe' })).toThrow('Phone number is invalid.');
  });

  it('rejects a url that is not a link', () => {
    expect(() => validate({ ...validHotel, url: 'not a link' })).toThrow('only allows a Link');
  });

  it('rejects review ratings outside 1-5', () => {
    expect(() => validate({ ...validHotel, reviews: [{ ratings: { Overall: 6 } }] })).toThrow();
  });
});
