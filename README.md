<p align="center">
  <img src="https://cdn.prod.website-files.com/68e09cef90d613c94c3671c0/697e805a9246c7e090054706_logo_horizontal_grey.png" alt="Yeti" width="200" />
</p>

---

# studio

[![Yeti](https://img.shields.io/badge/Yeti-Application-blue)](https://yetirocks.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **[Yeti](https://yetirocks.com)** - The Performance Platform for Agent-Driven Development.
> Schema-driven APIs, real-time streaming, and vector search. From prompt to production.

Yeti's built-in administration UI. Manage applications, browse data, view telemetry, configure auth, and run benchmarks - all from the browser.

## Features

- **Applications** - Browse source code, inspect table data, view configs, install/delete apps
- **Telemetry** - Real-time log streaming with level filters, span tracing, metric dashboards
- **Auth** - User and role management with RBAC permission editor
- **Vectors** - Embedding model installation, default model selection, cache management
- **Benchmarks** - Run throughput/latency tests with historical trend charts

## Access

Studio is served at `/admin` and requires `super_user` authentication:

```
https://localhost:9996/admin
```

In development mode without yeti-auth, Studio is accessible without login.

## Pages

### Applications

List all installed apps with status, resource count, and table count. Click **Manage** to open an app:

- **Code** - File browser with syntax highlighting. Markdown files render automatically. README opens by default.
- **Data** - Browse and edit table records with sidebar navigation and inline JSON editor.
- **Config** - View the app's config.yaml.

Click **New Application** to install from GitHub or the demo catalog. Click **Delete** to remove an app with confirmation.

### Telemetry

- **Logs** - Live log stream with level filters (TRACE through ERROR), full-text search, and per-app filtering.
- **Traces** - Span data with duration color-coding and target filtering.
- **Metrics** - Counter and gauge values grouped by category.

### Auth

- **Users** - Create, edit, delete users. Assign roles, toggle active status.
- **Roles** - Define roles with database/table/attribute-level permissions. The `super_user` role is protected.

### Vectors

- **Text Models** / **Image Models** - Install and uninstall embedding models, set the default model per type.

### Benchmarks

Select a test, click **Run**, and view throughput (req/s), latency (p50/p99), and CV%. Click the history icon to view past runs with trend charts.

## Configuration

```yaml
name: "Yeti Studio"
app_id: "studio"
version: "1.0.0"
description: "Yeti administration web interface"
enabled: true

route_prefix: /admin
require_super_user: true

static_files:
  path: web
  route: /
  index: index.html
  notFound:
    file: index.html
    statusCode: 200
  build:
    sourceDir: source
    command: npm run build

auth:
  oauth:
    rules:
      - strategy: email
        pattern: "*@yetirocks.com"
        role: super_user
      - strategy: provider
        pattern: "google"
        role: viewer
```

## Development

```bash
cd source

# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build
```

---

Built with [Yeti](https://yetirocks.com) | The Performance Platform for Agent-Driven Development
