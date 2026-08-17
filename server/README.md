# Server

[PocketBase](https://pocketbase.io) **0.39.11** — one binary that is the database, the auth provider and the API.

The binary is not in git: it is ~33 MB and built per platform, and the deploy uses a Linux build. Download the version above from [the releases page](https://github.com/pocketbase/pocketbase/releases) and unzip it here.

```bash
./pocketbase serve                                  # http://127.0.0.1:8090
./pocketbase superuser create you@example.com pass   # first run only
```

The dashboard is at `/_/`. The demo account the app signs in with is a record in the `users` collection — `demo@shop.test` / `test1234`.

## What is in git and what is not

| | |
|---|---|
| `pb_migrations/` | **committed** — the schema as code. Change a collection in the dashboard and PocketBase writes the migration itself; commit it, and a fresh checkout gets the same collections. |
| `pb_hooks/` | **committed** — server-side logic. |
| `pb_data/` | ignored — the database and uploaded files. |
| the binary | ignored — see above. |

Records are data, not schema, so the demo account does not travel with the repository. Create it by hand after the first `serve`.

## Pin the version

PocketBase is still pre-1.0 and its own documentation says backward compatibility is not guaranteed until then. Read the changelog before upgrading and bump the version in this file and in the Dockerfile deliberately — never blindly.
