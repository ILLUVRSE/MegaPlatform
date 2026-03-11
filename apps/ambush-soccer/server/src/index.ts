import { AmbushWsServer } from './wsServer.js';

const port = Number(process.env.PORT ?? 8787);
const app = new AmbushWsServer(port);
app.start();
