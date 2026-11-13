# TritonRent design

Keep the app minimal, direct, and easy to understand. The user's neutral Explore and Calculator references guide the visual style. The [Splitwise rent calculator](https://www.splitwise.com/calculators/rent) informs the guided rent-splitting flow.

## Visual style

- Plus Jakarta Sans throughout, with a system sans-serif fallback.
- Near-white background (`#F9FAFB`), white surfaces, dark text and actions (`#111827`), pale gray input rows (`#F3F4F6`), and subtle borders (`#E2E5EB`).
- Short headings, plain labels, restrained spacing, and clearly labeled buttons.
- Keep secondary settings and detailed explanations inside disclosures.

## User experience

- Help people explore apartments and understand what each roommate pays.
- Keep the current step, selected options, and calculation results clear.
- Explain why room features change the split and distinguish rent from bills and move-in costs.
- Label estimates and explain when property prices cannot be retrieved.
- Support keyboard navigation, visible focus, labeled inputs, reduced motion, and narrow screens.
- Save calculations locally. Explain that shared links include the plan's names and amounts.

## File ownership

- `public/css/styles.css`: shared styles.
- `public/css/welcome.css` and `public/js/welcome.js`: welcome screen.
- `public/css/explore.css` and `public/js/explore-view.js`: apartment browsing.
- `public/css/calculator.css` and `public/js/calculator-view.js`: calculator interface.
- `public/js/calculator.js`: calculation model, validation, export, and sharing.
- `public/js/app.js`: navigation and interactions.
