import type { ServerEvent, User } from '@food-auction/shared';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { get, setAuthToken, socketUrl } from './api';

const TOKEN_KEY = 'lastcall-token';

type Listener = (event: ServerEvent) => void;

interface Session {
  user: User | null;
  ready: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  subscribe: (listener: Listener) => () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        try {
          setUser(await get<User>('/me'));
        } catch {
          setAuthToken(null);
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closed = false;
    const connect = () => {
      socket = new WebSocket(socketUrl());
      socket.onmessage = (message) => {
        const event = JSON.parse(String(message.data)) as ServerEvent;
        listeners.current.forEach((listener) => listener(event));
      };
      socket.onclose = () => {
        if (!closed) setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      closed = true;
      socket?.close();
    };
  }, [user?.id]);

  const signIn = useCallback(async (token: string, nextUser: User) => {
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, setUser, subscribe }),
    [user, ready, signIn, signOut, subscribe],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is missing');
  return session;
}

export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function timeLeft(iso: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
