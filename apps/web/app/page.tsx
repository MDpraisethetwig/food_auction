'use client';

import { formatMoney } from '@food-auction/shared';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  byCategory,
  daily,
  hero,
  liveAuctions,
  missedPickups,
  orders,
  restaurant,
  statusText,
  unsoldByHour,
} from './demo-data';

const chart = { forest: '#1e4d3b', clay: '#b4472a', sun: '#e8b04a', line: '#e4dccb', muted: '#5e6b60' };
const axis = { fontSize: 12, stroke: chart.muted, tickLine: false, axisLine: false };

const opened = Date.now();

const timeLeft = (minutes: number, now: number) => {
  const seconds = Math.max(0, Math.floor((opened + minutes * 60000 - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function Sidebar() {
  return (
    <aside className="sidebar">
      <img className="wordmark" src="/logo-reversed.svg" alt="Full for Less" />
      <nav className="nav">
        <a className="active" href="#overview">Overview</a>
        <a href="#auctions">Live auctions</a>
        <a href="#orders">Orders</a>
        <a href="#pickup">Pickup code</a>
      </nav>
      <div className="kitchen">
        <strong>{restaurant.name}</strong>
        <span>{restaurant.address}</span>
      </div>
    </aside>
  );
}

export default function Home() {
  const [qr, setQr] = useState('');
  const [reviews, setReviews] = useState(missedPickups);
  const [now, setNow] = useState(opened);

  useEffect(() => {
    void QRCode.toDataURL('lastcall-demo-pickup', {
      width: 360,
      margin: 1,
      color: { dark: chart.forest, light: '#fffcf5' },
    }).then(setQr);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = (id: string) => setReviews((current) => current.filter((listing) => listing.id !== id));

  return (
    <div className="shell">
      <Sidebar />
      <main className="page" id="overview">
        <div className="topbar">
          <div>
            <div className="eyebrow">Tonight's kitchen</div>
            <h1>{restaurant.name}</h1>
          </div>
          <span className="live">{liveAuctions.length} auctions live</span>
        </div>

        <section className="hero">
          <div className="hero-main">
            <div className="eyebrow">Money recovered, last 30 days</div>
            <div className="hero-value">
              ${(hero.recoveredCents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
            </div>
            <div className="hero-note">{hero.sellThrough}% of listed food sold instead of binned</div>
          </div>
          <div className="hero-stat"><strong>{hero.meals}</strong><span>Meals rescued</span></div>
          <div className="hero-stat"><strong>{hero.kgSaved} kg</strong><span>Food saved</span></div>
          <div className="hero-stat"><strong>{hero.co2Kg} kg</strong><span>CO₂e avoided</span></div>
        </section>

        {reviews.length > 0 && (
          <section className="card attention">
            <h2>Needs you</h2>
            {reviews.map((listing) => (
              <div className="row" key={listing.id}>
                <div className="grow">
                  <div className="title">{listing.title}</div>
                  <div className="warning">{listing.buyer} missed pickup. Is this food still safe to sell?</div>
                </div>
                <div className="actions">
                  <button onClick={() => dismiss(listing.id)}>Re-auction</button>
                  <button className="secondary" onClick={() => dismiss(listing.id)}>Discard</button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="grid two">
          <div className="card">
            <h2>Money recovered, last 14 days</h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="recovered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.forest} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={chart.forest} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.line} vertical={false} />
                <XAxis dataKey="label" minTickGap={28} {...axis} />
                <YAxis tickFormatter={(value) => `$${value}`} width={44} {...axis} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Recovered']} />
                <Area
                  dataKey="dollars"
                  fill="url(#recovered)"
                  isAnimationActive={false}
                  stroke={chart.forest}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2>What sells and what doesn't</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory}>
                <CartesianGrid stroke={chart.line} vertical={false} />
                <XAxis dataKey="category" {...axis} />
                <YAxis allowDecimals={false} width={32} {...axis} />
                <Tooltip cursor={{ fill: 'rgba(30,77,59,0.06)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="sold" name="Sold" stackId="items" fill={chart.forest} isAnimationActive={false} />
                <Bar
                  dataKey="unsold"
                  name="Unsold"
                  stackId="items"
                  fill={chart.clay}
                  isAnimationActive={false}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid split">
          <div className="card">
            <h2 id="auctions">Live auctions</h2>
            {liveAuctions.map((listing) => (
              <div className="row" key={listing.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="thumb" src={listing.image} />
                <div className="grow">
                  <div className="title">{listing.title}</div>
                  <div className="muted">{listing.bids === 0 ? 'No bids yet' : `${listing.bids} bids`}</div>
                </div>
                <div className="center">
                  <div className="price">{formatMoney(listing.priceCents)}</div>
                  <div className="timer">{timeLeft(listing.minutes, now)}</div>
                </div>
              </div>
            ))}
            <h2 className="section-gap" id="orders">Recent orders</h2>
            {orders.map((order) => (
              <div className="row" key={order.id}>
                <div className="grow">
                  <div className="title">{order.title}</div>
                  <div className="muted">{order.buyer} · {formatMoney(order.amountCents)}</div>
                </div>
                <span className={`badge ${order.status}`}>{statusText[order.status]}</span>
              </div>
            ))}
          </div>
          <div className="stack">
            <div className="card" id="pickup">
              <h2>Pickup code</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img className="qr" src={qr} alt="Pickup QR code" />}
              <p className="muted center">Keep this at the counter. Customers scan it to confirm pickup.</p>
            </div>
            <div className="card">
              <h2>When food goes unsold</h2>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={unsoldByHour}>
                  <XAxis dataKey="label" minTickGap={16} {...axis} />
                  <YAxis allowDecimals={false} width={28} {...axis} />
                  <Tooltip cursor={{ fill: 'rgba(30,77,59,0.06)' }} />
                  <Bar
                    dataKey="unsold"
                    name="Unsold"
                    fill={chart.sun}
                    isAnimationActive={false}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
