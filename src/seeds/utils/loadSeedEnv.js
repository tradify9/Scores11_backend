import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.resolve(__dirname, '../../../.env');

export const loadSeedEnv = () => {
  const result = dotenv.config({ path: backendEnvPath });

  if (result.error) {
    dotenv.config();
  }

  return {
    envPath: backendEnvPath,
    loaded: !result.error
  };
};

export const getMongoUri = () => {
  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI_PROD) {
    return process.env.MONGODB_URI_PROD;
  }

  return process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
};

