import Constants from 'expo-constants';
import { File } from 'expo-file-system';

// A phone reaches the API on the same machine that serves the app, so reuse the Expo host.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost}:4000`;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const authHeaders = (): Record<string, string> =>
  authToken ? { Authorization: `Bearer ${authToken}` } : {};

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export async function get<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`${API_URL}${path}`, { headers: authHeaders() }));
}

export async function post<T>(path: string, body: object = {}): Promise<T> {
  return parse<T>(await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }));
}

async function upload<T>(path: string, field: string, uri: string): Promise<T> {
  const form = new FormData();
  form.append(field, new File(uri));
  return parse<T>(await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  }));
}

export const uploadPhoto = <T>(uri: string) => upload<T>('/listings/draft', 'photo', uri);

export const uploadVoice = <T>(uri: string) => upload<T>('/ai/transcribe', 'voice', uri);

export const photoSource = (photoUrl: string | null) =>
  photoUrl ? { uri: `${API_URL}${photoUrl}` } : undefined;

export const socketUrl = () =>
  `${API_URL.replace(/^http/, 'ws')}/ws${authToken ? `?token=${authToken}` : ''}`;
