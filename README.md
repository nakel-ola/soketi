# soketi

<img src="assets/logo.png" width="120" />

![CI](https://github.com/soketi/soketi/workflows/CI/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/soketi/soketi/branch/master/graph/badge.svg)](https://codecov.io/gh/soketi/soketi/branch/master)
[![Latest Stable Version](https://img.shields.io/github/v/release/soketi/soketi)](https://www.npmjs.com/package/@soketi/soketi)
[![Total Downloads](https://img.shields.io/npm/dt/@soketi/soketi)](https://www.npmjs.com/package/@soketi/soketi)
[![License](https://img.shields.io/npm/l/@soketi/soketi)](https://www.npmjs.com/package/@soketi/soketi)

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/soketi)](https://artifacthub.io/packages/search?repo=soketi)
[![Discord](https://img.shields.io/discord/957380329985958038?color=%235865F2&label=Discord&logo=discord&logoColor=%23fff)](https://discord.gg/VgfKCQydjb)

Next-gen, Pusher-compatible, open-source WebSockets server. Simple, fast, and resilient. 📣

---

## Quick start

### Run locally with Docker

The fastest way to try soketi:

```bash
docker run -p 6001:6001 -p 9601:9601 quay.io/soketi/soketi:latest-16-alpine
```

Soketi is now listening on `ws://127.0.0.1:6001` with the default app credentials:

| Field | Value |
|---|---|
| `app_id` | `app-id` |
| `key` | `app-key` |
| `secret` | `app-secret` |
| Host | `127.0.0.1` |
| Port | `6001` |

Metrics endpoint (Prometheus format) is on `http://127.0.0.1:9601/metrics`.

### Run locally from source

Requires **Node.js 20 LTS or newer**.

```bash
git clone https://github.com/soketi/soketi.git
cd soketi
npm install
npm run build
node bin/server.js start
```

### Run locally via npm

```bash
npm install -g @soketi/soketi
soketi start
```

### Connect from a client

Soketi speaks the Pusher protocol, so any Pusher SDK works. Point it at your local instance:

```js
import Pusher from 'pusher-js';

const pusher = new Pusher('app-key', {
    wsHost: '127.0.0.1',
    wsPort: 6001,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    cluster: 'mt1',
});

pusher.subscribe('my-channel').bind('my-event', (data) => {
    console.log(data);
});
```

To publish from your backend, use the standard Pusher server SDK with the same host/port and `app-id` / `app-key` / `app-secret`.

---

## Self-hosting

### Docker (single instance)

```bash
docker run -d \
    --name soketi \
    -p 6001:6001 \
    -p 9601:9601 \
    -e SOKETI_DEFAULT_APP_ID="${APP_ID}" \
    -e SOKETI_DEFAULT_APP_KEY="${APP_KEY}" \
    -e SOKETI_DEFAULT_APP_SECRET="${APP_SECRET}" \
    -e SOKETI_METRICS_SERVER_PORT=9601 \
    quay.io/soketi/soketi:latest-16-alpine
```

### Docker Compose (with Redis for horizontal scaling)

```yaml
services:
  soketi:
    image: quay.io/soketi/soketi:latest-16-alpine
    ports:
      - "6001:6001"
      - "9601:9601"
    environment:
      SOKETI_DEFAULT_APP_ID: ${APP_ID}
      SOKETI_DEFAULT_APP_KEY: ${APP_KEY}
      SOKETI_DEFAULT_APP_SECRET: ${APP_SECRET}
      SOKETI_ADAPTER_DRIVER: redis
      SOKETI_QUEUE_DRIVER: redis
      SOKETI_DB_REDIS_HOST: redis
    depends_on:
      - redis

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Behind a reverse proxy (nginx + TLS)

Soketi terminates plain WebSockets — terminate TLS at your proxy and forward to port `6001`:

```nginx
server {
    listen 443 ssl http2;
    server_name ws.example.com;

    # ... your TLS config ...

    location / {
        proxy_pass http://127.0.0.1:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 600s;
    }
}
```

Connect from the browser with `wsHost: 'ws.example.com'`, `wssPort: 443`, `forceTLS: true`.

### systemd (running from npm install)

Install globally, then create `/etc/systemd/system/soketi.service`:

```ini
[Unit]
Description=Soketi WebSocket Server
After=network.target

[Service]
Environment=SOKETI_DEFAULT_APP_ID=app-id
Environment=SOKETI_DEFAULT_APP_KEY=app-key
Environment=SOKETI_DEFAULT_APP_SECRET=app-secret
ExecStart=/usr/bin/soketi start
Restart=on-failure
User=soketi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now soketi
```

### PM2 (multi-core)

Soketi ships a PM2-aware binary that spreads across CPU cores and shares state correctly:

```bash
soketi-pm2 start
```

### Hosted deployment templates

- [Deploy with Railway](https://github.com/soketi/soketi-railway-deploy-example)
- [Deploy with Cleavr](https://cleavr.io/cleavr-slice/how-to-install-soketi)
- [Helm chart on Artifact Hub](https://artifacthub.io/packages/search?repo=soketi)

---

## Configuration

Configuration is via environment variables (`SOKETI_*` prefix) or a JSON file passed with `--config`.

### Most common env vars

| Variable | Default | Notes |
|---|---|---|
| `SOKETI_PORT` | `6001` | WebSocket + HTTP API port |
| `SOKETI_HOST` | `0.0.0.0` | Bind address |
| `SOKETI_DEFAULT_APP_ID` | `app-id` | Default app credentials (override in production!) |
| `SOKETI_DEFAULT_APP_KEY` | `app-key` | |
| `SOKETI_DEFAULT_APP_SECRET` | `app-secret` | |
| `SOKETI_ADAPTER_DRIVER` | `local` | `local`, `redis`, `nats`, or `cluster` (PM2) |
| `SOKETI_DB_REDIS_HOST` | `127.0.0.1` | Used when adapter is `redis` |
| `SOKETI_DB_REDIS_PORT` | `6379` | |
| `SOKETI_APP_MANAGER_DRIVER` | `array` | `array`, `mysql`, `postgres`, `dynamodb` |
| `SOKETI_METRICS_ENABLED` | `false` | Enable Prometheus `/metrics` endpoint |
| `SOKETI_METRICS_SERVER_PORT` | `9601` | Where Prometheus scrapes |
| `SOKETI_DEBUG` | `false` | Verbose logging |

For the full list (sub-keys, webhooks, rate limits, SSL, queue settings) see [the env-vars docs](https://docs.soketi.app/getting-started/environment-variables).

### Config file

```bash
soketi start --config=/etc/soketi/config.json
```

Any field of the [Options object](src/options.ts) can be set in JSON — env vars take precedence when both are set.

---

## Updating

### Docker

```bash
docker pull quay.io/soketi/soketi:latest-16-alpine
docker stop soketi && docker rm soketi
# re-run with the same `docker run` command
```

For zero-downtime updates, run multiple instances behind a load balancer with the `redis` adapter so state is shared, and roll one at a time.

### npm

```bash
npm update -g @soketi/soketi
```

If installed inside your own project:

```bash
npm install @soketi/soketi@latest
```

### From source

```bash
cd /path/to/soketi
git pull
npm install
npm run build
# restart your process manager
```

### Reading the changelog

Releases are published on [GitHub Releases](https://github.com/soketi/soketi/releases) and tagged on Docker Hub / Quay. Every release notes any breaking environment-variable or wire-protocol changes — it's safe to skip versions, but read the notes for any majors you cross.

---

## Why soketi

### Blazing fast ⚡

Built on [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) — a native C application ported to Node.js, demonstrated to perform [_8.5x Fastify_](https://alexhultman.medium.com/serving-100k-requests-second-from-a-fanless-raspberry-pi-4-over-ethernet-fdd2c2e05a1e) and [_at least 10x Socket.IO_](https://medium.com/swlh/100k-secure-websockets-with-raspberry-pi-4-1ba5d2127a23). Holds thousands of active connections on **<1 GB and 1 CPU**.

### Cheaper than the competition 🤑

For ~$5–$10/mo on a small VPS, you get effectively unlimited connections and messages — compare to managed services that meter both.

### Pusher-compatible 📡

Implements [Pusher Protocol v7](https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol#version-7-2017-11). Existing Pusher SDKs work with a host/port + credentials swap.

### Production-ready 🤖

Horizontal scaling via the Redis or NATS adapter, Prometheus metrics, webhooks, rate limiting, SSL termination, multiple app-management backends (static array, MySQL, Postgres, DynamoDB).

---

## Examples & community

### Reference apps
- [Laravel chat app](https://github.com/soketi/laravel-chat-app)
- [ETH History chart](https://github.com/soketi/laravel-eth-history)

### Community projects
- [Soketi UI](https://github.com/Daynnnnn/soketi-ui) — manage apps via web UI
- [Soketi App Manager for Filament](https://github.com/rahulhaque/soketi-app-manager-filament)
- [Basement Chat](https://github.com/basement-chat/basement-chat) — Laravel chat package
- [Simple Chat](https://github.com/kitar/simplechat) — chat app on Soketi + DynamoDB

---

## 📃 Documentation

[Full documentation on Gitbook 🌍](https://rennokki.gitbook.io/soketi-docs/)

## 🤝 Supporting

Soketi is open source forever. To help cover maintenance time, [sponsor on GitHub Sponsors](https://github.com/sponsors/rennokki).

<p align="center">
  <a href="https://github.com/sponsors/rennokki">
    <img src='https://cdn.jsdelivr.net/gh/rennokki/sponsorkit-assets@main/assets/sponsors.svg' alt="Logos from Sponsors" />
  </a>
</p>

## 🌟 Stargazers

[![Stargazers over time](https://starchart.cc/soketi/soketi.svg)](https://starchart.cc/soketi/soketi)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## ⁉ Ideas or discussions?

[Discussions board](https://github.com/soketi/soketi/discussions) · [Discord](https://discord.gg/VgfKCQydjb)

## 🔒 Security

Email security issues to alex@renoki.org instead of opening a public issue. See [SECURITY.md](SECURITY.md).

## 🎉 Credits

- [Alex Renoki](https://github.com/rennokki)
- [Pusher Protocol](https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol)
- [All contributors](../../contributors)
- Thank you to Bunny! 🌸
