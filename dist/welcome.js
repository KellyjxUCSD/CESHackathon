export function welcomeView() {
  return `<section class="welcome page-container">
    <div class="welcome-copy"><p class="welcome-eyebrow">A clearer way to rent together</p><h1>Find a place.<br>Make the numbers work.</h1><p>Explore apartments near UC San Diego and see what each roommate could pay.</p><div class="welcome-actions"><a class="button button-primary" href="#/explore">Explore apartments</a><a class="button button-outline" href="#/calculator">Split rent</a></div><p class="welcome-note">No account needed. Your calculations stay in this browser.</p></div>
    <div class="welcome-art"><svg class="apartment-art" viewBox="0 0 600 440" role="img" aria-labelledby="art-title art-desc"><title id="art-title">Interactive two-bedroom apartment</title><desc id="art-desc">Choose a bedroom to see an example rent share.</desc>
      <g class="art-shell"><path class="art-floor" d="M74 167 292 53 532 180 313 304Z"/><path class="art-wall" d="M74 167v73l239 127v-63Z"/><path class="art-wall art-wall-side" d="M313 304v63l219-124v-63Z"/><path class="art-divider" d="M185 107 425 235M292 53v110M185 107v68M425 235v68"/><path class="art-inner-wall" d="M185 175 313 244 425 183"/></g>
      <g class="art-furniture"><path d="m113 181 55-29 49 26-55 30Z"/><path d="m340 182 57-30 52 28-57 31Z"/><path d="m242 243 51-26 49 26-51 27Z"/><path d="m274 267 24-13 23 12-24 13Z"/></g>
      <g class="art-room art-room-one" role="button" tabindex="0" aria-pressed="false" aria-label="Bedroom one, example rent share $1,980 per month"><path d="M82 166 184 112 292 170 191 225Z"/><text x="155" y="177">Room 1 · $1,980</text></g>
      <g class="art-room art-room-two" role="button" tabindex="0" aria-pressed="false" aria-label="Bedroom two, example rent share $1,620 per month"><path d="M300 169 405 113 521 178 416 236Z"/><text x="371" y="178">Room 2 · $1,620</text></g>
    </svg><p class="art-caption">Hover or tap a room to preview a sample split</p></div>
  </section>`;
}
