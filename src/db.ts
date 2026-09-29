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
