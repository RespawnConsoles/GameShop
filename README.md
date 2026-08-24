# GameShop

A native macOS app — a mini digital game marketplace/library. Browse games, "buy" them with mock currency, and manage your library and wishlist. Fully self-contained: no API key, no internet connection, no setup step — everything is bundled into the app.

## Stack

Electron + React + TypeScript + Tailwind CSS, packaged with electron-builder.

## Catalog

The store ships with the games from the Respawn Consoles **RC Game Store**: Console Drop, Power Surge, Console Clicker, Split Valley, and Dungeon Architect. Cover art and game data are bundled directly into the app (`src/lib/catalog.ts`, `src/assets/games/`) — nothing is fetched at runtime.

## 1. Run it in dev mode

```
npm run electron
```

This starts the Vite dev server and opens the app window, with hot reload.

## 2. Build the real Mac app (goes in Applications / Dock)

```
npm run release:mac
```

This produces a `.dmg` installer in `release/`. Open it, drag **GameShop** into Applications, then launch it from Launchpad/Applications and drag it to the Dock like any other app. Once built, the app needs nothing else installed to run — no Node, no npm, no network.

(`npm run dist:mac` builds an unpacked `.app` directly in `release/mac-arm64/` if you just want to test the packaged build without a `.dmg`.)

## How it works

- **Store** — browse/filter the bundled game catalog.
- **Buy** — deducts from a mock wallet (starts at $500, "Add funds" gives +$100 anytime) and adds the game to your local library. No real money or downloads are involved.
- **Library / Wishlist** — persisted to a JSON file in the app's local data directory (`~/Library/Application Support/gameshop/gameshop-store.json`), so it survives restarts.

## Adding more games to the catalog

Add an entry to the `CATALOG` array in `src/lib/catalog.ts`, with a cover image imported from `src/assets/games/`.
