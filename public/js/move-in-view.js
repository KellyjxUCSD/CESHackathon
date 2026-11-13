const beforeMove = [
  {
    title: 'Set up internet',
    action: 'Check availability for your exact unit.',
    links: [
      ['AT&T', 'https://www.att.com/support/article/internet/KM1009644/'],
      ['Verizon', 'https://www.verizon.com/home/internet/fios-fastest-internet/availability/'],
      ['Spectrum / Cox', 'https://www.cox.com/residential/local/services/ca/san-diego/internet.html'],
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
    links: [['Start or transfer SDG&E', 'https://www.sdge.com/residential/customer-service/service-requests/start-stop-move']],
    tips: [
      'Ask which utilities are included, billed by the property, or set up separately. Check water, sewer, and trash too.',
      'Save your service confirmation in case the leasing office asks for it.',
    ],
  },
  {
    title: 'Get renters insurance',
    action: 'Check your lease’s coverage requirements and when proof is due.',
    links: [
      ['Lemonade', 'https://www.lemonade.com/renters/explained/renters-insurance-california/'],
      ['Progressive', 'https://www.progressive.com/renters-insurance/'],
    ],
    tips: [
      'Use the required start date and confirm how to list the property manager if asked.',
      'Compare quotes with the same limits and deductible. Ask if roommates need separate policies.',
    ],
  },
  {
    title: 'Plan key pickup and deliveries',
    action: 'Confirm key pickup and reserve an elevator or loading dock if needed.',
    tips: [
      'Ask what ID to bring, how much is due, and which payment methods the office accepts.',
      'Check whether movers need a certificate of insurance (COI).',
      'Measure doors, elevator openings, and hallway turns before booking furniture deliveries.',
      'Ask how to get parking permits, garage remotes, and package locker access.',
    ],
  },
];

const moveInDay = [{
  title: 'Document the apartment’s condition',
  action: 'Photograph existing damage before unpacking.',
  tips: [
    'Submit the move-in condition form by the property’s deadline and keep a copy.',
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
          ${links ? `<ul class="move-in-links">${links.map(([name, url]) => `
            <li><a href="${url}" target="_blank" rel="noopener">${name}</a></li>`).join('')}
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
    </section>`;
}
