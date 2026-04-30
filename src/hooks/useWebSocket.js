import { useEffect, useRef, useState, useCallback } from 'react';
import { getDeviceInfo } from '../utils/deviceInfo';

/**
 * Custom hook for WebSocket-based device discovery.
 * Connects to the signaling server and manages the list of online peers.
 */
export function useWebSocket(peerId) {
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selfNetworkId, setSelfNetworkId] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!peerId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      const { deviceName, browser, os } = getDeviceInfo();

      ws.send(JSON.stringify({
        type: 'register',
        peerId,
        deviceName,
        browser,
        os,
      }));

      console.log('[WS] Connected and registered as', peerId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'self-network':
            setSelfNetworkId(data.networkId);
            break;

          case 'peer-list':
            // Filter out ourselves
            setPeers(data.peers.filter(p => p.peerId !== peerId));
            break;

          case 'peer-joined':
            if (data.peerId !== peerId) {
              setPeers(prev => {
                const exists = prev.some(p => p.peerId === data.peerId);
                if (exists) return prev;
                return [...prev, {
                  peerId: data.peerId,
                  deviceName: data.deviceName,
                  browser: data.browser,
                  os: data.os,
                  networkId: data.networkId,
                  status: 'online',
                }];
              });
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected. Reconnecting in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }, [peerId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Expose the raw ws for forwarding file-request / file-response signals
  const sendSignal = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Listen for arbitrary message types (file-request, file-response)
  const onMessage = useCallback((handler) => {
    const listener = (event) => {
      try {
        const data = JSON.parse(event.data);
        handler(data);
      } catch { /* ignore non-JSON */ }
    };

    const ws = wsRef.current;
    if (ws) {
      ws.addEventListener('message', listener);
      return () => ws.removeEventListener('message', listener);
    }
    return () => {};
  }, []);

  return { peers, connected, selfNetworkId, sendSignal, onMessage, wsRef };
}
