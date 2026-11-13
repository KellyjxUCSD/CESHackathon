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

## Calculation rules

- Room-based estimates: common spaces account for 35%, 50%, or 65% of rent for Small, Average, or Large. This share is split equally per resident. The remaining rent follows each room's adjusted area.
- Bedroom size presets: Small = 80 sq ft, Medium = 120 sq ft, Large = 180 sq ft. Exact measurements can be entered in More room details.
- Effective room area multiplies actual area by these optional adjustments: no windows ×0.90, large windows ×1.05; no closet ×0.95, large closet ×1.08; private half bath ×1.06, private full bath ×1.12. Standard features use ×1.
- Equal mode divides rent equally per person. A two-person room pays two shares.
- Bills and household application fees are split equally per person. Deposits follow the rent allocation.
- Shared rooms divide their room costs between occupants; any cent differences appear in the displayed per-person range.
- Move-in: deposit + total application fees + optional first month of rent and bills. The deposit is separate from recurring monthly costs.
- Whole-cent allocation preserves household, room, and resident totals exactly.
- Old share links using the original size-only method remain readable.

The interface references [Splitwise's rent calculator](https://www.splitwise.com/calculators/rent). The room estimate formula above is Rentwise's own transparent model; it does not reproduce Splitwise's algorithm.

## Checks

```sh
npm run check
npm test
```

## MVP boundaries

Listings, prices, amenities, and commute details are sample data from the supplied concept. Photos are illustrative images from Unsplash. This is not a live listing feed. There are no accounts, payments, bookings, or real-time collaboration. Data stays in the browser unless the user copies a share link or downloads a breakdown. Plus Jakarta Sans loads from Google Fonts with a system sans-serif fallback.

## Files

- `index.html`, `styles.css`, `app.js`: interface and browser behavior.
- `calculator.js`: validated room data, currency allocation, and share-link encoding.
- `calculator-view.js`, `calculator.css`: the three-step calculator interface.
- `server.mjs`: dependency-free localhost server that only exposes public app files.
- `tests/calculator.test.mjs`: money calculations, data validation, and sharing checks.
- `DESIGN.md`: final product design decisions and original reference.
- `rentwise_project_export.md`: original page concepts, preserved for reference.
