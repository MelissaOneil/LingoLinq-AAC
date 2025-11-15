# LingoLinq API Documentation

**Version:** 1.0
**Base URL:** `https://your-domain.com/api/v1/`
**Last Updated:** November 2025

Complete REST API reference for the LingoLinq AAC (Augmentative and Alternative Communication) platform.

---

## Table of Contents

- [Authentication](#authentication)
- [Response Format](#response-format)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [Core Resources](#core-resources)
  - [Boards](#boards)
  - [Users](#users)
  - [Organizations](#organizations)
  - [Logs](#logs)
- [Media Resources](#media-resources)
  - [Images](#images)
  - [Sounds](#sounds)
  - [Videos](#videos)
- [Search](#search)
- [Webhooks](#webhooks)
- [WebSocket API](#websocket-api)
- [Additional Resources](#additional-resources)
- [Rate Limiting](#rate-limiting)

---

## Authentication

Most API endpoints require authentication via Bearer token.

### Token Formats

**Header (recommended):**
```http
Authorization: Bearer YOUR_API_TOKEN
```

**Query Parameter:**
```http
GET /api/v1/boards?access_token=YOUR_API_TOKEN
```

### Token Types

| Type | Description | Access Level |
|------|-------------|--------------|
| **Standard Token** | Full access to authorized resources | Read/Write |
| **Valet Token** | Read-only access, restricted operations | Read-only |
| **Temporary Token** | Short-lived for specific operations | Limited |

### Permission Levels

Endpoints check permissions against these levels:

| Permission | Description |
|-----------|-------------|
| `view_existence` | Can verify resource exists |
| `view` | Can view resource details |
| `supervise` | Can view/manage supervisee data |
| `edit` | Can modify resource |
| `model` | Can create logs/sessions for user |
| `delete` | Can delete resource |
| `admin_support_actions` | Admin-level operations |

### Special Headers

| Header | Purpose |
|--------|---------|
| `X-CoughDrop-Version` | Client version date (YYYY-MM-DD format) |
| `X-As-User-Id` | Masquerade as user (admin/manager only) |
| `X-Logging-Code-For-{user_id}` | Override logging cutoff restrictions |
| `X-SUPPORTS-REMOTE-ENCRYPTION` | Request encrypted log data URLs |
| `X-SILENCE-LOGGER` | Opt out of API call logging |

### Public Endpoints

These endpoints do NOT require authentication:

**Boards:**
- `GET /api/v1/boards` (public boards only)
- `GET /api/v1/boards/:id` (public boards)
- `GET /api/v1/boards/:id/simple.obf` (public boards)
- `GET /api/v1/boards/:id/download` (public boards)

**Users:**
- `POST /api/v1/users` (registration)
- `GET /api/v1/users/:id` (basic info)
- `POST /api/v1/users/forgot_password`
- `PUT /api/v1/users/:id/password_reset`

**Media:**
- `GET /api/v1/sounds/:id/upload_success`
- `GET /api/v1/images/:id/upload_success`

**Logs:**
- `GET /api/v1/logs/:id/lam` (with nonce)
- `GET /api/v1/logs/trends`
- `GET /api/v1/logs/anonymous_logs`

**Search:**
- `GET /api/v1/search/audio`
- `GET /api/v1/search/focuses`

---

## Response Format

All API responses follow JSON format with resource-specific keys.

### Single Resource Response

```json
{
  "board": {
    "id": "1_1234",
    "name": "My Board",
    "key": "username/my-board",
    "public": true,
    "buttons": [...]
  },
  "meta": {
    "frd": "2025-11-14"
  }
}
```

**Note:** The root key matches the resource type (`board`, `user`, `log`, etc.)

### Collection Response

```json
{
  "board": [
    {"id": "1_1234", "name": "Board 1"},
    {"id": "1_5678", "name": "Board 2"}
  ],
  "meta": {
    "per_page": 25,
    "offset": 0,
    "next_offset": 25,
    "more": true,
    "next_url": "https://api.../boards?offset=25&per_page=25"
  }
}
```

### Async Operation Response

Resource-intensive operations return Progress objects:

```json
{
  "progress": {
    "id": "1_5678",
    "status_url": "/api/v1/progress/1_5678",
    "finished": false,
    "percent": 45,
    "status": "processing"
  }
}
```

Poll `status_url` to check completion status.

---

## Pagination

LingoLinq uses offset-based pagination.

### Request Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `per_page` | integer | Items per page (capped at resource MAX_PAGE) | 25 |
| `offset` | integer | Starting position (0-indexed) | 0 |

### Response Metadata

```json
{
  "meta": {
    "per_page": 25,
    "offset": 0,
    "next_offset": 25,
    "more": true,
    "next_url": "https://api.../resource?offset=25&per_page=25&other_param=value"
  }
}
```

| Field | Description |
|-------|-------------|
| `per_page` | Items in current page |
| `offset` | Current starting position |
| `next_offset` | Offset for next page |
| `more` | Boolean indicating more results exist |
| `next_url` | Full URL for next page (preserves all query params) |

**Important:** Always use `next_url` when available to preserve filtering/sorting parameters.

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "status": 400
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 400 | Bad Request | Invalid parameters or business logic error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Responses

**Missing Authentication:**
```json
{
  "error": "Access token required for this endpoint: missing token",
  "status": 400
}
```

**Insufficient Permission:**
```json
{
  "error": "Not authorized",
  "unauthorized": true,
  "status": 400
}
```

**Resource Not Found:**
```json
{
  "error": "Record not found",
  "id": "1_1234",
  "status": 404
}
```

**Deleted Resource:**
```json
{
  "error": "Record not found",
  "id": "1_1234",
  "deleted": true,
  "key": "username/board-key",
  "status": 404
}
```

**Scope Limitation:**
```json
{
  "error": "Not authorized",
  "scope_limited": true,
  "scopes": ["read_profile"],
  "status": 400
}
```

---

## Core Resources

## Boards

Communication boards with button grids and symbol layouts.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/boards` | Optional | List/search boards |
| POST | `/boards` | Required | Create board |
| GET | `/boards/:id` | Optional* | Get board details |
| PUT | `/boards/:id` | Required | Update board |
| DELETE | `/boards/:id` | Required | Delete board |
| GET | `/boards/:id/stats` | Required | Board usage statistics |
| GET | `/boards/:id/simple.obf` | Optional* | Export as OBF file |
| POST | `/boards/imports` | Required | Import board from URL/file |
| POST | `/boards/:id/stars` | Required | Star board |
| DELETE | `/boards/:id/stars` | Required | Unstar board |
| POST | `/boards/:id/translate` | Required | Translate board set |
| POST | `/boards/:id/swap_images` | Required | Swap symbol library |
| POST | `/boards/:id/update_privacy` | Required | Update privacy for board set |
| POST | `/boards/:id/rollback` | Required | Rollback to previous version |
| GET | `/boards/:id/history` | Required | Board version history |
| POST | `/boards/:id/rename` | Required | Rename board |
| POST | `/boards/:id/unlink` | Required | Unlink/unstar/delete |
| POST | `/boards/:id/tag` | Required | Tag board |
| GET | `/boards/:id/copies` | Required | List user's copies |
| POST | `/boards/:id/share_response` | Required | Approve/reject share |
| POST | `/boards/:id/slice_locales` | Required | Update locale settings |
| GET | `/boards/:id/download` | Optional* | Generate PDF/OBF download |

\* *Auth required for private boards*

### GET /boards

Search and list boards.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `key` | string | Exact board key lookup |
| `user_id` | string | Filter by user (requires permission) |
| `public` | boolean | Show only public boards |
| `private` | boolean | Show only private boards |
| `starred` | boolean | Show only starred boards |
| `shared` | boolean | Show only shared boards |
| `include_shared` | boolean | Include shared boards with owned |
| `tag` | string | Filter by tag |
| `locale` | string | Filter by language (e.g., "en", "es") |
| `sort` | string | Sort order: `popularity`, `home_popularity` |
| `category` | string | Filter by category |
| `root` | boolean | Show only root boards (not copies) |
| `copies` | boolean | Include/exclude copied boards |
| `exclude_starred` | string | User ID to exclude starred boards |
| `per_page` | integer | Results per page |
| `offset` | integer | Pagination offset |

**Response:**
```json
{
  "board": [
    {
      "id": "1_1234",
      "key": "username/board-key",
      "name": "My Board",
      "description": "A communication board",
      "user_name": "username",
      "public": true,
      "buttons": [...],
      "grid": {
        "rows": 3,
        "columns": 4,
        "order": [[...], [...], [...]]
      },
      "locale": "en",
      "categories": ["core", "fringe"]
    }
  ],
  "meta": {
    "per_page": 25,
    "offset": 0,
    "more": true,
    "next_url": "..."
  }
}
```

### POST /boards

Create a new board.

**Request Body:**
```json
{
  "board": {
    "name": "My New Board",
    "description": "Board description",
    "buttons": [
      {
        "id": "1",
        "label": "hello",
        "vocalization": "hello",
        "image_id": "1_5678",
        "sound_id": "1_9999",
        "load_board": {
          "id": "1_1111",
          "key": "username/linked-board"
        },
        "background_color": "#ffffff",
        "border_color": "#000000"
      }
    ],
    "grid": {
      "rows": 2,
      "columns": 3,
      "order": [[1, null, 2], [null, null, null]]
    },
    "public": false,
    "locale": "en",
    "for_user_id": "1_5678",
    "parent_board_id": "1_9999"
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Board name |
| `description` | string | No | Board description |
| `buttons` | array | No | Button configurations |
| `grid` | object | No | Grid layout (rows, columns, order) |
| `public` | boolean | No | Public visibility |
| `locale` | string | No | Language code |
| `for_user_id` | string | No | Create for supervisee (requires edit permission) |
| `parent_board_id` | string | No | Copy from parent board |

**Response:** Same as GET /boards/:id

**Errors:**
- `400` - Board creation failed
- `401` - Unauthorized (no token or insufficient permission)

### GET /boards/:id

Get board details.

**Path Parameters:**
- `id` - Board global_id (e.g., `1_1234`) or key (e.g., `username/board-key`)

**Response:**
```json
{
  "board": {
    "id": "1_1234",
    "key": "username/board-key",
    "name": "My Board",
    "description": "A communication board",
    "user_name": "username",
    "public": true,
    "buttons": [
      {
        "id": 1,
        "label": "hello",
        "vocalization": "hello",
        "image_id": "1_5678",
        "image": {
          "id": "1_5678",
          "url": "https://...",
          "thumbnail_url": "https://...",
          "content_type": "image/png"
        },
        "sound_id": "1_9999",
        "load_board": {
          "id": "1_1111",
          "key": "username/linked-board",
          "name": "Linked Board"
        },
        "background_color": "#ffffff",
        "border_color": "#000000"
      }
    ],
    "grid": {
      "rows": 3,
      "columns": 4,
      "order": [[1, 2, 3, null], [...], [...]]
    },
    "locale": "en",
    "translations": {...},
    "categories": ["core"],
    "copy_id": "1_original",
    "parent_board_id": "1_original",
    "link": "https://.../username/board-key",
    "permissions": {
      "view": true,
      "edit": false,
      "delete": false,
      "share": true
    }
  }
}
```

**Special Cases:**

- **Linked boards without permission:** `load_board` will be `null`
- **Deleted boards:** Returns 404 with `deleted: true` if user has `view_deleted_boards` permission

**Errors:**
- `404` - Board not found
- `401` - Private board without permission

### PUT /boards/:id

Update board.

**Request Body:**
```json
{
  "board": {
    "name": "Updated Name",
    "description": "New description",
    "buttons": [...],
    "grid": {...},
    "public": true,
    "sharing_key": "add_shallow-username"
  }
}
```

**Special Parameters:**

| Parameter | Description |
|-----------|-------------|
| `sharing_key` | Format: `add_shallow-{username}` to share with user |

**Response:** Same as GET /boards/:id

**Errors:**
- `400` - Update failed, validation errors
- `401` - Not authorized (valet mode, no edit permission)
- `404` - Board not found

### DELETE /boards/:id

Delete board or unlink shallow clone.

**Response:**
```json
{
  "board": {
    "id": "1_1234",
    "key": "username/board-key"
  }
}
```

**Special Behavior:**
- For shallow clones: Unstars and removes from replaced_roots
- For regular boards: Soft deletes (moves to DeletedBoard)

**Errors:**
- `401` - Insufficient permission
- `404` - Board not found

### POST /boards/:id/translate

Translate board and linked boards.

**Request Body:**
```json
{
  "source_lang": "en",
  "destination_lang": "es",
  "board_ids_to_translate": ["1_1234", "1_5678"],
  "set_as_default": true,
  "fallbacks": true,
  "translations": {
    "button_1_label": "hola",
    "button_2_label": "adiós"
  }
}
```

**Response:** Progress object (async operation)
```json
{
  "progress": {
    "id": "1_9999",
    "status_url": "/api/v1/progress/1_9999"
  }
}
```

### POST /boards/:id/swap_images

Swap symbols to different library (e.g., OpenSymbols → PCS).

**Request Body:**
```json
{
  "library": "pcs",
  "board_ids_to_convert": ["1_1234", "1_5678"],
  "include_new": true
}
```

**Response:** Progress object

### GET /boards/:id/simple.obf

Download board in Open Board Format.

**Response:** Binary OBF file

**Headers:**
- `Content-Type: application/obf`
- `Content-Disposition: attachment; filename="board-{id}.obf"`
- `Access-Control-Allow-Origin: *` (CORS enabled)

---

## Users

User accounts, preferences, and relationships.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Required | List users (admin/org managers) |
| POST | `/users` | No | Create user (register) |
| GET | `/users/:id` | Optional | Get user details |
| PUT | `/users/:id` | Required | Update user |
| DELETE | `/users/:id` | Required | Delete user |
| GET | `/users/:id/boards` | Required | User's boards |
| GET | `/users/:id/supervisors` | Required | User's supervisors |
| GET | `/users/:id/supervisees` | Required | User's supervisees |
| GET | `/users/:id/core_lists` | Required | Core vocabulary lists |
| PUT | `/users/:id/core_list` | Required | Update core list |
| POST | `/users/:id/subscription` | Required | Manage subscription |
| GET | `/users/:id/sync_stamp` | Required | Get sync timestamp |
| GET | `/users/:id/valet_credentials` | Required | Get valet login |
| GET | `/users/:id/places` | Required | Nearby places (geolocation) |
| GET | `/users/:id/ws_settings` | Required | WebSocket config |
| GET | `/users/:id/ws_lookup` | Required | Decrypt WebSocket user ID |
| POST | `/users/:id/ws_encrypt` | Required | Encrypt WebSocket message |
| POST | `/users/:id/ws_decrypt` | Required | Decrypt WebSocket message |

### POST /users

Create new user account (registration).

**Request Body:**
```json
{
  "user": {
    "name": "Fred Smith",
    "user_name": "fredsmith",
    "email": "fred@example.com",
    "password": "securepassword",
    "preferences": {
      "locale": "es",
      "preferred_symbols": "pcs",
      "auto_home_return": true,
      "clear_on_vocalize": true,
      "logging": false,
      "home_board": {
        "id": "1_1234",
        "key": "username/board-key"
      }
    },
    "start_code": "ABC123XYZ"
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Full name |
| `user_name` | string | No* | Username (auto-generated if blank) |
| `email` | string | No | Email address |
| `password` | string | No | Password (auto-generated if blank) |
| `preferences` | object | No | User preferences |
| `start_code` | string | No | Organization enrollment code |

\* *Username auto-generated from name if not provided*

**Response:**
```json
{
  "user": {
    "id": "1_1234",
    "name": "Fred Smith",
    "user_name": "fredsmith",
    "email": "fred@example.com",
    "preferences": {...}
  },
  "meta": {
    "access_token": "eyJhbGc...",
    "registration_code": "ABC123"
  }
}
```

**Note:** Response includes `access_token` for immediate authentication.

**Errors:**
- `400` - User creation failed
- `422` - Invalid start code

### GET /users/:id

Get user details.

**Path Parameters:**
- `id` - User global_id or username

**Query Parameters:**
- `confirmation` - Registration confirmation code (grants temporary access)

**Response:**
```json
{
  "user": {
    "id": "1_1234",
    "name": "Fred Smith",
    "user_name": "fredsmith",
    "avatar_url": "https://...",
    "preferences": {
      "locale": "en",
      "home_board": {
        "id": "1_5678",
        "key": "username/home"
      }
    },
    "permissions": ["view", "edit"],
    "subscription": {
      "active": true,
      "expires": "2026-12-31T23:59:59Z"
    }
  }
}
```

**Errors:**
- `404` - User not found
- `401` - Viewing supervisee in valet mode

### GET /users/:id/core_lists

Get core vocabulary word lists for user.

**Path Parameters:**
- `id` - User global_id or `"none"` for default lists

**Response:**
```json
{
  "for_user": {
    "id": "1_1234",
    "user_name": "fredsmith"
  },
  "defaults": [
    {
      "id": "list_1",
      "name": "Basic Core - 36",
      "words": ["I", "you", "want", "go", "stop", "more", "help", "like", ...],
      "count": 36
    },
    {
      "id": "list_2",
      "name": "Extended Core - 60",
      "words": [...],
      "count": 60
    }
  ]
}
```

**Special Case - "none" user:**
```json
{
  "for_user": null,
  "defaults": [...]
}
```

**Errors:**
- `401` - Missing token or no supervise permission
- `404` - User not found

---

## Organizations

Multi-user organization management for schools, clinics, and therapy centers.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/organizations` | Required | List organizations |
| POST | `/organizations` | Required | Create organization |
| GET | `/organizations/:id` | Required | Get organization |
| PUT | `/organizations/:id` | Required | Update organization |
| DELETE | `/organizations/:id` | Required | Delete organization |
| GET | `/organizations/:id/users` | Required | Organization users |
| GET | `/organizations/:id/logs` | Required | Organization logs |
| GET | `/organizations/:id/stats` | Required | Organization statistics |
| POST | `/organizations/:id/purchase` | Required | Purchase licenses |
| GET | `/organizations/:id/extras` | Required | Get add-ons |

---

## Logs

Usage tracking, analytics, and session logs.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/logs` | Required | List log sessions |
| POST | `/logs` | Required | Create log session |
| GET | `/logs/:id` | Required | Get log details |
| PUT | `/logs/:id` | Required | Update log |
| DELETE | `/logs/:id` | Required | Delete log |
| POST | `/logs/import` | Required | Import logs from file |
| GET | `/logs/:id/obl` | Required | Export as OBL |
| GET | `/logs/:id/lam` | No* | Export as LAM format |
| GET | `/logs/trends` | No | Global usage trends |
| GET | `/logs/trends_slice` | No** | Slice of user trends (research) |
| GET | `/logs/anonymous_logs` | No | Anonymous aggregated logs |
| GET | `/logs/code_check` | Required | Validate logging code |

\* *Requires nonce in URL*
\** *Requires integration credentials*

### GET /logs

List log sessions for user or supervisees.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | User global_id (required) |
| `supervisees` | boolean | Include supervisee logs |
| `start` | string | Start date (ISO 8601) |
| `end` | string | End date (ISO 8601) |
| `device_id` | string | Filter by device |
| `location_id` | string | Filter by location cluster |
| `goal_id` | string | Filter by goal |
| `type` | string | Log type: `session`, `note`, `journal`, `assessment` |
| `highlighted` | boolean | Only highlighted logs |
| `per_page` | integer | Results per page |
| `offset` | integer | Pagination offset |

**Headers:**
- `X-Logging-Code-For-{user_id}: {code}` - Override logging cutoff

**Response:**
```json
{
  "log": [
    {
      "id": "1_1234",
      "user_id": "1_5678",
      "log_type": "session",
      "started_at": "2025-11-14T10:00:00Z",
      "ended_at": "2025-11-14T10:15:00Z",
      "duration": 900,
      "author": {
        "id": "1_5678",
        "user_name": "username"
      },
      "device": {
        "id": "1_9999",
        "name": "iPad"
      }
    }
  ],
  "meta": {
    "per_page": 25,
    "offset": 0,
    "more": true,
    "next_url": "...",
    "logging_cutoffs": true,
    "logging_cutoff_min": 12
  }
}
```

**Logging Cutoff:**
- `logging_cutoffs: true` indicates restricted logs
- `logging_cutoff_min` shows hours of accessible history
- Use `X-Logging-Code-For-{user_id}` header with valid code to override

**Errors:**
- `401` - Missing token, valet mode, or private logging enabled
- `404` - User not found

### POST /logs

Create log session.

**Request Body:**
```json
{
  "log": {
    "user_id": "1_1234",
    "events": [
      {
        "timestamp": 1731580800,
        "type": "button",
        "button": {
          "label": "hello",
          "vocalization": "hello",
          "spoken": true,
          "board": {
            "id": "1_1",
            "key": "username/board"
          },
          "button_id": 123
        }
      },
      {
        "timestamp": 1731580805,
        "type": "button",
        "button": {
          "label": "world",
          "spoken": false,
          "board": {"id": "1_1"}
        }
      }
    ],
    "goal_id": "1_5678",
    "note": {
      "text": "Session notes here",
      "timestamp": 1731580800
    }
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | No | User (defaults to authenticated user) |
| `events` | array | Yes* | Button press events |
| `goal_id` | string | No | Attach to goal |
| `note` | object | No | Create note-type log |

\* *Not required if `note` provided*

**Event Structure:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | integer | Unix timestamp |
| `type` | string | Event type (`button`, `action`, etc.) |
| `button` | object | Button details |

**Response:**
```json
{
  "log": {
    "id": "1_9999",
    "pending": true
  }
}
```

**Note:** Logs processed asynchronously. Poll GET /logs/:id for full details.

**Errors:**
- `401` - Missing token or no model permission

### GET /logs/:id

Get log session details.

**Path Parameters:**
- `id` - Log global_id

**Headers:**
- `X-SUPPORTS-REMOTE-ENCRYPTION: true` - Request encrypted data URL

**Response (Standard):**
```json
{
  "log": {
    "id": "1_1234",
    "user_id": "1_5678",
    "log_type": "session",
    "started_at": "2025-11-14T10:00:00Z",
    "ended_at": "2025-11-14T10:15:00Z",
    "duration": 900,
    "events": [
      {
        "id": 1,
        "timestamp": 1731580800,
        "type": "button",
        "summary": "hello",
        "spoken": true,
        "button": {
          "label": "hello",
          "board": {
            "id": "1_1",
            "key": "username/board"
          }
        },
        "parts_of_speech": {
          "types": ["verb"]
        }
      }
    ],
    "stats": {
      "total_buttons": 25,
      "unique_buttons": 18,
      "words_spoken": 12
    }
  }
}
```

**Response (Encrypted):**
```json
{
  "log": {
    "id": "1_1234",
    "events": null,
    "data_url": "https://s3.../encrypted_log_data.json",
    "encryption_settings": {
      "key": "...",
      "iv": "...",
      "hash": "..."
    }
  }
}
```

**Errors:**
- `401` - No supervise permission or logging cutoff exceeded
- `404` - Log not found

---

## Media Resources

## Images

Button images and symbol graphics.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/images` | Required | List images |
| POST | `/images` | Required | Upload/create image |
| GET | `/images/:id` | Required | Get image |
| PUT | `/images/:id` | Required | Update image |
| DELETE | `/images/:id` | Required | Delete image |
| GET | `/images/:id/upload_success` | No | Confirm upload completion |

### POST /images

Create image record and optionally initiate upload.

**Request Body:**
```json
{
  "image": {
    "content_type": "image/png",
    "url": "https://bucket.s3.amazonaws.com/image.png",
    "button_id": 123,
    "license": {
      "type": "CC BY",
      "author_name": "John Doe",
      "author_url": "https://...",
      "source_url": "https://..."
    }
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content_type` | string | Yes | MIME type (image/png, image/jpeg, etc.) |
| `url` | string | No | External image URL |
| `button_id` | integer | No | Associated button |
| `license` | object | No | License information |

**Response (Direct Upload):**
```json
{
  "image": {
    "id": "1_1234",
    "url": "https://cdn.../image.png",
    "thumbnail_url": "https://cdn.../thumb.png",
    "content_type": "image/png",
    "width": 300,
    "height": 300,
    "pending": false
  }
}
```

**Response (Pending Upload):**
```json
{
  "image": {
    "id": "1_1234",
    "pending": true,
    "content_type": "image/png"
  },
  "meta": {
    "remote_upload": {
      "upload_url": "https://bucket.s3.amazonaws.com/",
      "upload_params": {
        "key": "uploads/images/...",
        "acl": "public-read",
        "policy": "...",
        "signature": "..."
      },
      "success_url": "/api/v1/images/:id/upload_success?confirmation=ABC123"
    }
  }
}
```

**Upload Flow (Pending):**
1. Client calls POST /images with content_type
2. Server returns upload credentials
3. Client uploads directly to S3 using credentials
4. Client calls success_url to confirm upload
5. Server processes and generates thumbnails

**Errors:**
- `400` - Missing content_type
- `401` - Unauthorized

---

## Sounds

Audio files for button vocalizations.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sounds` | Required | List sounds |
| POST | `/sounds` | Required | Upload/create sound |
| GET | `/sounds/:id` | Required | Get sound |
| PUT | `/sounds/:id` | Required | Update sound |
| DELETE | `/sounds/:id` | Required | Delete sound |
| POST | `/sounds/import` | Required | Import sounds from ZIP |
| GET | `/sounds/:id/upload_success` | No | Confirm upload completion |

### POST /sounds

Create sound record and optionally initiate upload.

**Request Body:**
```json
{
  "sound": {
    "content_type": "audio/mp3",
    "url": "https://bucket.s3.amazonaws.com/sound.mp3",
    "user_id": "1_5678"
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content_type` | string | Yes | MIME type (audio/mp3, audio/wav, etc.) |
| `url` | string | No | External sound URL |
| `user_id` | string | No | Create for supervisee (requires supervise permission) |

**Response:** Similar to images (direct or pending upload)

**Errors:**
- `400` - Sound creation failed
- `401` - Creating for non-supervisee without permission

---

## Videos

Video resources (similar to sounds/images).

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/videos` | Required | Upload video |
| GET | `/videos/:id` | Required | Get video |
| DELETE | `/videos/:id` | Required | Delete video |

---

## Search

Symbol and content search across multiple libraries.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search/symbols` | Required | Search public symbols |
| GET | `/search/protected_symbols` | Required | Search licensed libraries |
| GET | `/search/external_resources` | Required | Search external content |
| GET | `/search/parts_of_speech` | Required | Word linguistic data |
| GET | `/search/proxy` | Required | Proxy external URLs |
| GET | `/search/apps` | Required | App recommendations |
| GET | `/search/audio` | No | Generate TTS audio |
| GET | `/search/focuses` | No | Focus areas/categories |

### GET /search/symbols

Search public symbol libraries (OpenSymbols, etc.).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `locale` | string | No | Language code (default: "en") |
| `safe` | string | No | Safe search: "0" or "1" (default: "1") |
| `user_name` | string | No | Search on behalf of supervisee |

**Premium Symbol Search:**
```
GET /search/symbols?q=apple premium_repo:pcs
GET /search/symbols?q=hat premium_repo:symbolstix
```

**Requirements for Premium:**
- User must have `extras_enabled` subscription
- Or searching on behalf of user with `extras_enabled`

**Response:**
```json
[
  {
    "name": "apple",
    "extension": "png",
    "content_type": "image/png",
    "image_url": "https://opensymbols.../apple.png",
    "thumbnail_url": "https://opensymbols.../apple_thumb.png",
    "width": 300,
    "height": 300,
    "license": {
      "type": "CC BY",
      "author": "OpenSymbols",
      "source_url": "https://..."
    }
  }
]
```

**Premium Response:**
```json
[
  {
    "name": "apple",
    "extension": "png",
    "content_type": "image/png",
    "image_url": "https://...",
    "thumbnail_url": "https://...",
    "protected": true,
    "protected_source": "pcs"
  }
]
```

**Errors:**
- `400` - Premium search not allowed (no subscription)
- `401` - Missing token

**Note:** Empty searches tracked in Redis for analytics

### GET /search/protected_symbols

Search licensed symbol libraries (LessonPix, SymbolStix, etc.).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `library` | string | Yes | Library name |
| `user_name` | string | No | Search for supervisee |
| `locale` | string | No | Language code |

**Supported Libraries:**
- `lessonpix` - LessonPix symbols
- `symbolstix` - Symbolstix library
- `giphy_asl` - ASL sign language GIFs

**Response:**
```json
[
  {
    "image_url": "https://library.../image.png",
    "thumbnail_url": "https://library.../thumb.png",
    "content_type": "image/png",
    "name": "apple",
    "width": 300,
    "height": 300,
    "external_id": "lib_12345",
    "finding_user_name": "username",
    "protected": true,
    "protected_source": "lessonpix",
    "public": false,
    "license": "private",
    "author": "LessonPix",
    "author_url": "https://lessonpix.com",
    "source_url": "https://...",
    "copyright_notice_url": "https://..."
  }
]
```

**Errors:**
- `401` - Missing token or no library access
- `404` - User not found

### GET /search/parts_of_speech

Get linguistic data for a word.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Word to look up |
| `suggestions` | boolean | No | Include usage suggestions |

**Response:**
```json
{
  "word": "run",
  "types": ["verb", "noun"],
  "antonyms": ["walk", "stay"],
  "base_forms": ["run", "running", "ran"],
  "inflections": {
    "present": "run",
    "past": "ran",
    "gerund": "running"
  },
  "sentences": [
    "I like to run.",
    "She runs every day."
  ]
}
```

**Errors:**
- `404` - Word not found (if `suggestions=true`)

### GET /search/audio

Generate TTS (text-to-speech) audio. **No authentication required.**

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to synthesize |
| `locale` | string | No | Language/voice (default: "en") |
| `voice_id` | string | No | Voice ID or gender (male/female) |
| `mp3` | string | No | Format: "0" for WAV, other for MP3 |

**Supported Voices:**
- Google TTS (most languages)
- Irish Gaelic (`locale=ga`)
- Additional regional dialects

**Response:** Binary audio data

**Headers:**
- `Content-Type: audio/mp3` or `audio/wav`
- `Content-Disposition: inline`

**Errors:**
- `400` - No voice found for locale
- `400` - Remote request failed

---

## Webhooks

Real-time event notifications via HTTP callbacks.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/webhooks` | Required | List webhooks |
| POST | `/webhooks` | Required | Create webhook |
| GET | `/webhooks/:id` | Required | Get webhook |
| PUT | `/webhooks/:id` | Required | Update webhook |
| DELETE | `/webhooks/:id` | Required | Delete webhook |
| POST | `/webhooks/:id/test` | Required | Send test notification |

### Webhook Event Types

| Event | Record Type | Description |
|-------|-------------|-------------|
| `new_session` | LogSession | User completed communication session |
| `new_utterance` | Utterance | User created/saved utterance |
| `test` | Webhook | Test notification (all callbacks) |
| `*` | Any | Wildcard for all events |

### POST /webhooks

Create webhook configuration.

**Request Body (Simple):**
```json
{
  "webhook": {
    "user_id": "1_1234",
    "webhook_type": "user",
    "url": "https://your-server.com/webhook",
    "include_content": true,
    "webhooks": ["new_session", "new_utterance"],
    "content_types": {
      "new_session": "lam",
      "new_utterance": "lam"
    }
  }
}
```

**Request Body (Advanced):**
```json
{
  "webhook": {
    "user_id": "1_1234",
    "webhook_type": "user",
    "notifications": {
      "new_session": {
        "callback": "https://your-server.com/session",
        "include_content": true,
        "content_type": "lam"
      },
      "new_utterance": {
        "callback": "https://your-server.com/utterance",
        "include_content": false
      },
      "*": {
        "callback": "https://your-server.com/all-events",
        "include_content": false
      }
    }
  }
}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | User to monitor (requires supervise permission) |
| `webhook_type` | string | Type: `user`, `research` |
| `url` | string | Callback URL (HTTPS required) |
| `include_content` | boolean | Include event payload |
| `webhooks` | array | Event types to monitor (simple mode) |
| `content_types` | object | Content format per event |
| `notifications` | object | Per-event configuration (advanced) |

**Content Types:**
- `lam` - Line-delimited log format
- `anonymized_summary` - Anonymized metrics (research only)

**Response:**
```json
{
  "webhook": {
    "id": "1_5678",
    "user_id": "1_1234",
    "record_code": "User:1_1234::*",
    "callback_token": "secure_token_abc123",
    "notifications": {
      "new_session": [
        {
          "callback": "https://your-server.com/session",
          "include_content": true,
          "content_type": "lam"
        }
      ]
    }
  }
}
```

**Important:** Store `callback_token` to validate incoming webhook requests.

### Webhook Payload

When events occur, LingoLinq POSTs to your callback URL:

**Request Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**POST Body:**
```
token=secure_token_abc123
notification=new_session
record=LogSession:1_9999
url=https://api.../logs/1_9999
content=...optional_payload...
```

**Parsed JSON:**
```json
{
  "token": "secure_token_abc123",
  "notification": "new_session",
  "record": "LogSession:1_9999",
  "url": "https://api.example.com/api/v1/logs/1_9999",
  "content": "...LAM format or JSON..."
}
```

**Field Descriptions:**

| Field | Description |
|-------|-------------|
| `token` | Security token matching webhook's `callback_token` |
| `notification` | Event type that triggered webhook |
| `record` | Record identifier: `{ClassName}:{global_id}` |
| `url` | API endpoint to fetch full resource (if available) |
| `content` | Optional event payload (if `include_content: true`) |

**Validation:**
1. Verify `token` matches your webhook's `callback_token`
2. Check `notification` is expected event type
3. Parse `record` to get resource type and ID
4. Optionally fetch full resource from `url`

### Content Examples

**LAM Format** (Log Activity Model):
```
2025-11-14T10:00:00Z button hello 1_1
2025-11-14T10:00:05Z button world 1_1
2025-11-14T10:00:10Z speak 2
```

**Anonymized Summary:**
```json
{
  "uid": "obfuscated_user_token_xyz",
  "active_weeks": 12
}
```

### Webhook Tracking

Each webhook tracks up to 20 recent delivery attempts:

```json
{
  "webhook": {
    "callback_attempts": [
      {
        "timestamp": 1731580800,
        "code": 200,
        "url": "https://your-server.com/webhook"
      },
      {
        "timestamp": 1731584400,
        "code": 500,
        "url": "https://your-server.com/webhook"
      }
    ]
  }
}
```

**Timeout:** Webhook requests timeout after 10 seconds.

**Retry Logic:** No automatic retries. Monitor `callback_attempts` for failures.

### POST /webhooks/:id/test

Send test notification to verify webhook configuration.

**Response:** Progress object
```json
{
  "progress": {
    "id": "1_9999",
    "status_url": "/api/v1/progress/1_9999"
  }
}
```

Check progress to see delivery results.

---

## WebSocket API

Real-time communication for online status tracking and remote modeling sessions.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/:id/ws_settings` | Required | Get WebSocket connection config |
| GET | `/users/:id/ws_lookup` | Required | Decrypt obfuscated user ID |
| POST | `/users/:id/ws_encrypt` | Required | Encrypt message for WebSocket |
| POST | `/users/:id/ws_decrypt` | Required | Decrypt WebSocket message |

### Architecture

**Purpose:**
- Real-time online status indicators
- Remote modeling (supervisor demonstrates to communicator)
- Live communication monitoring

**Security:**
- Device IDs encrypted with `CDWEBSOCKET_ENCRYPTION_KEY`
- Time-limited verification codes
- Optional end-to-end message encryption

### GET /users/:id/ws_settings

Get WebSocket connection parameters.

**Path Parameters:**
- `id` - User global_id

**Response:**
```json
{
  "user_id": "1_1234",
  "ws_user_id": "1_1234",
  "my_device_id": "me$encrypted_string$iv",
  "verifier": "verification_code:timestamp",
  "supervisees": [
    {
      "user_id": "1_5678",
      "ws_user_id": "1_5678",
      "my_device_id": "encrypted_string$iv",
      "verifier": "code:timestamp"
    }
  ]
}
```

**Fields:**

| Field | Description |
|-------|-------------|
| `user_id` | User's global_id |
| `ws_user_id` | WebSocket room identifier |
| `my_device_id` | Encrypted device ID (prefixed `me$` for self) |
| `verifier` | Time-limited verification code for connection |
| `supervisees` | Array of supervisee connection details (max 20) |

**Notes:**
- Device ID format: `encrypted_data$initialization_vector`
- Verifier expires - regenerate for new connections
- Only returned if user is supervisor/supporter

**Connection Flow:**
1. Client calls `/ws_settings`
2. Client connects to WebSocket server with `my_device_id` and `verifier`
3. Server validates using shared secret
4. Connection established for real-time updates

**Errors:**
- `401` - Missing token or no supervise permission

### GET /users/:id/ws_lookup

Decrypt obfuscated user ID from WebSocket.

**Path Parameters:**
- `id` - Any user ID (used for permission check)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Obfuscated ID from WebSocket (`me$encrypted$iv`) |

**Response:**
```json
{
  "user_id": "1_1234",
  "user_name": "fredsmith",
  "device_id": "1_9999",
  "avatar_url": "https://cdn.../avatar.png"
}
```

**Use Case:** Identify which user/device is in WebSocket room

**Errors:**
- `400` - Invalid decryption or user_id required
- `401` - No supervise permission

### POST /users/:id/ws_encrypt

Encrypt text for secure WebSocket transmission.

**Path Parameters:**
- `id` - User global_id

**Request Body:**
```json
{
  "user_id": "1_1234",
  "text": "Hello, this is a private message"
}
```

**Response:**
```json
{
  "encoded": "encrypted_data$initialization_vector",
  "user_id": "1_1234"
}
```

**Use Case:** End-to-end encryption for sensitive WebSocket messages

**Errors:**
- `401` - No supervise permission

### POST /users/:id/ws_decrypt

Decrypt text from WebSocket transmission.

**Path Parameters:**
- `id` - User global_id

**Request Body:**
```json
{
  "user_id": "1_1234",
  "text": "encrypted_data$initialization_vector"
}
```

**Response:**
```json
{
  "decoded": "Hello, this is a private message",
  "user_id": "1_1234"
}
```

**Errors:**
- `400` - Invalid decryption
- `400` - User ID mismatch (encrypted for different user)
- `401` - No supervise permission

---

## Additional Resources

### Button Sets

Pre-computed button hierarchies for find-a-button features.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/buttonsets/:id` | Get button set |
| POST | `/buttonsets/:id/generate` | Generate board from button set |

### Words

Vocabulary and linguistic features.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/words/reachable_core` | Calculate reachable core words from board |
| GET | `/lang/:locale` | Language settings (public endpoint) |

### Units

Organizational units for classrooms, therapy groups.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/units/:id` | Get unit |
| GET | `/units/:id/stats` | Unit statistics |
| GET | `/units/:id/logs` | Unit logs |
| POST | `/units/:id/note` | Add note to unit |

### Lessons

Structured learning activities.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lessons` | List lessons |
| GET | `/lessons/recent` | Recent lessons |
| POST | `/lessons/:id/assign` | Assign lesson to user |
| POST | `/lessons/:id/complete` | Mark lesson complete |

### Goals

User goals and progress tracking.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals` | List goals |
| POST | `/goals` | Create goal |
| GET | `/goals/:id` | Get goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Delete goal |

### Utterances

Saved sentences and phrases.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/utterances` | List utterances |
| POST | `/utterances` | Create utterance |
| POST | `/utterances/:id/share` | Share utterance |
| POST | `/utterances/:id/reply` | Reply to utterance |

### Tags

Board categorization and organization.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List available tags |
| POST | `/boards/:id/tag` | Tag board |

---

## Rate Limiting

**Default Limits:** 1000 requests per hour per API token

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1731585600
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

**429 Response:**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 3600,
  "status": 429
}
```

**Best Practices:**
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff for retries
- Cache responses when appropriate
- Use webhooks for real-time updates instead of polling

---

## Data Formats

### Timestamps

All timestamps use ISO 8601 UTC format:
```
2025-11-14T10:30:00Z
```

Alternative Unix timestamps (seconds since epoch):
```
1731580800
```

### Locales

Language codes follow ISO 639-1 + ISO 3166-1:
```
en          (English)
en-US       (English - United States)
es          (Spanish)
es-ES       (Spanish - Spain)
fr-CA       (French - Canada)
```

### Global IDs

All records use sharded global ID format:
```
{shard_number}_{database_id}

Examples:
1_1234
1_5678
2_9999
```

**Usage:**
- Use global IDs for all API requests
- Never use raw database IDs
- Global IDs remain consistent across shards

### File Uploads

**Upload Limits:**

| Media Type | Max Size |
|-----------|----------|
| Images | 10 MB |
| Audio | 50 MB |
| Video | 100 MB |
| Documents | 25 MB |

**Supported Formats:**

**Images:** PNG, JPEG, GIF, SVG, WebP
**Audio:** MP3, WAV, OGG, AAC, M4A
**Video:** MP4, WebM, MOV
**Documents:** PDF, OBF, OBZ

---

## Example Workflows

### Complete Board Creation Workflow

```bash
# 1. Create user
POST /api/v1/users
{
  "user": {
    "name": "Alice Smith",
    "user_name": "alice"
  }
}
# Returns: access_token

# 2. Search for symbols
GET /api/v1/search/symbols?q=hello
Authorization: Bearer {token}
# Returns: symbol URLs

# 3. Upload image
POST /api/v1/images
{
  "image": {
    "content_type": "image/png",
    "url": "https://opensymbols.../hello.png"
  }
}
# Returns: image_id

# 4. Create board
POST /api/v1/boards
{
  "board": {
    "name": "My First Board",
    "buttons": [
      {
        "id": "1",
        "label": "hello",
        "image_id": "1_5678"
      }
    ],
    "grid": {
      "rows": 1,
      "columns": 1,
      "order": [[1]]
    }
  }
}
# Returns: board with global_id

# 5. Update user's home board
PUT /api/v1/users/self
{
  "user": {
    "preferences": {
      "home_board": {
        "id": "1_1234",
        "key": "alice/my-first-board"
      }
    }
  }
}
```

### Log Session Workflow

```bash
# 1. Create log session
POST /api/v1/logs
{
  "log": {
    "events": [
      {
        "timestamp": 1731580800,
        "type": "button",
        "button": {
          "label": "I",
          "spoken": false,
          "board": {"id": "1_1"}
        }
      },
      {
        "timestamp": 1731580805,
        "type": "button",
        "button": {
          "label": "want",
          "spoken": false,
          "board": {"id": "1_1"}
        }
      },
      {
        "timestamp": 1731580810,
        "type": "button",
        "button": {
          "label": "go",
          "spoken": true,
          "board": {"id": "1_1"}
        }
      }
    ]
  }
}
# Returns: log with pending: true

# 2. Wait for processing (or poll)
GET /api/v1/logs/1_9999
# Returns: full log with stats

# 3. Export log
GET /api/v1/logs/1_9999/obl
# Returns: Progress object

# 4. Check export progress
GET /api/v1/progress/1_8888
# Returns: download URL when finished
```

### Webhook Integration Workflow

```bash
# 1. Create webhook
POST /api/v1/webhooks
{
  "webhook": {
    "user_id": "1_1234",
    "webhook_type": "user",
    "url": "https://myapp.com/webhook",
    "include_content": true,
    "webhooks": ["new_session"],
    "content_types": {
      "new_session": "lam"
    }
  }
}
# Returns: callback_token

# 2. Implement webhook handler
POST https://myapp.com/webhook
# Receives:
# token=abc123&notification=new_session&record=LogSession:1_9999&url=...&content=...

# 3. Validate and process
def handle_webhook(request):
    # Verify token
    if request['token'] != stored_callback_token:
        return 401

    # Parse record
    record_type, record_id = request['record'].split(':')

    # Process content
    if request['content']:
        process_lam_data(request['content'])
    else:
        # Fetch full resource
        fetch(request['url'])

    return 200

# 4. Test webhook
POST /api/v1/webhooks/1_5678/test
# Triggers test notification
```

---

## Security Best Practices

### Token Management

1. **Store Securely:** Never commit tokens to version control
2. **Rotate Regularly:** Implement periodic token rotation
3. **Use HTTPS:** Always use HTTPS for API requests
4. **Scope Tokens:** Request minimum required scopes
5. **Monitor Usage:** Track API calls for anomalies

### Data Privacy

1. **GDPR Compliance:** Handle EU user data appropriately
2. **COPPA Compliance:** Special protections for children under 13
3. **Encryption:** Use `secure_serialize` for sensitive data
4. **Audit Logging:** All API calls are logged for security
5. **User Consent:** Obtain consent for data collection/sharing

### Permission Checks

Always verify permissions before operations:

```javascript
// Example: Check user can edit board
GET /api/v1/boards/1_1234

if (response.board.permissions.edit) {
  // Allow editing
} else {
  // Show read-only view
}
```

---

## External Integrations

### AWS Services

| Service | Purpose |
|---------|---------|
| **S3** | File storage (images, sounds, videos) |
| **SES** | Email delivery |
| **SNS** | Push notifications |
| **Elastic Transcoder** | Media transcoding |

### Third-Party APIs

| Service | Purpose |
|---------|---------|
| **OpenSymbols** | Public symbol library |
| **LessonPix** | PCS premium symbols |
| **Symbolstix** | Premium symbol library |
| **Google TTS** | Text-to-speech synthesis |
| **Google Translate** | Machine translation |
| **Stripe** | Payment processing |

---

## Support & Resources

- **Documentation:** https://github.com/lingolinq/lingolinq-aac/blob/main/API.md
- **Repository:** https://github.com/lingolinq/lingolinq-aac
- **Issues:** https://github.com/lingolinq/lingolinq-aac/issues
- **Community:** https://www.openaac.org
- **License:** AGPLv3

---

## Changelog

### v1.0 (November 2025)
- Initial API documentation
- Complete endpoint reference
- Webhook support
- WebSocket API
- Comprehensive examples

---

*API Version 1.0 | LingoLinq AAC Platform | Last Updated: November 14, 2025*
