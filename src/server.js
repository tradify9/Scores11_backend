import { createServer } from 'http';
import { app, startServer } from './app.js';

const server = createServer(app);

startServer(server); // Start the server and connect to the database

export default server;
