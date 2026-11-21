# iavica SDK

The script every iavica app loads. It connects a single HTML file to iavica: sign-in by email, data
saved in collections, sharing with invitations, and its own dialogs (email, "check your email",
project selector, and an error dialog with a ready-made fix prompt for the AI that wrote the app).

```html
<script src="https://iavica.com/sdk/v1/iavica.js"></script>
```

Full documentation: [Quickstart](https://iavica.com/docs/quickstart/) ·
[Guide for AI assistants](https://iavica.com/ai) · [API reference](https://iavica.com/docs/api/).

## What is here

| Path | Contents |
|---|---|
| [`src/`](src) | TypeScript source: `index.ts` (connection, sessions, collections) and `ui.ts` (dialogs, English and Spanish texts). |
| [`versions/`](versions) | Every published version, byte for byte as iavica.com serves it, with its source map. |
| [`versions/versions.json`](versions/versions.json) | Version list with dates and Subresource Integrity hashes. |
| [`CHANGELOG.md`](CHANGELOG.md) | What changed in each version. |

## Which URL to use

| URL | Behaviour |
|---|---|
| `https://iavica.com/sdk/v1/iavica.js` | **Recommended.** The latest 1.x version: compatible fixes only, so the app keeps working. |
| `https://iavica.com/sdk/1.2.0/iavica.js` | An exact version that never changes. Can be loaded with `integrity` (hash in `versions.json`) and `crossorigin="anonymous"`. |

A breaking change would be published as a new major version (`/sdk/v2/`); `/sdk/v1/` keeps working.

## Verify what your app runs

The files in `versions/` are the ones iavica.com serves:

```sh
curl -s https://iavica.com/sdk/1.2.0/iavica.js | diff - versions/1.2.0/iavica.js && echo identical
```

And the source builds the same code (only the first comment line, the banner, can differ):

```sh
cd sdk
npm install
npm run build        # writes dist/iavica.js
diff <(tail -n +2 dist/iavica.js) <(tail -n +2 versions/1.2.0/iavica.js) && echo identical
```

## API at a glance

```js
const db = Iavica.connect({ appId, appName, locale: 'en' });   // 'en' | 'es', or custom labels
await db.ready();                                              // sign-in by email the first time

const items = db.collection('items');
await items.listAll();                                         // the whole collection
await items.list({ limit: 20, cursor });                       // { items, nextCursor }, newest first
await items.get(id);
await items.add(data, { idempotencyKey });                     // the key avoids duplicates
await items.update(id, data, { version });                     // data is the full new object
await items.remove(id, { version });

db.getRole();                                                  // 'owner' | 'editor'
await db.invite(email);                                        // owner only
await db.logout();
```

Errors carry `status` and `code`: `401` (session), `409` (`VERSION_CONFLICT`: changed on another
device), `429` (`RATE_LIMITED` or `TEMPORARILY_BLOCKED`: wait `Retry-After` seconds). The full list:
[iavica.com/ai#errors](https://iavica.com/ai#errors).

## License

MIT, © iavica.com ([`LICENSE`](../LICENSE)).
