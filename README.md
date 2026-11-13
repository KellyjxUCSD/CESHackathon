# Rentwise

Explore apartments around La Jolla and UC San Diego, then split rent and bills between roommates.

## Run locally

Requires Node.js 18 or newer. No dependency installation is needed.

```sh
npm run dev
```

Open **http://localhost:5173**. Use `PORT=3000 npm run dev` to choose another port.

The server reads optional settings from the root `.env` file. `GOOGLE_MAPS_API_KEY` enables the Google Maps view. Keep `.env` local; it is ignored by Git.

## Repository layout

```text
public/
  index.html          App entry page
  js/                 Browser modules, apartment data, and rent calculations
  css/                Shared, welcome, explore, and calculator styles
  assets/             Images and favicon used by the app
server/
  index.mjs           Local server and API routes
  rents.mjs           Property website parsers and rent fetching
roommate-split/
  ...                 Standalone roommate calculator and bundled file readers
tests/
  calculator.test.mjs Calculation, sharing, and presentation checks
  rents.test.mjs      Rent parser and apartment data checks
docs/
  design.md           Design principles and references
```

## Features

- Welcome page with an interactive apartment illustration.
- Apartment search, map, filters, and property details. Rent data is fetched from property websites when supported; availability depends on those sources.
- Rent splitting by room size and features, or equally per person. Shared rooms, bills, deposits, and application fees are supported.
- Local browser storage, shareable plan links, and CSV downloads.

The rent calculator uses Rentwise's own room-weighting model. Its explanation is available with the results. Shares are allocated in whole cents so room and household totals reconcile.

Share links contain a snapshot of the plan, including names and amounts. Localhost links work only on the same computer; cross-device sharing requires hosting the app at an accessible address.

## Verify changes

```sh
npm run check
npm test
```

Serve files through the Node server, rather than opening `index.html` directly, so JavaScript modules and API routes work. Static content is served from `public/`, plus the explicitly allowed `roommate-split/` files. Temporary screenshots and browser-test output belong in the ignored `output/` directory.
