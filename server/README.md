# Server

[PocketBase](https://pocketbase.io) **0.39.11** — one binary that is the database, the auth provider and the API.

The binary is not in git: it is ~33 MB and built per platform, and the deploy uses a Linux build. Download the version above from [the releases page](https://github.com/pocketbase/pocketbase/releases) and unzip it here.

```bash
./pocketbase serve --publicDir=..                    # http://127.0.0.1:8090
./pocketbase superuser create you@example.com pass   # first run only
```

`--publicDir=..` makes PocketBase serve the shop as well as the API: one origin, no CORS, and `--indexFallback` (on by default) sends unknown paths to `index.html`, which is the SPA fallback the router needs. There is no Live Server in the loop, so nothing reloads the page when a write lands in the database.

The trade is that `..` is the whole repository, so `/server/pb_data/data.db` would be downloadable. That is bound to `127.0.0.1` here, but the deploy must never do it: the image copies only the frontend into `pb_public/` and leaves the server folder out.

The dashboard is at `/_/`. The demo account the app signs in with is a record in the `users` collection — `demo@shop.test` / `test1234`.

## What is in git and what is not

| | |
|---|---|
| `pb_migrations/` | **committed** — the schema as code. Change a collection in the dashboard and PocketBase writes the migration itself; commit it, and a fresh checkout gets the same collections. |
| `pb_hooks/` | **committed** — server-side logic. |
| `pb_data/` | ignored — the database and uploaded files. |
| the binary | ignored — see above. |

Records are data, not schema, so the demo account does not travel with the repository. Create it by hand after the first `serve`.

Settings are the exception to all of this: unlike collections, PocketBase does not write them to a migration when you change them in the dashboard. Anything that must survive a fresh checkout — the rate limits, for instance — is a hand-written migration.

## Before it goes public

None of this matters on `127.0.0.1`, and all of it matters the day the URL is real.

- **Trusted proxy headers** (Settings → Application). Behind a reverse proxy every request appears to come from the proxy, so the rate limiter would count the whole world as one client and one flood would lock everybody out.
- **Restrict the superuser** to your own IP or subnet, and turn on MFA for it.
- **Backups to S3-compatible storage** on a schedule. A single-node SQLite database is exactly as durable as the disk under it.
- **SMTP on the real domain**, with SPF and DKIM, or the verification and reset mail lands in spam.
- **`--publicDir`** must point at the frontend only. Serving the repository root would publish `server/pb_data/data.db`.
- **Pin the version** — see below — and read the changelog before upgrading.

## Pin the version

PocketBase is still pre-1.0 and its own documentation says backward compatibility is not guaranteed until then. Read the changelog before upgrading and bump the version in this file and in the Dockerfile deliberately — never blindly.
