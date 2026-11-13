# TritonRent

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
  ...                 Bundled floor-plan readers; old URL redirects to Calculator
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

The rent calculator uses TritonRent's own room-weighting model. Its explanation is available with the results. Shares are allocated in whole cents so room and household totals reconcile.

Share links contain a snapshot of the plan, including names and amounts. Localhost links work only on the same computer; cross-device sharing requires hosting the app at an accessible address.

## Floor plans and roommate splits

The existing Rent → Rooms → Your split calculator now includes floor-plan uploads.
Open **http://localhost:5173/#/calculator**. The former `/roommate-split/` address
redirects to the same calculator.

1. Enter apartment rent, bedroom count, and optional monthly bills, additional fees,
   and move-in costs.
2. In Rooms, optionally upload an image, HEIC, or PDF. Review the detected room
   names and dimensions. Enter or correct each room’s length and width; floor area is calculated
   automatically and shown in both ft² and m². Choose feet
   or meters; values are stored in feet so switching units does not change rent.
3. Set each space's type and occupancy, private bathroom, and optional preference
   multiplier. Use 0 occupants for empty rooms or shared common spaces. Add names
   and optional monthly budgets.
4. View the split. Monthly bills default to equal shares; each bill can instead use
   custom percentages or be paid by one resident. Copy a summary, share a plan,
   or download its calculation breakdown.

Uploaded files stay in the current tab. The preview survives navigation between
TritonRent pages and calculator steps. Room details persist in browser storage and
share links; the uploaded file itself is never included in a share link. Review
OCR results before continuing, especially small or unclear printed dimensions.

## Calculation rules

- New room-adjusted calculations use the Roommate Split algorithm: occupied area
  × space privacy × bathroom × preference. Enclosed rooms count 100% of area,
  open dens/lofts 80%, and living-room sleeping spaces 70%. A private bathroom
  multiplies the score by 1.1. Windows and closet sizes do not change this formula.
- Each room's weight is divided equally among its occupants. Rent is allocated
  directly to residents in whole cents using largest remainder, with earlier
  residents breaking ties. Empty spaces have zero weight.
- Equal mode divides rent per resident regardless of room size.
- Each recurring bill is allocated separately according to its selected split:
  equal per resident, custom percentages adding to 100%, or a single resident.
- Deposits follow rent weights. Application fees are equal per resident. Optional
  first-month rent and bills are added to move-in costs.
- The results retain TritonRent's whole-dollar presentation, adjusted to preserve
  household totals. The CSV also lists the exact cents.
- Older saved/shared plans retain their original formula when viewed. Editing
  their rooms uses the new room-adjusted formula. The original size/common-space
  models remain available for interpreting older share links.

## Verify changes

```sh
npm run check
npm test
```

Serve files through the Node server, rather than opening `index.html` directly, so JavaScript modules and API routes work. Static content is served from `public/`, plus the explicitly allowed `roommate-split/` files. Temporary screenshots and browser-test output belong in the ignored `output/` directory.
