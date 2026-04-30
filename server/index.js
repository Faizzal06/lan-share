import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ExpressPeerServer } from 'peer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5500;

// ── PeerServer (WebRTC Signaling) ──────────────────────────────────
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true,
});
app.use('/peerjs', peerServer);

// ── ICE Servers Configuration ──────────────────────────────────────
// Builds the ICE server list with STUN + TURN.
// Configure via environment variables:
//   TURN_URL       - e.g. "turn:turn.example.com:3478"
//   TURN_USERNAME  - TURN username
//   TURN_CREDENTIAL - TURN credential/password
function getIceServers() {
  const servers = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // Add configured TURN server(s)
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });
  }

  // Add free community TURN servers as fallback
  // These provide basic relay capability for cross-network transfers
  servers.push(
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  );

  return servers;
}

// Endpoint for clients to fetch ICE config dynamically
app.get('/api/ice-servers', (req, res) => {
  res.json({ iceServers: getIceServers() });
});

// ── Serve React build in production ────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── WebSocket Server (Device Discovery) ────────────────────────────
const wss = new WebSocketServer({ noServer: true });

// Track connected peers: Map<peerId, { ws, info }>
const peers = new Map();

/**
 * Extract the real client IP from request headers.
 * Priority: CF-Connecting-IP > X-Forwarded-For > X-Real-IP > socket
 */
function getClientIp(req) {
  return req.headers['cf-connecting-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress;
}

/**
 * Hash an IP address into a short, privacy-safe network ID.
 * Peers sharing the same public IP (same LAN/WiFi) get the same networkId.
 */
function hashIp(ip) {
  if (!ip) return 'net-unknown';
  const hash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
  return 'net-' + hash;
}

function broadcastPeerList() {
  const peerList = [];
  for (const [id, peer] of peers) {
    peerList.push({
      peerId: id,
      deviceName: peer.info.deviceName,
      browser: peer.info.browser,
      os: peer.info.os,
      networkId: hashIp(peer.info.publicIp),
      status: 'online',
    });
  }

  const message = JSON.stringify({ type: 'peer-list', peers: peerList });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastToOthers(senderWs, data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws, req) => {
  const clientIp = getClientIp(req);
  let peerId = null;

  console.log(`[WS] New connection from ${clientIp}`);

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());

      switch (data.type) {
        case 'register': {
          peerId = data.peerId;
          const publicIp = clientIp;
          const networkId = hashIp(publicIp);

          peers.set(peerId, {
            ws,
            info: {
              deviceName: data.deviceName || 'Unknown Device',
              browser: data.browser || 'Unknown',
              os: data.os || 'Unknown',
              publicIp,
            },
          });

          console.log(`[WS] Peer registered: ${peerId} (${data.deviceName}) IP: ${publicIp} Network: ${networkId}`);

          // Send the client its own network ID so the frontend can group peers
          ws.send(JSON.stringify({
            type: 'self-network',
            networkId,
          }));

          // Send current peer list to the new peer
          broadcastPeerList();

          // Notify others about the new peer
          broadcastToOthers(ws, {
            type: 'peer-joined',
            peerId,
            deviceName: data.deviceName,
            browser: data.browser,
            os: data.os,
            networkId,
          });
          break;
        }

        case 'file-request': {
          // Forward file request to the target peer
          const targetPeer = peers.get(data.targetPeerId);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(JSON.stringify({
              type: 'file-request',
              fromPeerId: peerId,
              fromDeviceName: data.fromDeviceName || 'Unknown Device',
              transferId: data.transferId,
              fileName: data.fileName,
              fileSize: data.fileSize,
              fileType: data.fileType,
            }));
          }
          break;
        }

        case 'file-response': {
          // Forward accept/reject to the sender
          const senderPeer = peers.get(data.targetPeerId);
          if (senderPeer && senderPeer.ws.readyState === WebSocket.OPEN) {
            senderPeer.ws.send(JSON.stringify({
              type: 'file-response',
              fromPeerId: peerId,
              accepted: data.accepted,
            }));
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS] Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      console.log(`[WS] Peer disconnected: ${peerId}`);
      peers.delete(peerId);
      broadcastPeerList();
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Connection error:', err);
  });
});

// ── Heartbeat (detect stale connections) ───────────────────────────
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 5000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ── Get LAN IP ─────────────────────────────────────────────────────
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ── Start Server ───────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  // Capture the upgrade listener that ExpressPeerServer automatically attached
  const peerUpgradeListeners = server.listeners('upgrade').slice(0);
  server.removeAllListeners('upgrade');

  // Add our custom dispatcher
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname.startsWith('/peerjs')) {
      // Pass to PeerServer's listeners
      for (const listener of peerUpgradeListeners) {
        listener(request, socket, head);
      }
    } else {
      socket.destroy();
    }
  });

  const lanIp = getLanIp();
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║             🚀 LANShare P2P is running!          ║');
  console.log('  ╠═══════════════════════════════════════════════════╣');
  console.log(`  ║  Local:    http://localhost:${PORT}                 ║`);
  console.log(`  ║  Network:  http://${lanIp}:${PORT}           ║`);
  console.log('  ║                                                   ║');
  console.log('  ║  Open this URL on other devices in your LAN      ║');
  console.log('  ║  to start sharing files!                          ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log('');
});
