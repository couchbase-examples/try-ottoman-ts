import { describe, it, expect } from '@jest/globals';
import { validate } from 'ottoman';
import { HotelSchema } from '../../src/hotels/hotels.model';

const validHotel = {
  name: 'Test Hotel',
  address: '1 Test Street',
  city: 'Testville',
  country: 'United States',
};

// The same schema validation Ottoman runs before saving a document.
const validateHotel = (data: Record<string, unknown>) => validate(data, HotelSchema);

describe('HotelModel validation', () => {
  it('accepts a valid hotel', () => {
    expect(() => validateHotel({ ...validHotel, phone: '(555) 555-1234', url: 'https://example.com' })).not.toThrow();
  });

  it('accepts a hotel without optional fields', () => {
    expect(() => validateHotel(validHotel)).not.toThrow();
  });

  it.each(['name', 'address', 'city', 'country'])('requires %s', (field) => {
    const hotel: Record<string, unknown> = { ...validHotel };
    delete hotel[field];
    expect(() => validateHotel(hotel)).toThrow(field);
  });

  it('rejects a phone number that is not in US format', () => {
    expect(() => validateHotel({ ...validHotel, phone: 'call me maybe' })).toThrow('Phone number is invalid.');
  });

  it('rejects a url that is not a link', () => {
    expect(() => validateHotel({ ...validHotel, url: 'not a link' })).toThrow('only allows a Link');
  });

  it('rejects review ratings outside 1-5', () => {
    expect(() => validateHotel({ ...validHotel, reviews: [{ ratings: { Overall: 6 } }] })).toThrow(
      "Property 'Overall' is more than the maximum allowed value of '5'",
    );
  });
});
