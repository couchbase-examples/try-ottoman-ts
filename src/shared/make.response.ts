import { ValidationError } from 'ottoman';

async function makeResponse(res, action) {
  try {
    const result = await action();
    res.json(result);
  } catch (e: any) {
    console.log(e);
    const status = e.message !== undefined && e.message.indexOf('not found') !== -1 ? 404 : 500;
    res.status(e instanceof ValidationError ? 400 : status);
    res.json({ message: e.message });
  }
}

export default makeResponse;
