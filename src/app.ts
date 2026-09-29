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

    // Keep the status set by middleware errors, e.g. 400 from express.json() for a malformed body.
    this.app.use((err: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
      return res.status(err.status || 500).json({ message: err.toString() });
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
