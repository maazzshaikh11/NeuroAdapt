# NeuroAdapt Backend — API Reference

> **Base URL:** `http://localhost:5001` (development)
>
> **Content-Type:** `application/json` for all requests and responses

---

## Summary

| # | Method | Endpoint | Auth | Purpose |
|---|--------|----------|------|---------|
| 1 | `GET` | `/health` | ❌ None | Health check |
| 2 | `POST` | `/api/simplify` | ⚡ Optional | Simplify text using AI |
| 3 | `GET` | `/api/profile` | 🔒 Required | Get user profile |
| 4 | `PUT` | `/api/profile` | 🔒 Required | Update user preferences |
| 5 | `GET` | `/api/usage` | 🔒 Required | Dashboard analytics |

---

## Authentication

Protected endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

> [!NOTE]
> Auth endpoints (register/login) are **not yet implemented**. For now, generate test tokens manually using `jsonwebtoken`.

### Auth Error Responses

| Code | Status | Meaning |
|------|--------|---------|
| `TOKEN_REQUIRED` | `401` | Missing or malformed Authorization header |
| `INVALID_TOKEN` | `401` | Token expired, bad signature, or malformed |
| `USER_NOT_FOUND` | `401` | Token valid but user deleted from DB |

---

## Endpoint 1 — Health Check

### `GET /health`

No authentication. Use to verify the server is running.

**Response** `200`
```json
{
  "success": true,
  "message": "NeuroAdapt API is running",
  "timestamp": "2026-06-18T05:40:01.632Z",
  "environment": "development"
}
```

---

## Endpoint 2 — Simplify Text

### `POST /api/simplify`

Core feature. Works for both **guests** (no token) and **authenticated users** (with token).

#### Rate Limits

| User Type | Limit |
|-----------|-------|
| Guest (no token) | 3 requests/day per IP |
| Authenticated user | 50 requests/day per user |
| IP rate limit | 20 requests/60 seconds |

#### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | `string` | ✅ Yes | — | Text to simplify (max 5000 chars) |
| `level` | `string` | ❌ No | `"standard"` | `"basic"` \| `"standard"` \| `"academic"` |
| `hostname` | `string` | ❌ No | `"unknown"` | Domain name where the action occurred |

**Example Request**
```bash
curl -X POST http://localhost:5001/api/simplify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The mitochondria is the powerhouse of the cell.",
    "level": "basic",
    "hostname": "en.wikipedia.org"
  }'
```

#### Success Response `200`

```json
{
  "success": true,
  "simplifiedText": "The mitochondria gives the cell energy.",
  "cacheHit": false,
  "latencyMs": 513,
  "provider": "groq"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `simplifiedText` | `string` | The AI-simplified text |
| `cacheHit` | `boolean` | `true` if served from cache, `false` if live AI call |
| `latencyMs` | `number` | Response time in ms (`0` for cache hits) |
| `provider` | `string` | AI provider used (`"groq"`) |

#### Cache Hit Response `200`

Same request sent again returns instantly from cache:

```json
{
  "success": true,
  "simplifiedText": "The mitochondria gives the cell energy.",
  "cacheHit": true,
  "latencyMs": 0,
  "provider": "groq"
}
```

#### Error Responses

| Code | Status | Cause |
|------|--------|-------|
| `VALIDATION_MISSING_FIELD` | `400` | `text` is missing, empty, or not a string |
| `AI_INPUT_TOO_LONG` | `400` | `text` exceeds 5000 characters |
| `INVALID_SIMPLIFICATION_LEVEL` | `400` | `level` is not `basic`, `standard`, or `academic` |
| `GUEST_LIMIT_REACHED` | `429` | Guest exceeded 3 requests/day |
| `RATE_LIMIT` | `429` | Authenticated user exceeded 50 requests/day |
| `SERVER_ERROR` | `500` | Internal error (AI service down, DB failure) |

---

## Endpoint 3 — Get Profile

### `GET /api/profile`

Returns the authenticated user's profile data.

**Example Request**
```bash
curl http://localhost:5001/api/profile \
  -H "Authorization: Bearer <jwt_token>"
