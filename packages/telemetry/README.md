# @resq-systems/telemetry

Framework-agnostic real-time telemetry client: a **single-owner reconnecting
WebSocket** with exponential backoff, many-consumer fan-out, and open-replay —
plus optional React bindings.

One socket is shared across a whole app. Consumers `subscribe()` for raw frames
and/or lifecycle events; any consumer may `send()`. The socket reconnects with
exponential backoff after an unexpected close and replays `onOpen` to late
subscribers so channel handshakes survive reconnects.

## Install

```sh
bun add @resq-systems/telemetry
# React bindings additionally need react >= 19 (a peer)
```

## Core (framework-agnostic)

```ts
import { TelemetrySocket } from "@resq-systems/telemetry";

const socket = new TelemetrySocket({ url: "wss://host/fleet/ws" });

const off = socket.subscribe({
  onOpen: () => socket.send("subscribe:ops"),
  onMessage: (raw) => applyFrame(JSON.parse(raw)),
  onStateChange: (state) => setStatus(state), // "connecting" | "open" | "reconnecting" | ...
});

socket.connect();
// later
off();
socket.close();
```

Runs anywhere: uses the global `WebSocket` by default; inject one for Node or
tests via `{ connect: (url) => new WebSocket(url) }`.

## React

```tsx
import { TelemetryProvider, useTelemetryChannel } from "@resq-systems/telemetry/react";

function App() {
  return (
    <TelemetryProvider url="wss://host/fleet/ws">
      <Fleet />
    </TelemetryProvider>
  );
}

function Fleet() {
  const { connected, send } = useTelemetryChannel({
    onMessage: (raw) => update(JSON.parse(raw)),
  });
  // ...
}
```

The provider is the sole socket owner; every hook multiplexes over the one
connection.

## API

- `new TelemetrySocket({ url, connect?, backoff? })` — `connect()`, `close()`,
  `send(msg): boolean`, `subscribe(sub): () => void`, `state`, `connected`.
- `createBackoff(opts)` / `createReconnectTimer(task, backoff?)` — the reusable
  exponential-backoff schedule + single-timer reconnect helper.
- `./react`: `TelemetryProvider`, `useTelemetry()`, `useTelemetryChannel(sub)`.

## License

Apache-2.0
