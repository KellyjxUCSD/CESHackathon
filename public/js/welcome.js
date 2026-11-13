export function welcomeView() {
  return `<section class="welcome page-container">
    <div class="welcome-copy">
      <h1>Find a home.<br>Know your share.</h1>
      <p>Explore apartments near UC San Diego and split rent with roommates.</p>
      <div class="welcome-actions">
        <a class="button button-primary" href="#/explore">Explore apartments</a>
        <a class="button button-outline" href="#/calculator">Split rent</a>
      </div>
    </div>
    <div class="welcome-art" role="group" aria-label="Illustrative two-bedroom apartment. Select a room to compare example rent shares.">
      <img class="art-motion" src="assets/rentwise-opening.webp" alt="" width="800" height="600" decoding="async" />
      <img class="art-still" src="assets/rentwise-still.webp" alt="" width="800" height="600" decoding="async" />
      <button class="art-room art-room-one" type="button" aria-pressed="true" aria-label="Bedroom one, illustrative rent share $1,980 per month"><span>Bedroom 1</span><strong>$1,980<span class="sr-only"> per month</span></strong></button>
      <button class="art-room art-room-two" type="button" aria-pressed="false" aria-label="Bedroom two, illustrative rent share $1,620 per month"><span>Bedroom 2</span><strong>$1,620<span class="sr-only"> per month</span></strong></button>
    </div>
  </section>`;
}
