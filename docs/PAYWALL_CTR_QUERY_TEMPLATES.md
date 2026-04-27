# Paywall CTR Query Templates

Use these templates to compare paywall conversion by mode:

$$
CTR_{mode} = \frac{\text{paywall\_cta\_clicked}}{\text{paywall\_viewed}}
$$

Expected modes:

- `celebratory`
- `escalation`
- `urgency`

---

## 1) PostgreSQL template (generic analytics table)

Assumes an events table with columns similar to:

- `event` (text)
- `mode` (text)
- `trigger_label` (text)
- `surface` (text)
- `created_at` (timestamp)

If your column names differ, rename accordingly.

```sql
WITH paywall AS (
  SELECT
    mode,
    event,
    created_at
  FROM analytics_events
  WHERE event IN ('paywall_viewed', 'paywall_cta_clicked')
    AND surface = 'pressure_paywall'
    -- Optional time window:
    -- AND created_at >= NOW() - INTERVAL '30 days'
),
agg AS (
  SELECT
    mode,
    COUNT(*) FILTER (WHERE event = 'paywall_viewed') AS views,
    COUNT(*) FILTER (WHERE event = 'paywall_cta_clicked') AS clicks
  FROM paywall
  GROUP BY mode
)
SELECT
  mode,
  views,
  clicks,
  CASE
    WHEN views = 0 THEN 0
    ELSE ROUND((clicks::numeric / views::numeric) * 100, 2)
  END AS ctr_percent
FROM agg
ORDER BY ctr_percent DESC;
```

---

## 2) PostgreSQL template (JSON payload events)

If events are stored in JSON (for example `payload jsonb`) and mode is nested:

```sql
WITH paywall AS (
  SELECT
    payload->>'mode' AS mode,
    payload->>'event' AS event,
    created_at
  FROM analytics_events
  WHERE payload->>'event' IN ('paywall_viewed', 'paywall_cta_clicked')
    AND payload->>'surface' = 'pressure_paywall'
    -- Optional time window:
    -- AND created_at >= NOW() - INTERVAL '30 days'
),
agg AS (
  SELECT
    mode,
    COUNT(*) FILTER (WHERE event = 'paywall_viewed') AS views,
    COUNT(*) FILTER (WHERE event = 'paywall_cta_clicked') AS clicks
  FROM paywall
  WHERE mode IN ('celebratory', 'escalation', 'urgency')
  GROUP BY mode
)
SELECT
  mode,
  views,
  clicks,
  CASE
    WHEN views = 0 THEN 0
    ELSE ROUND((clicks::numeric / views::numeric) * 100, 2)
  END AS ctr_percent
FROM agg
ORDER BY ctr_percent DESC;
```

---

## 3) Trigger-label split (mode + trigger)

If you want finer granularity by both mode and trigger label:

```sql
WITH paywall AS (
  SELECT
    mode,
    trigger_label,
    event
  FROM analytics_events
  WHERE event IN ('paywall_viewed', 'paywall_cta_clicked')
    AND surface = 'pressure_paywall'
)
SELECT
  mode,
  trigger_label,
  COUNT(*) FILTER (WHERE event = 'paywall_viewed') AS views,
  COUNT(*) FILTER (WHERE event = 'paywall_cta_clicked') AS clicks,
  CASE
    WHEN COUNT(*) FILTER (WHERE event = 'paywall_viewed') = 0 THEN 0
    ELSE ROUND(
      (
        COUNT(*) FILTER (WHERE event = 'paywall_cta_clicked')::numeric /
        COUNT(*) FILTER (WHERE event = 'paywall_viewed')::numeric
      ) * 100,
      2
    )
  END AS ctr_percent
FROM paywall
GROUP BY mode, trigger_label
ORDER BY ctr_percent DESC;
```

---

## 4) Quick interpretation

- Higher CTR means that trigger mode drives stronger upgrade intent.
- If `urgency` CTR is high but views are low, route more traffic to recovery-trigger moments.
- If `celebratory` CTR is low, test CTA framing after first win.
