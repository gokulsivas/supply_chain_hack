// Save as: backend/src/server.ts
import http from 'http';
import { app } from './app';
import { initSocket } from './sockets';
import { env } from './config/env';

const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});