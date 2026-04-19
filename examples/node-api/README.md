<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# Example: Bun HTTP API Server

A minimal Bun.serve() API server demonstrating `@resq-sw` packages working together:

- **@resq-sw/logger** — Structured request logging
- **@resq-sw/rate-limiting** — In-memory rate limiting for API routes
- **@resq-sw/security** — PII sanitization and secure token generation
- **@resq-sw/http** — Request ID tracking and HTTPS redirect checks

## Routes

| Method | Path         | Description                          |
| ------ | ------------ | ------------------------------------ |
| GET    | `/health`    | Health check endpoint                |
| GET    | `/api/token` | Generate a secure random token       |
| POST   | `/api/echo`  | Echo back sanitized JSON input       |

## Running

From the workspace root:

```bash
bun install
bun --filter example-node-api dev
```

The server starts on `http://localhost:3000`.

## Try it

```bash
# Health check
curl http://localhost:3000/health

# Generate a token
curl http://localhost:3000/api/token

# Echo with sanitization (sensitive fields are redacted)
curl -X POST http://localhost:3000/api/echo \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "s3cret"}'
```
