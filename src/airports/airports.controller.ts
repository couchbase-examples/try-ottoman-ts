import { Request, Response } from 'express';
import AirportModel from './airports.model';
import makeResponse from '../shared/make.response';
import { FindOptions } from 'ottoman';
import { CrudController } from '../shared/crud.controller';
import { containsPattern, intParam } from '../shared/query-params';

class AirportsController extends CrudController {
  constructor(route: string) {
    super(route, AirportModel);
  }

  protected getAll() {
    this.router.get('/', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        const { limit, search, skip } = req.query;
        const options = new FindOptions({
          limit: intParam(limit, 'limit') ?? 50,
          skip: intParam(skip, 'skip') ?? 0,
          // A stable order so that limit/skip pages don't overlap.
          sort: { airportname: 'ASC', id: 'ASC' },
        });
        const filter = search ? { airportname: { $like: containsPattern(search) } } : {};
        const result = await AirportModel.find(filter, options);
        const { rows: items } = result;
        return {
          items,
        };
      });
    });
  }
}

export default AirportsController;
