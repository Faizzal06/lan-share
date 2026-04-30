import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';

/**
 * Custom hook for PeerJS connection management.
 * Creates a Peer instance connected to the local PeerServer,
 * manages data connections, and handles incoming connections.
 */
export function usePeer() {
  const [peerId, setPeerId] = useState(null);
  const [peerStatus, setPeerStatus] = useState('connecting'); // connecting | connected | error
  const peerRef = useRef(null);
  const connectionsRef = useRef(new Map()); // peerId -> DataConnection
  const onDataHandlerRef = useRef(null);
  const onConnectionHandlerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function initPeer() {
      // Fetch ICE server configuration (STUN + TURN) from the server
      let iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];

      try {
        const res = await fetch('/api/ice-servers');
        if (res.ok) {
          const data = await res.json();
          if (data.iceServers?.length) {
            iceServers = data.iceServers;
          }
        }
      } catch (err) {
        console.warn('[Peer] Failed to fetch ICE servers, using defaults:', err);
      }

      if (cancelled) return;

      console.log('[Peer] Using ICE servers:', iceServers.map(s => s.urls));

      const peer = new Peer({
        host: window.location.hostname,
        port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        secure: window.location.protocol === 'https:',
        config: {
          iceServers,
        },
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        setPeerStatus('connected');
        console.log('[Peer] Connected with ID:', id);
      });

      peer.on('connection', (conn) => {
        console.log('[Peer] Incoming connection from:', conn.peer);
        setupConnection(conn);
        if (onConnectionHandlerRef.current) {
          onConnectionHandlerRef.current(conn);
        }
      });

      peer.on('error', (err) => {
        console.error('[Peer] Error:', err);
        if (err.type === 'unavailable-id' || err.type === 'server-error') {
          setPeerStatus('error');
        }
      });

      peer.on('disconnected', () => {
        console.log('[Peer] Disconnected from server, reconnecting...');
        setPeerStatus('connecting');
        peer.reconnect();
      });
    }

    initPeer();

    return () => {
      cancelled = true;
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  function setupConnection(conn) {
    conn.on('open', () => {
      connectionsRef.current.set(conn.peer, conn);
      console.log('[Peer] Data channel open with:', conn.peer);
    });

    conn.on('data', (data) => {
      if (onDataHandlerRef.current) {
        onDataHandlerRef.current(conn.peer, data);
      }
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      console.log('[Peer] Connection closed with:', conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[Peer] Connection error with', conn.peer, ':', err);
    });
  }

  /**
   * Connect to a remote peer by their PeerJS ID.
   * Returns a promise that resolves when the connection is open.
   */
  const connectToPeer = useCallback((remotePeerId) => {
    return new Promise((resolve, reject) => {
      const peer = peerRef.current;
      if (!peer) return reject(new Error('Peer not initialized'));

      // Reuse existing connection if open
      const existing = connectionsRef.current.get(remotePeerId);
      if (existing?.open) {
        return resolve(existing);
      }

      const conn = peer.connect(remotePeerId, {
        serialization: 'binary',
        reliable: true,
      });

      conn.on('open', () => {
        setupConnection(conn);
        connectionsRef.current.set(remotePeerId, conn);
        resolve(conn);
      });

      conn.on('error', (err) => {
        reject(err);
      });

      // Timeout after 30 seconds (increased for TURN relay connections)
      setTimeout(() => {
        if (!conn.open) {
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }, []);

  /**
   * Send data to a specific peer.
   */
  const sendToPeer = useCallback((remotePeerId, data) => {
    const conn = connectionsRef.current.get(remotePeerId);
    if (conn?.open) {
      conn.send(data);
      return true;
    }
    return false;
  }, []);

  /**
   * Set the handler for incoming data from any peer.
   */
  const onData = useCallback((handler) => {
    onDataHandlerRef.current = handler;
  }, []);

  /**
   * Set the handler for new incoming connections.
   */
  const onConnection = useCallback((handler) => {
    onConnectionHandlerRef.current = handler;
  }, []);

  /**
   * Get or create a connection to a peer.
   */
  const getConnection = useCallback((remotePeerId) => {
    return connectionsRef.current.get(remotePeerId);
  }, []);

  return {
    peerId,
    peerStatus,
    connectToPeer,
    sendToPeer,
    onData,
    onConnection,
    getConnection,
    connectionsRef,
  };
}
