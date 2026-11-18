# Book club API

NestJS 9 + Mongoose 7 API for the book club library (users, books, categories, genres, authors,
donations/copies and the borrow workflow).

```bash
nest g resource users   # generating a new resource
```

## Setup

1. `pnpm install` (native builds for `argon2`/`sharp` are allowed in `pnpm-workspace.yaml`)
2. create `.env.dev` / `.env.prod` files (see `.env.example`); `.env` only selects `NODE_ENV`
3. `pnpm start:dev`

### Environment variables worth knowing

| variable | meaning |
| --- | --- |
| `MONGODB_URI` | full connection string, overrides the `MONGO_*` variables |
| `STORAGE_PROVIDER` | `CLOUDINARY`, `S3_PROVIDER` or `LOCAL` |
| `UPLOAD_DIR` | `LOCAL` storage directory (default `<cwd>/uploads`), served at `/uploads` |
| `SERVER_URL` | public url of the API, used for `LOCAL` file urls (default `http://localhost:$PORT`) |
| `EMAIL_PROVIDER` | `console` logs verification codes instead of emailing them (also the case when `GMAIL_APP_PWD` is empty) |
| `VERIFICATION_CODE` | fixed verification code for dev/test/e2e (e.g. `000000`); ignored when `NODE_ENV=prod/production` |

## Tests

### Integration tests (Testcontainers)

Requires Docker. One MongoDB container (single node replica set, transactions work) is started for
the whole run; every test file boots the full `AppModule` (same pipes/filters/cookie parser as
`main.ts`, via `src/app.setup.ts`) against its own throw-away database.

```bash
pnpm test:int                      # all suites
pnpm test:int -- borrow            # a single file (test/integration/*.int-spec.ts)
MONGO_TEST_IMAGE=mongo:8.0 pnpm test:int
```

Safety: with `NODE_ENV=test` the API refuses to start unless `MONGODB_URI` is set explicitly and
points to `localhost` (or the testcontainers host), so tests can never reach the databases
configured in `.env*` files.

Layout:

- `test/jest-integration.json` – jest config (global setup/teardown, `@/` alias, swagger plugin transformer)
- `test/integration/setup/` – container lifecycle, per-file env and `createTestApp()`
- `test/support/` – env + seed helpers shared with the e2e server

## E2E server (for the frontend's end-to-end tests)

```bash
pnpm start:e2e            # PORT=9101 by default: PORT=9200 pnpm start:e2e
```

It builds the app (`nest build`), starts a MongoDB testcontainer, boots `dist/` exactly like
`main.ts` with `NODE_ENV=test`, `STORAGE_PROVIDER=LOCAL` (temp dir), `VERIFICATION_CODE=000000`
and `EMAIL_PROVIDER=console`, seeds data and prints `E2E API ready on http://localhost:9101`.
Ctrl+C / SIGTERM stops the app and the container.

Seeded data:

| email | password | role | status |
| --- | --- | --- | --- |
| `admin@bookclub.test` | `Admin@1234` | ADMIN | ACTIVE |
| `reader@bookclub.test` | `Reader@1234` | USER | ACTIVE |
| `pending@bookclub.test` | `Pending@1234` | USER | UN_APPROVED |

plus 2 active categories (Fiction, Christian Living) and 3 active genres (Classic, Mystery, Devotional).

## Borrow workflow

`WAITLIST` (user `POST /borrow/request/:bookId`) → `ACCEPTED` (admin `POST /borrow/acceptBorrow/:id`
with an AVAILABLE `instanceId` of the same book, the copy becomes RESERVED) → `BORROWED` (admin
`POST /borrow/markTaken/:id` with `dueDate` (> `takenDate`, which defaults to now), copy TAKEN) →
`RETURNED` (admin `POST /borrow/markReturned/:id`, `returnedDate` defaults to now, copy AVAILABLE).
Invalid transitions answer `409`, invalid input `400`.

- users cancel their own WAITLIST request: `POST /borrow/cancle/:id` (alias `/borrow/cancel/:id`)
- admins reject/remove: `DELETE /borrow/:id` or `POST /borrow/reject/:id` (`{ note? }`):
  WAITLIST → rejected and user notified, ACCEPTED → reservation cancelled and copy released,
  RETURNED → deleted, BORROWED → `409`

## compodoc

```bash
pnpm doc:serve
# and visit
http://127.0.0.1:8080
```

- sharp may cause troubles when installing but you can fix it by running `pnpm cache delete`
