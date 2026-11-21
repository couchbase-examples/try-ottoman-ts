import { Request, Response } from 'express';
import HotelModel from './hotels.model';
import makeResponse from '../shared/make.response';
import { FindOptions } from 'ottoman';
import { CrudController } from '../shared/crud.controller';
import { containsPattern, intParam } from '../shared/query-params';

class HotelsController extends CrudController {
  constructor(route: string) {
    super(route, HotelModel);
  }

  protected getAll() {
    this.router.get('/', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        const options = new FindOptions({
          limit: intParam(req.query.limit, 'limit') ?? 50,
          skip: intParam(req.query.skip, 'skip') ?? 0,
          // A stable order so that limit/skip pages don't overlap.
          sort: { name: 'ASC', id: 'ASC' },
        });
        const filter = req.query.search ? { name: { $like: containsPattern(req.query.search) } } : {};
        const result = await HotelModel.find(filter, options);
        const { rows: items } = result;
        return {
          items,
        };
      });
    });
  }
}

export default HotelsController;
