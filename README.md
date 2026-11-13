# Rentwise

A working, browser-local MVP for exploring example apartments near UC San Diego and splitting household costs.

## Preview

Requires Node.js 18 or newer. No installation or API keys needed.

```sh
npm run dev
```

Open **http://localhost:5173**. To choose another port: `PORT=3000 npm run dev`.

## Try the full flow

1. Search the three example apartments or use the bedroom, price, and trolley filters.
2. Use the bookmark to save an apartment. Open **All filters → Saved apartments only** to see saved places. Sorting is also in All filters.
3. Click **Calculate rent split** on an apartment, or open **Calculator** for your own rent.
4. Enter monthly rent and choose one to six bedrooms. Bills, deposits, and fees are under **Bills & move-in costs**.
5. Click **Next: rooms**. Set each room's size, name, and number of occupants. Bathroom, windows, closet, and exact area are optional. Use **Equally per person** for an equal split.
6. Click **Next room**, then **Show rent split**. Review monthly rent and bills, share a link, or download the breakdown.

Saved places and your current calculation persist in local storage. Share links contain a snapshot, so a recipient can open and edit their own copy. For sharing across devices, host the static files at an accessible URL; a localhost link only works on the same computer.

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
Rentwise pages and calculator steps. Room details persist in browser storage and
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
- The results retain Rentwise's whole-dollar presentation, adjusted to preserve
  household totals. The CSV also lists the exact cents.
- Older saved/shared plans retain their original formula when viewed. Editing
  their rooms uses the new room-adjusted formula. The original size/common-space
  models remain available for interpreting older share links.

## Checks

```sh
npm run check
npm test
```

## MVP boundaries

Listings, prices, amenities, and commute details are sample data from the supplied concept. Photos are illustrative images from Unsplash. This is not a live listing feed. There are no accounts, payments, bookings, or real-time collaboration. Data stays in the browser unless the user copies a share link or downloads a breakdown. Plus Jakarta Sans loads from Google Fonts with a system sans-serif fallback.

## Files

- `index.html`, `styles.css`, `app.js`: interface and browser behavior.
- `calculator.js`, `roommate-logic.js`: validated room data, rent/bill allocation, and share-link encoding.
- `floor-plan-upload.js`, `roommate-split/floor-plan.js`: in-calculator uploads and browser-local image/PDF text recognition.
- `calculator-view.js`, `calculator.css`: the three-step calculator interface.
- `server.mjs`: dependency-free localhost server that only exposes public app files.
- `tests/calculator.test.mjs`: money calculations, data validation, and sharing checks.
- `DESIGN.md`: final product design decisions and original reference.
- `rentwise_project_export.md`: original page concepts, preserved for reference.
