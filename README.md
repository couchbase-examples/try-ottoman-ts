# Using Ottoman with Typescript

This is a sample application for getting started with Ottoman using Couchbase Server. The application provides a Rest API and demonstrates ODM capabilities using Ottoman v2, Couchbase Node.js SDK 3, and Express. The application is a flight planner that allows the user to search for and select a flight route (including return flight) based on airports and dates.

## Prepare Couchbase Server

To use the API, one would need to have Couchbase Server running locally. [Setup Couchbase Server using docker](https://docs.couchbase.com/server/7.0/install/getting-started-docker.html).

Follow instructions to Setup a new cluster and once the database is running, [install the required dataset](https://docs.couchbase.com/server/current/manage/manage-settings/install-sample-buckets.html#install-sample-buckets-with-the-ui): `travel-sample`.

## Typescript Prerequisites

[Node.js](http://nodejs.org/) and [Yarn](https://classic.yarnpkg.com/en/docs/install) should be installed before running this project.

## Prepare Our Project Folder

We can bootstrap our application. Create a directory and clone the repository on GitHub.

### Development Guide

1. Clone this repo and install dependencies

```bash
git clone https://github.com/couchbase-examples/try-ottoman-ts.git
cd try-ottoman-ts
yarn install
```

2. Set up Environment Variables
    - Copy the `.env.example` into `.env`
    ```
    cp .env.example .env
    ```
    - Set the connection variables for your cluster:
        - `DB_CONN_STR`: the cluster connection string, e.g. `couchbase://localhost`
        - `DB_USERNAME` / `DB_PASSWORD`: the cluster credentials
        - `DB_BUCKET_NAME`: the bucket to use (`travel-sample`)
        - `APP_PORT`: the port the API listens on (defaults to `4500`)
        - The values in `.env.example` will work for a locally hosted Couchbase cluster with username `Administrator` and password `password`. Change them as needed to fit your cluster.
        - This API uses the `travel-sample` bucket, which you'll need to add to your cluster for proper functionality. [Learn more about installing sample buckets here.](https://docs.couchbase.com/server/current/manage/manage-settings/install-sample-buckets.html)
    
3. Run the API example

```bash
yarn start
```

## Testing

The test suite uses [Jest](https://jestjs.io/) and [supertest](https://github.com/ladjs/supertest). It is split into two projects:

- **Unit tests** (`test/unit`) cover validators, custom types and response handling, and don't need a database.
- **Integration tests** (`test/integration`) call every REST endpoint against a real Couchbase cluster with the `travel-sample` bucket loaded.

The quickest way to get a cluster for the tests is the bundled script. It starts Couchbase Server in Docker (container `try-ottoman-cb`, ports `8091-8097` and `11210`), initializes it, and loads `travel-sample`:

```bash
yarn couchbase:start   # safe to re-run; skips steps that are already done
yarn test              # all unit + integration tests
yarn test:unit         # unit tests only, no Couchbase needed
yarn typecheck         # tsc --noEmit
```

The tests read the same `DB_*` variables as the app, so you can also point them at your own cluster.

The [Tests workflow](.github/workflows/tests.yml) runs the typecheck, unit tests and integration tests (against the same Docker setup) on every pull request and on pushes to `main`.

> The Node.js version is set in `.nvmrc`. It is Node 16 because the Couchbase SDK version this project uses (3.2.2) only publishes prebuilt binaries up to Node 16. Update `.nvmrc` when upgrading the SDK.

## Tutorial Project (Travel-Sample) Goals

- A REST API built with Express and Ottoman V2
- Store hotels, flight, and airport information
- The Couchbase travel-sample data set will be the system of record

### Data Model

The flexibility and dynamic nature of a NoSQL Document Database and JSON simplifies building the data model. For the travel-sample application we will use three types of objects, and we'll define those in specific modules in the node application.

- airports
- flightPaths
- hotels

The source code is organized by modules inside the `src` directory. Each module defines a set of REST endpoints, and the data model of a resource. Data models are defined in files ending with: `.model.ts` using Ottoman's `{ model, Schemea }` named exports, and it's corresponding endpoints are defined in the files ending with: `.controller.ts`, using Express JS.

Let's walk through the code starting with the `hotels` module.

### Hotel Model

The first section of the hotel module instantiates module dependencies, which are Ottoman and the database file where the information on the Couchbase instance is stored for this particular example.

```ts
import { model, addValidators, Schema } from 'ottoman';    // ← use ottoman
import { GeolocationSchema } from '../shared/geolocation.schema';
```

Next, a custom validator function is defined to make sure that a phone number in the standard USA format is created.

```ts
addValidators({
  phone: function(value) {
      const phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      if(value && !value.match(phone)) {
        throw new Error('Phone number is invalid.');
      }
  },
});
```

The model for the Hotels object is defined using several of the Ottoman built-in types. For reference, see http://www.ottoman.com. Several indices are defined along with the model. The indices are utilized as methods for each instance of the Hotel Object. Ottoman supports complex data types, embedded references to other models, and customization.

We are going to define a custom type link

```typescript
import { IOttomanType, ValidationError, registerType } from 'ottoman';

/**
 * Custom type to manage the links
 */
export default class LinkType extends IOttomanType {
    constructor(name) {
        super(name, 'Link');
    }

    cast(value) {
        this.validate(value);
        return String(value);
    }

    validate(value: unknown, strict?: boolean): unknown {
        if (value && !isLink(String(value))) {
            throw new ValidationError(`Field ${this.name} only allows a Link`);
        }
        return String(value);
    }
}

/**
 * Factory function
 * @param name of field
 */
const linkTypeFactory = (name) => new LinkType(name);

/**
 * Register type on Schema Supported Types
 */
registerType(LinkType.name, linkTypeFactory);

/**
 * Check if value is a valid Link
 * @param value
 */
const isLink = (value: string) => {
  const regExp = new RegExp(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
  );
  return regExp.test(value);
};

export default LinkType;
```

With the link custom type, we continue with the schema definition

```typescript
const ReviewSchema = new Schema({
  author: String,
  content: String,
  date: Date,
  ratings: {
    Cleanliness: { type: Number, min: 1, max: 5 },
    Overall: { type: Number, min: 1, max: 5 },
    Rooms: { type: Number, min: 1, max: 5 },
    Service: { type: Number, min: 1, max: 5 },
    Value: { type: Number, min: 1, max: 5 },
  },
});

const HotelSchema = new Schema({
  address: { type: String, required: true },
  alias: String,
  checkin: String,
  checkout: String,
  city: { type: String, required: true },
  country: { type: String, required: true },
  description: String,
  directions: [String],
  email: String,
  fax: String,
  free_breakfast: Boolean,
  free_internet: Boolean,
  free_parking: Boolean,
  geo: GeolocationSchema,
  name: { type: String, required: true },
  pets_ok: Boolean,
  phone: { type: String, validator: 'phone' }, // My custom validator
  price: Number,
  public_likes: [String],
  reviews: [ReviewSchema],
  state: String,
  title: String,
  tollfree: String,
  url: LinkType, // My custom type
  vacancy: Boolean,
});

HotelSchema.index.findByName = { by: 'name', type: 'n1ql' };

const HotelModel = model('hotel', HotelSchema);
export default HotelModel;
```

In the Hotel model above, there is one explicit index defined. By default,
if an index type is not specified Ottoman will select the fastest available index supported within the current Couchbase cluster.

In addition to utilizing built-in secondary index support within Couchbase, Ottoman can also utilize referential documents and maintain the referential integrity for updates and deletes, a feature that allows fast lookups by field.

This type of index in Ottoman is useful for finding a particular object by a unique field such as customer id or email address in the example above.
In addition to any explicit index, Ottoman also provides a generic find capability using the query API and N1QL.

### Airport Model

The airport module begins much the same way as the hotel module.  

```typescript
import { model, addValidators, Schema }  from 'ottoman';  // ← use ottoman
import { GeolocationSchema }  from '../shared/geolocation.schema';
```

As in the Hotel model, the Airport object is defined with several different data types, embedded references to other models and explicitly defined secondary indexes.

```typescript
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
```

The index like in the hotel example are.

### Application and Routing

Now that the models are defined above, the controller functionality is defined in the ```index.ts``` file in the root directory, and the routes on files ```*.controller.ts``` in the module directory.

#### App

The `index.ts` file is the entry point to the application and defines how the application will function. The code within the file is as follows:

```typescript
import { ottoman, connectOttoman } from './db';
import { createApp } from './app';

const app = createApp(Number(process.env.APP_PORT || 4500));

const main = async () => {
  try {
    await connectOttoman();
    await ottoman.start();
    app.listen();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
```

`connectOttoman` lives in `db.ts` and connects using the `DB_*` environment variables:

```typescript
import { ottoman } from './ottoman-global-config';

const connectOttoman = async () => {
  // Couchbase SDK 3.2 times out immediately if it connects in the same event-loop tick as a
  // long synchronous startup (e.g. ts-node compiling the app), so yield to the event loop first.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return ottoman.connect({
    bucketName: process.env.DB_BUCKET_NAME || 'travel-sample',
    connectionString: process.env.DB_CONN_STR || 'couchbase://localhost',
    username: process.env.DB_USERNAME || 'Administrator',
    password: process.env.DB_PASSWORD || 'password',
  });
};

export { ottoman, connectOttoman };
```

The `app.ts` file define the expressjs and server configuration:

```typescript
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import * as swaggerUi from 'swagger-ui-express';
import * as YAML from 'yamljs';
import { ControllerType } from "./shared/controller.type";
import HotelsController from './hotels/hotels.controller';
import AirportsController from './airports/airports.controller';
import FlightController from './flights/flights.controller';

class App {
  public app: express.Application;
  public port: number;

  constructor(controllers: ControllerType[], port: number) {
    this.app = express();
    this.port = port;
    this.app.use(express.json());
    this.app.get('/', (req, res) => {
      res.send('I am ready!!');
    });
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(YAML.load(path.join(__dirname, '..', 'swagger.yaml'))));

    this.initializeControllers(controllers);

    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      return res.status(500).json({ message: err.toString() });
    });
  }

  private initializeControllers(controllers: ControllerType[]) {
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
  }

  public listen() {
    return this.app.listen(this.port, () => {
      console.log(`API started at http://localhost:${this.port}`);
      console.log(`API docs at http://localhost:${this.port}/api-docs/`);
    });
  }

}

export const createApp = (port: number) =>
  new App(
    [
      new HotelsController('/hotels'),
      new AirportsController('/airports'),
      new FlightController('/flightPaths'),
    ],
    port
  );

export default App;
```

#### Swagger Documentation

After running `yarn start`,  Once you have the example running, you can find all definitions in Swagger:

```http://localhost:4500/api-docs/```
