import { model, Schema } from 'ottoman';
// Models register on the default Ottoman instance, so make sure it exists first.
import '../ottoman-global-config';
import GeolocationSchema from '../shared/geolocation.schema';

const AirportSchema = new Schema({
  airportname: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  faa: String,
  geo: GeolocationSchema,
  icao: String,
  tz: { type: String, required: true },
});

AirportSchema.index.findByName = { by: 'airportname', type: 'n1ql' };

const AirportModel = model('airport', AirportSchema);

export default AirportModel;
