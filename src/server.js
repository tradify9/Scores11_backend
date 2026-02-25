import { createServer } from 'http';
import { app, startServer } from './app.js';

const server = createServer(app);

startServer(server);

export default server;
