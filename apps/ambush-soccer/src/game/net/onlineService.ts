import { NetClient } from './NetClient';
import { OnlineSession } from './OnlineSession';

const wsUrl = import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8787/ws`;

const netClient = new NetClient(wsUrl);
const onlineSession = new OnlineSession(netClient);

let initialized = false;

export const getOnlineSession = (): OnlineSession => {
  if (!initialized) {
    netClient.connect('0.3.0');
    netClient.onMessage((msg) => onlineSession.handleMessage(msg));
    netClient.onConnectionStatus((connected) => {
      if (connected) {
        onlineSession.reconnectActiveMatch();
      }
    });
    initialized = true;
  }
  return onlineSession;
};
