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
