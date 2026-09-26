# Server

[PocketBase](https://pocketbase.io) — one binary that is the database, the auth provider, the file storage and the API.

The binary is not in git: ~33 MB, one build per platform, and the deploy uses the Linux one. It is fetched instead, from the version pinned in **`.pb-version`** — the only place that number appears, so an upgrade is one line and both the setup script and the Dockerfile follow it.

```bash
./setup.sh                                                  # or .\setup.ps1 on Windows
./pocketbase serve --publicDir=..                           # http://127.0.0.1:8090
./pocketbase superuser create you@example.com yourpassword  # first run only
```

`--publicDir=..` makes PocketBase serve the shop as well as the API: one origin, no CORS, and `--indexFallback` (on by default) sends unknown paths to `index.html`, which is the SPA fallback the router needs. There is no Live Server in the loop, so nothing reloads the page when a write lands in the database.

The trade is that `..` is the whole repository, `/server/pb_data/data.db` included. `pb_hooks/private.pb.js` refuses everything under `/server/` and every name that starts with a dot, `.git` among them, so the command above gives none of it away, even on a machine where somebody runs it facing the internet. The deploy does not lean on that: the image copies only the frontend into `pb_public/` and leaves the server folder out.

The dashboard is at `/_/`. The demo account the app signs in with is a record in the `users` collection — `demo@shop.test` / `test1234`.

To try the shop from a phone before it is deployed, a Cloudflare quick tunnel gives this machine a public HTTPS address, with no account and no open port: `cloudflared tunnel --url http://127.0.0.1:8090`. Set **Application URL** to the address it prints, so the links in mails and Telegram messages lead there, and back afterwards; the address changes every time the tunnel starts. A quick tunnel holds back Server-Sent Events, which is what realtime runs on, so nothing arrives live through it — the chat and the inbox load and work, and a reload shows what is new.

## What is in git and what is not

| | |
|---|---|
| `pb_migrations/` | **committed** — the schema as code. Change a collection in the dashboard and PocketBase writes the migration itself; commit it, and a fresh checkout gets the same collections. |
| `pb_hooks/` | **committed** — server-side logic; see the README in there. |
| `mail/` | **committed** — every mail the shop sends, as a template; see the README in there, and `/admin/mail`. |
| `lang/` | **committed** — what the hooks say, one file per language: a refusal a page shows, a Telegram message. |
| `.pb-version`, `setup.*`, `Dockerfile` | **committed** — how the binary is obtained, in dev and in production. |
| `pb_data/` | ignored — the database and uploaded files. |
| the binary | ignored — see above. |

Records are data, not schema, so the demo account does not travel with the repository. Create it by hand after the first `serve`.

Settings are the exception to all of this: unlike collections, PocketBase does not write them to a migration when you change them in the dashboard. Anything that must survive a fresh checkout — the rate limits, for instance — is a hand-written migration.

## Before it goes public

None of this matters on `127.0.0.1`, and all of it matters the day the URL is real.

- **Trusted proxy headers** (Settings → Application). Behind a reverse proxy every request appears to come from the proxy, so the rate limiter would count the whole world as one client and one flood would lock everybody out.
- **Restrict the superuser** to your own IP or subnet, and turn on MFA for it.
- **Backups to S3-compatible storage** on a schedule. A single-node SQLite database is exactly as durable as the disk under it.
- **`{APP_URL}` under Settings → Application.** A fresh install sets it to `http://localhost:8090`, and every mail template builds its link from it — so locally nothing ever complains, and in production every verification and reset link sends your customers to their own machine. Nothing fails loudly; you find out from the first real account. The **Application name** beside it is what every mail signs with, and it ships as Acme.
- **SMTP on the real domain**, with SPF and DKIM, or the verification and reset mail lands in spam.
- **`--publicDir`** must point at the frontend only. `pb_hooks/private.pb.js` keeps the repository root from giving away `server/pb_data/data.db`, but that is a guard for the dev command, not a way to deploy.
- **Pin the version** — see below — and read the changelog before upgrading.

## Deploying

The `Dockerfile` builds from this app's root, because it has to reach the frontend:

```bash
docker build -f server/Dockerfile --build-arg PB_VERSION=$(cat server/.pb-version) -t shop .
docker run -p 8090:8090 -v pb_data:/pb/pb_data shop
```

It copies the frontend into `pb_public/` **file by file**, on purpose. Copying the app and deleting `server/` afterwards works right up until somebody forgets, and then `pb_data/data.db` is a public download.

Mount `pb_data` as a volume or the first redeploy takes every account and order with it.

## Pin the version

PocketBase is still pre-1.0 and its own documentation says backward compatibility is not guaranteed until then. Upgrading is one line — bump `.pb-version` and re-run the setup script — but read the changelog first, never blindly. What the newest release is:

```powershell
(Invoke-RestMethod https://api.github.com/repos/pocketbase/pocketbase/releases/latest).tag_name
```
