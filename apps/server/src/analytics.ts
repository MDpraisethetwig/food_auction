import { pool } from './db.js';

const sale = `o.status IN ('awaiting_pickup', 'picked_up')`;

export async function restaurantAnalytics(restaurantId: string) {
  const totals = await pool.query(
    `SELECT
       count(DISTINCT l.id)::int AS listed,
       count(DISTINCT l.id) FILTER (WHERE ${sale})::int AS sold,
       count(DISTINCT l.id) FILTER (WHERE l.status IN ('unsold', 'closed'))::int AS unsold,
       COALESCE(sum(o.amount_cents) FILTER (WHERE ${sale}), 0)::int AS recovered_cents,
       count(o.id) FILTER (WHERE o.status = 'no_show')::int AS no_shows
     FROM listings l
     LEFT JOIN orders o ON o.listing_id = l.id
     WHERE l.restaurant_id = $1 AND l.status NOT IN ('active', 'closing')`,
    [restaurantId],
  );
  const daily = await pool.query(
    `SELECT to_char(d.day, 'Mon DD') AS label,
       COALESCE(sum(o.amount_cents), 0)::int AS cents,
       count(o.id)::int AS sold
     FROM generate_series(current_date - 13, current_date, interval '1 day') AS d(day)
     LEFT JOIN (
       SELECT o.* FROM orders o JOIN listings l ON l.id = o.listing_id
       WHERE l.restaurant_id = $1 AND ${sale}
     ) o ON o.created_at::date = d.day::date
     GROUP BY d.day ORDER BY d.day`,
    [restaurantId],
  );
  const byCategory = await pool.query(
    `SELECT l.category,
       count(DISTINCT l.id) FILTER (WHERE ${sale})::int AS sold,
       count(DISTINCT l.id) FILTER (WHERE l.status IN ('unsold', 'closed'))::int AS unsold
     FROM listings l
     LEFT JOIN orders o ON o.listing_id = l.id
     WHERE l.restaurant_id = $1 AND l.status NOT IN ('active', 'closing')
     GROUP BY l.category ORDER BY count(DISTINCT l.id) DESC`,
    [restaurantId],
  );
  const unsoldByHour = await pool.query(
    `SELECT extract(hour FROM ends_at)::int AS hour, count(*)::int AS unsold
     FROM listings
     WHERE restaurant_id = $1 AND status IN ('unsold', 'closed')
     GROUP BY hour ORDER BY hour`,
    [restaurantId],
  );

  const summary = totals.rows[0];
  return {
    listed: summary.listed,
    sold: summary.sold,
    unsold: summary.unsold,
    noShows: summary.no_shows,
    recoveredCents: summary.recovered_cents,
    sellThrough: summary.listed ? summary.sold / summary.listed : 0,
    daily: daily.rows,
    byCategory: byCategory.rows,
    unsoldByHour: unsoldByHour.rows,
  };
}
