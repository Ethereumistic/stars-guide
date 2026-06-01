# Public Queries — Paywall Logic and Data Access

Source: `convex/horoscopes/queries.ts`

Public queries serve horoscope data to the frontend. They enforce two
access gates: **status filtering** and **date-based paywall**.

## Status Filtering

Only horoscopes with `status === "generated"` or `status === "overridden"`
are exposed to the public. Records that are `"pending"` or `"failed"`
return `null`. This ensures readers never see placeholder content.

## Content Stripping (Paywall Enforcement)

When a user's tier does not grant access to a horoscope's content, the public queries strip the `content` field from the response rather than omitting the record entirely:

- **`getPublished`** and **`getTodayForSign`** return partial objects with `content: undefined` when the date-based paywall blocks access. The record's metadata (sign, date, status, etc.) is still returned so the frontend can render a paywall prompt with the correct sign and date context.
- **`getAllSignsForDate`** explicitly sets `content: undefined` for each paywalled entry in the returned array, allowing the frontend to show all 12 sign cards with upgrade prompts rather than hiding unavailable signs.

This ensures the frontend always has enough information to render the paywall UI (sign name, date, required tier) without exposing the actual horoscope text.

## Date-Based Paywall

Access to past/future horoscopes is gated by user tier:

| Tier | Date Range | Description |
|------|-------------|-------------|
| `free` | Today only | `diff === 0` — single day access |
| `popular` | ±1 day | Yesterday, today, tomorrow |
| `premium` | ±7 days | Full week window |

Calculation: `diff = differenceInDays(targetDate, today)`. Negative = past,
positive = future.

### Paywall Response

When a user's tier doesn't allow access to the requested date:

```json
{
  "isPaywalled": true,
  "requiredTier": "popular",
  "date": "2025-07-13",
  "sign": "Aries",
  "content": undefined
}
```

The frontend checks `isPaywalled` and shows an upgrade prompt instead of
content.

### Full Access Response

When allowed:

```json
{
  "isPaywalled": false,
  ...horoscopeRecord
}
```

The full record (including `content`) is returned.

## Queries

### `getPublished`

```
Args: { sign: string, date: string }
Returns: horoscope record (with paywall) | null
```

Looks up by `by_date_sign` index. Returns null if no record exists or if
status is not generated/overridden. Applies paywall.

### `getTodayForSign`

```
Args: { sign: string }
Returns: horoscope record (with paywall) | null
```

Convenience query — resolves today's date automatically and calls the same
logic as `getPublished`. Uses `startOfDay(new Date())` for today's date.

### `getAllSignsForDate`

```
Args: { date: string }
Returns: array of horoscope records (each individually paywalled)
```

Fetches all records for a date via `by_date` index. Filters to
generated/overridden, then applies paywall per-record. Signs that haven't
been generated yet are simply omitted from the array.

## Tier Resolution

User tier is determined from the authenticated user's `tier` field:

```typescript
const userId = await getAuthUserId(ctx);
const user = userId ? await ctx.db.get(userId) : null;
const userTier: Tier = (user?.tier as Tier) ?? "free";
```

Unauthenticated users default to `"free"` (today-only access).