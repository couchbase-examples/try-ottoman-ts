import express, { Request, Response } from 'express';
import { ModelTypes } from 'ottoman';
import makeResponse from './make.response';

/**
 * Serves one Ottoman model as a REST resource:
 *
 *   GET    /     list (each resource decides how, see `getAll`)
 *   GET    /:id  200 with the document, 404 if there is none
 *   POST   /     201 with the created document, 400 if it fails schema validation
 *   PATCH  /:id  204, merging the body into the document
 *   PUT    /:id  204, replacing the whole document with the body
 *   DELETE /:id  204
 *
 * Errors map to status codes in `makeResponse`.
 */
export abstract class CrudController {
  public readonly router = express.Router();

  constructor(public readonly path: string, protected readonly model: ModelTypes) {
    this.getAll();
    this.getById();
    this.post();
    this.patch();
    this.put();
    this.delete();
  }

  /** Registers `GET /`. Listing differs per resource (search fields, joins), so each one defines its own. */
  protected abstract getAll(): void;

  protected getById() {
    this.router.get('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, () => this.model.findById(req.params.id));
    });
  }

  protected post() {
    this.router.post('/', async (req: Request, res: Response) => {
      await makeResponse(res, () => {
        res.status(201);
        const document = new this.model(req.body);
        return document.save();
      });
    });
  }

  protected patch() {
    this.router.patch('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        await this.model.updateById(req.params.id, req.body);
        res.status(204);
      });
    });
  }

  protected put() {
    this.router.put('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        await this.model.replaceById(req.params.id, req.body);
        res.status(204);
      });
    });
  }

  protected delete() {
    this.router.delete('/:id', async (req: Request, res: Response) => {
      await makeResponse(res, async () => {
        await this.model.removeById(req.params.id);
        res.status(204);
      });
    });
  }
}
