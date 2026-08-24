# GameShop

A native macOS app — a mini digital game marketplace/library. Browse real games (via the RAWG API), "buy" them with mock currency, and manage your library and wishlist. Everything is local: no real payments, no real downloads.

## Stack

Electron + React + TypeScript + Tailwind CSS, packaged with electron-builder.

## 1. Get a RAWG API key (free, ~30 seconds)

1. Go to https://rawg.io/apidocs
2. Sign up / log in and copy your API key
3. Open `.env` in this folder and replace the placeholder:

   ```
   VITE_RAWG_API_KEY=your_actual_key_here
   ```

Until you do this, the Store tab shows a "get an API key" screen instead of games — Library and Wishlist work regardless since they're local.

## 2. Run it in dev mode

```
npm run electron
```

This starts the Vite dev server and opens the app window, with hot reload.

## 3. Build the real Mac app (goes in Applications / Dock)

```
npm run release:mac
```

This produces a `.dmg` installer in `release/`. Open it, drag **GameShop** into Applications, then launch it from Launchpad/Applications and drag it to the Dock like any other app.

(`npm run dist:mac` builds an unpacked `.app` directly in `release/mac-arm64/` if you just want to test the packaged build without a `.dmg`.)

## How it works

- **Store** — browse/search/filter games pulled live from RAWG. Prices are deterministically generated per game (same game always costs the same amount) — there's no real store backend.
- **Buy** — deducts from a mock wallet (starts at $500, "Add funds" gives +$100 anytime) and adds the game to your local library. No real money or downloads are involved.
- **Library / Wishlist** — persisted to a JSON file in the app's local data directory (`~/Library/Application Support/gameshop/gameshop-store.json`), so it survives restarts.
