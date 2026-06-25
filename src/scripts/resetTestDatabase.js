import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const OLD_DATABASE = 'test';
const NEW_DATABASE = process.env.MONGODB_DB_NAME || 'crick11';

const run = async () => {
  if (NEW_DATABASE === OLD_DATABASE) {
    throw new Error('MONGODB_DB_NAME must not be test');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000
  });
  const connectedDatabase = mongoose.connection.name;
  if (connectedDatabase !== OLD_DATABASE) {
    throw new Error(
      `Safety stop: expected old database "${OLD_DATABASE}", connected to "${connectedDatabase}"`
    );
  }

  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: NEW_DATABASE,
    serverSelectionTimeoutMS: 15000
  });
  await mongoose.connection.db.collection('app_meta').insertOne({
    key: 'database_initialized',
    database: NEW_DATABASE,
    initializedAt: new Date()
  });
  console.log(`Dropped "${OLD_DATABASE}" and initialized "${NEW_DATABASE}".`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