```

#### Success Response `200`

```json
{
  "success": true,
  "user": {
    "id": "6651abc123def456ghi789",
    "email": "user@example.com",
    "displayName": "Jane Doe",
    "preferences": {
      "simplificationLevel": "standard",
      "fontFamily": "default",
      "colorTheme": "light",
      "fontSize": 16,
      "lineSpacing": 1.5,
      "bionicModeEnabled": false,
      "focusModeEnabled": false
    },
    "profileType": "general",
    "totalSimplifications": 42
  }
}
```

> [!IMPORTANT]
> `passwordHash` and `__v` are **never** returned. The backend strips them at both the query and serialization layers.

---

## Endpoint 4 — Update Preferences

### `PUT /api/profile`

Updates the authenticated user's accessibility preferences. **Only the `preferences` object is accepted** — any other top-level keys are rejected.

#### Request Body

```json
{
  "preferences": {
    "fontSize": 20,
    "colorTheme": "dark",
    "bionicModeEnabled": true
  }
}
```

> [!TIP]
> You can send a **partial** preferences object. Only the fields you include will be updated — the rest remain unchanged (merge, not replace).

#### Allowed Preference Fields

| Field | Type | Allowed Values |
|-------|------|---------------|
| `simplificationLevel` | `string` | `"basic"` \| `"standard"` \| `"academic"` |
| `fontFamily` | `string` | `"default"` \| `"openDyslexic"` |
| `colorTheme` | `string` | `"light"` \| `"dark"` \| `"yellow"` \| `"cream"` |
| `fontSize` | `number` | `12` – `28` |
| `lineSpacing` | `number` | `1.0` – `2.5` |
| `bionicModeEnabled` | `boolean` | `true` \| `false` |
| `focusModeEnabled` | `boolean` | `true` \| `false` |

#### Success Response `200`

```json
{
  "success": true,
  "preferences": {
    "simplificationLevel": "standard",
    "fontFamily": "default",
    "colorTheme": "dark",
    "fontSize": 20,
    "lineSpacing": 1.5,
    "bionicModeEnabled": true,
    "focusModeEnabled": false
  }
}
```

#### Rejected Fields

These fields **cannot** be updated via this endpoint:

- `email`
- `passwordHash`
- `profileType`
- `totalSimplifications`

#### Error Responses

| Code | Status | Cause |
|------|--------|-------|
| `INVALID_PREFERENCE_VALUE` | `400` | Unknown field, out-of-range value, or forbidden field in body |

---

## Endpoint 5 — Usage Analytics

### `GET /api/usage`

Returns dashboard analytics for the authenticated user.

#### Query Parameters

| Param | Type | Required | Default | Allowed |
|-------|------|----------|---------|---------|
| `period` | `string` | ❌ No | `"7d"` | `"7d"` \| `"30d"` |

**Example Request**
```bash
curl "http://localhost:5001/api/usage?period=7d" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Success Response `200`

```json
{
  "success": true,
  "period": "7d",
  "totalSimplifications": 6,
  "cacheHitRate": 33,
  "topDomains": [
    { "hostname": "en.wikipedia.org", "count": 3 },
    { "hostname": "github.com", "count": 2 },
    { "hostname": "reddit.com", "count": 1 }
  ],
  "dailyUsage": [
    { "date": "2026-06-12", "count": 0 },
    { "date": "2026-06-13", "count": 0 },
    { "date": "2026-06-14", "count": 0 },
    { "date": "2026-06-15", "count": 1 },
    { "date": "2026-06-16", "count": 0 },
    { "date": "2026-06-17", "count": 3 },
    { "date": "2026-06-18", "count": 2 }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `totalSimplifications` | `number` | Total simplify events in the period |
| `cacheHitRate` | `number` | Percentage (0–100), rounded to nearest integer |
| `topDomains` | `array` | Top 5 domains, sorted by count descending |
| `dailyUsage` | `array` | One entry per day, zero-filled for days with no activity |

#### Error Responses

| Code | Status | Cause |
|------|--------|-------|
| `INVALID_PERIOD` | `400` | `period` is not `"7d"` or `"30d"` |

---

## Global Error Format

All error responses follow this shape:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable description (optional)"
}
```

> [!IMPORTANT]
> Stack traces are **never** leaked. In production, the `message` field contains a generic string. The `code` field is always machine-readable for frontend switch/case handling.

---

## CORS

The backend accepts requests from origins configured in `ALLOWED_ORIGINS`:

```
chrome-extension://<EXTENSION_ID>,http://localhost:3000
```

The frontend team should ensure requests come from a whitelisted origin.
