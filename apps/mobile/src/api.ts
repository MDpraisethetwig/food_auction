export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

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

export async function uploadPhoto<T>(uri: string): Promise<T> {
  const form = new FormData();
  form.append('photo', { uri, name: 'food.jpg', type: 'image/jpeg' } as unknown as Blob);
  return parse<T>(await fetch(`${API_URL}/listings/draft`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  }));
}

export const photoSource = (photoUrl: string | null) =>
  photoUrl ? { uri: `${API_URL}${photoUrl}` } : undefined;

export const socketUrl = () =>
  `${API_URL.replace(/^http/, 'ws')}/ws${authToken ? `?token=${authToken}` : ''}`;
