'use client';

import { formatMoney, type Listing, type Order } from '@food-auction/shared';
import QRCode from 'qrcode';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'lastcall-token';

interface Dashboard {
  restaurant: { id: string; name: string; pickupToken: string };
  listings: Listing[];
  orders: Order[];
  analytics: {
    listed: number;
    sold: number;
    unsold: number;
    noShows: number;
    recoveredCents: number;
    sellThrough: number;
    daily: { label: string; cents: number; sold: number }[];
    byCategory: { category: string; sold: number; unsold: number }[];
    unsoldByHour: { hour: number; unsold: number }[];
  };
}

async function api<T>(path: string, token: string | null, body?: object): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

function Login({ onToken }: { onToken: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/auth/login', null, { email, password });
      onToken(token);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <h1>LastCall</h1>
      <p className="muted">Sign in to your restaurant.</p>
      {error && <p className="error">{error}</p>}
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Sign in</button>
    </form>
  );
}

const statusText: Record<Order['status'], string> = {
  awaiting_pickup: 'Awaiting pickup',
  picked_up: 'Picked up',
  no_show: 'No-show',
  payment_failed: 'Payment failed',
};

function DashboardView({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Dashboard>('/restaurant/dashboard', token));
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const socket = new WebSocket(`${API.replace(/^http/, 'ws')}/ws?token=${token}`);
    socket.onmessage = () => void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      socket.close();
      clearInterval(timer);
    };
  }, [load, token]);

  const pickupToken = data?.restaurant.pickupToken;
  useEffect(() => {
    if (pickupToken) void QRCode.toDataURL(pickupToken, { width: 360, margin: 1 }).then(setQr);
  }, [pickupToken]);

  async function review(id: string, stillSafe: boolean) {
    await api(`/listings/${id}/review`, token, { stillSafe });
    await load();
  }

  if (!data) return <div className="page">{error ? <p className="error">{error}</p> : 'Loading...'}</div>;
  const { analytics } = data;
  const reviews = data.listings.filter((listing) => listing.status === 'no_show_review');
  const live = data.listings.filter((listing) => listing.status !== 'no_show_review');

  return (
    <main className="page">
      <div className="topbar">
        <div>
          <h1>{data.restaurant.name}</h1>
          <span className="muted">Live dashboard</span>
        </div>
        <button className="secondary" onClick={onSignOut}>Sign out</button>
      </div>

      {reviews.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>Missed pickups</h2>
          {reviews.map((listing) => (
            <div className="row" key={listing.id}>
              <div>
                <strong>{listing.title}</strong>
                <div className="warning">Is this food still safe to sell?</div>
              </div>
              <div className="actions">
                <button onClick={() => review(listing.id, true)}>Re-auction</button>
                <button className="secondary" onClick={() => review(listing.id, false)}>Discard</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="grid stats">
        <div className="card"><span className="muted">Money recovered</span><div className="stat">{formatMoney(analytics.recoveredCents)}</div></div>
        <div className="card"><span className="muted">Sell-through</span><div className="stat">{Math.round(analytics.sellThrough * 100)}%</div></div>
        <div className="card"><span className="muted">Items sold</span><div className="stat">{analytics.sold}</div></div>
        <div className="card"><span className="muted">Unsold</span><div className="stat">{analytics.unsold}</div></div>
        <div className="card"><span className="muted">No-shows</span><div className="stat">{analytics.noShows}</div></div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Money recovered, last 14 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.daily.map((day) => ({ ...day, dollars: day.cents / 100 }))}>
              <CartesianGrid stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="label" fontSize={12} minTickGap={24} />
              <YAxis fontSize={12} tickFormatter={(value) => `$${value}`} width={44} />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Recovered']} />
              <Line dataKey="dollars" stroke="#1f7a55" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>What sells and what doesn't</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.byCategory}>
              <CartesianGrid stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="category" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} width={32} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sold" name="Sold" stackId="items" fill="#1f7a55" />
              <Bar dataKey="unsold" name="Unsold" stackId="items" fill="#c98a5e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>Live auctions</h2>
          {live.length === 0 && <p className="muted">Nothing live right now.</p>}
          {live.map((listing) => (
            <div className="row" key={listing.id}>
              <span>{listing.title}</span>
              <span className="badge">
                {listing.currentBidCents === null ? 'No bids yet' : formatMoney(listing.currentBidCents)}
              </span>
            </div>
          ))}
          <h2 style={{ marginTop: 20 }}>Recent orders</h2>
          {data.orders.slice(0, 8).map((order) => (
            <div className="row" key={order.id}>
              <span>{order.title}</span>
              <span className="badge">{formatMoney(order.amountCents)} · {statusText[order.status]}</span>
            </div>
          ))}
        </div>
        <div className="grid">
          <div className="card">
            <h2>Pickup QR code</h2>
            {qr && <img className="qr" src={qr} alt="Pickup QR code" />}
            <p className="muted">Keep this at the counter. Customers scan it to confirm pickup.</p>
          </div>
          <div className="card">
            <h2>When food goes unsold</h2>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={analytics.unsoldByHour.map((row) => ({ ...row, label: `${row.hour}:00` }))}>
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} width={32} />
                <Tooltip />
                <Bar dataKey="unsold" name="Unsold" fill="#c98a5e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!token) {
    return (
      <Login
        onToken={(value) => {
          localStorage.setItem(TOKEN_KEY, value);
          setToken(value);
        }}
      />
    );
  }
  return (
    <DashboardView
      token={token}
      onSignOut={() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }}
    />
  );
}
