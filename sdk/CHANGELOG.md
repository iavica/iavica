# Changelog

All published versions are in [`versions/`](versions). `https://iavica.com/sdk/v1/iavica.js` always serves
the latest 1.x version.

## 1.2.0 · 21 November 2026

- When the app runs from a file on the computer, the SDK shows once, after connecting, a short tip in the
  app language: how to put it on the phone with My iavica. It closes with ✕ or Esc and never appears in
  published apps.

## 1.1.0 · 20 November 2026

- `list({ limit })` accepts limits above 100: the SDK fetches the pages needed and still returns `nextCursor`.
- New `listAll()`: the whole collection, following every page.
- Idempotent `add(data, { idempotencyKey })`: the same key returns the record created the first time (no
  duplicates from retries or two devices). Without a key the SDK uses its own and retries safely after
  network errors.
- The error dialog's fix prompt includes the SDK URL and version in use.

## 1.0.0 · 20 November 2026

First stable release.

- Email magic-link sign-in with explicit approval, device tokens that survive reloads, logout.
- Collections with `add`, `list` (cursor pagination, up to 100 per page), `get`, `update` and `remove`
  with optimistic concurrency.
- Owner/editor sharing, invitations and a project selector.
- Built-in dialogs: email, "Connecting to iavica… check your email", project selector, and an error dialog
  with a fix prompt for the AI that wrote the app.
- `en` / `es` locales and custom labels.
