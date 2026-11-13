const beforeMove = [
  {
    title: 'Set up internet',
    action: 'Check availability for your exact unit.',
    links: [
      ['AT&amp;T', 'https://www.att.com/support/article/internet/KM1009644/', 'https://upload.wikimedia.org/wikipedia/commons/7/73/AT%26T_logo_used_from_2015-today.png'],
      ['Verizon', 'https://www.verizon.com/home/internet/fios-fastest-internet/availability/', 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Verizon_2024_%28symbol%29.svg'],
      ['Spectrum / Cox', 'https://www.cox.com/residential/local/services/ca/san-diego/internet.html', 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Charter_Spectrum_logo.svg'],
    ],
    tips: [
      'Ask the leasing office if internet is included or if the building has preferred providers.',
      'Compare the price after promotions and any equipment fees.',
      'Check whether you can self-install. If you need a technician, book a slot after key pickup.',
    ],
  },
  {
    title: 'Start electricity and gas',
    action: 'If you pay SDG&E directly, schedule service for the date your lease requires.',
    links: [['Start or transfer SDG&amp;E', 'https://www.sdge.com/residential/customer-service/service-requests/start-stop-move', 'https://www.sdgetoday.com/sites/default/files/styles/small_16_9/public/2024-05/SDGE_full%20color_RGB_0323.jpg?itok=A0-HCPtB']],
    tips: [
      'Ask which utilities are included, billed by the property, or set up separately. Check water, sewer, and trash too.',
      'Save your <strong>service confirmation</strong> in case the leasing office asks for it.',
    ],
  },
  {
    title: 'Get renters insurance',
    action: 'Check your lease’s <strong>coverage requirements</strong> and when proof is due.',
    links: [
      ['Lemonade', 'https://www.lemonade.com/renters/explained/renters-insurance-california/', 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Logo_of_Lemonade%2C_Inc.svg'],
      ['Progressive', 'https://www.progressive.com/renters-insurance/', 'https://design.progressive.com/uploads/progressive_logo_9e9f26946c.svg'],
      ['GEICO', 'https://www.geico.com/renters-insurance/states/ca/', 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Geico_logo.svg'],
      ['AAA', 'https://www.ace.aaa.com/insurance', 'https://upload.wikimedia.org/wikipedia/commons/d/d4/American-Automobile-Association-Logo.svg'],
    ],
    tips: [
      'Use the required start date and confirm how to list the property manager if asked.',
      'Compare quotes with the same limits and deductible. Ask if roommates need separate policies.',
    ],
  },
  {
    title: 'Plan key pickup and deliveries',
    action: 'Confirm <strong>key pickup</strong> and reserve an elevator or loading dock if needed.',
    tips: [
      'Ask what ID to bring, how much is due, and which payment methods the office accepts.',
      'Check whether movers need a <strong>Certificate of Insurance (COI)</strong>.',
      'Measure doors, elevator openings, and hallway turns before booking furniture deliveries.',
      'Ask how to get parking permits, garage remotes, and package locker access.',
    ],
  },
];

const moveInDay = [{
  title: 'Document the apartment’s condition',
  action: 'Photograph existing damage before unpacking.',
  tips: [
    'Submit the <strong>move-in condition form</strong> by the property’s deadline and keep a copy.',
    'Test keys, fobs, locks, lights, outlets, water, appliances, and internet.',
    'Report problems to management in writing.',
  ],
}];

function checklist(items) {
  return `<ul class="move-in-list">${items.map(({ title, action, links, tips }) => `
    <li>
      <details class="move-in-item">
        <summary>
          <span class="move-in-label">
            <span class="move-in-title">${title}</span>
            <span class="move-in-action">${action}</span>
          </span>
          <span class="move-in-chevron" aria-hidden="true"></span>
        </summary>
        <div class="move-in-detail">
          ${links ? `<ul class="move-in-links">${links.map(([name, url, logo]) => `
            <li><a href="${url}" target="_blank" rel="noopener"><img src="${logo}" alt="" loading="lazy" referrerpolicy="no-referrer" />${name}</a></li>`).join('')}
          </ul>` : ''}
          <ul class="move-in-tips">${tips.map(tip => `<li>${tip}</li>`).join('')}</ul>
        </div>
      </details>
    </li>`).join('')}</ul>`;
}

export function moveInView() {
  return `
    <header class="page-intro">
      <h1>Move-in Guide</h1>
      <p>An off-campus checklist for UC San Diego students.</p>
    </header>
    <section class="move-in-section" aria-labelledby="before-move-heading">
      <h2 id="before-move-heading">Before you move</h2>
      ${checklist(beforeMove)}
    </section>
    <section class="move-in-section" aria-labelledby="move-in-day-heading">
      <h2 id="move-in-day-heading">On move-in day</h2>
      ${checklist(moveInDay)}
    </section>
    <p class="move-in-closing">You’re one step closer to home! <span class="move-in-emoji" aria-hidden="true">🏡</span></p>`;
}
