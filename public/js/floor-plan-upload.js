import { floorPlanText, planRooms } from '../../roommate-split/floor-plan.js';

export function createFloorPlanUpload({ getPlan, applyRooms }) {
  const panel = document.createElement('div');
  panel.className = 'floor-plan-upload';
  panel.innerHTML = `<div class="official-floor-plan" hidden></div><label class="field upload-field"><span>Apartment floor plan</span><input type="file" accept="image/*,.heic,.heif,application/pdf" aria-label="Upload floor plan" /></label><p class="upload-status" role="status"></p><div class="upload-preview"></div>`;
  const input = panel.querySelector('input');
  const official = panel.querySelector('.official-floor-plan');
  const status = panel.querySelector('.upload-status');
  const preview = panel.querySelector('.upload-preview');
  let revision = 0;
  let objectUrl;
  let automaticReadKey = '';

  const clearReading = () => {
    revision++;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    preview.replaceChildren();
    status.textContent = '';
  };

  const officialUrl = plan => {
    if (!plan.floorPlanPropertyId || !plan.floorPlan || !plan.floorPlanImage) return '';
    const query = new URLSearchParams({ id: plan.floorPlanPropertyId, plan: plan.floorPlan });
    return `/api/floor-plan-image?${query}`;
  };

  const renderOfficial = () => {
    const plan = getPlan();
    const source = officialUrl(plan);
    if (!source) { official.hidden = true; official.replaceChildren(); return; }
    official.hidden = false;
    official.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = plan.floorPlan ? `${plan.floorPlan} floor plan` : 'Selected floor plan';
    const image = document.createElement('img');
    image.src = source;
    image.alt = `${plan.floorPlan || 'Selected'} floor plan`;
    image.loading = 'lazy';
    const note = document.createElement('p');
    note.textContent = 'Official floor plan. Read the printed room measurements to prefill the editable fields below.';
    const read = document.createElement('button');
    read.type = 'button'; read.className = 'button button-outline'; read.textContent = 'Read room measurements';
    read.addEventListener('click', () => readOfficialPlan(source));
    official.append(heading, image, note, read);
  };

  async function importPlan(file) {
    clearReading();
    const current = revision;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && !/\.(pdf|heic|heif)$/i.test(file.name)) {
      status.textContent = 'Choose an image or PDF.';
      return;
    }
    const sourcePlan = getPlan();
    const sourceRooms = JSON.stringify(sourcePlan.roommates);
    objectUrl = URL.createObjectURL(file);
    const imageFile = file.type.startsWith('image/') || /\.hei[cf]$/i.test(file.name);
    const viewer = document.createElement(imageFile ? 'img' : 'iframe');
    viewer.src = objectUrl;
    if (imageFile) viewer.alt = 'Floor plan being read'; else viewer.title = 'Floor plan being read';
    const link = document.createElement('a');
    Object.assign(link, { href: objectUrl, target: '_blank', rel: 'noopener', textContent: 'Open floor plan' });
    preview.append(viewer, link);
    status.textContent = 'Reading room labels and dimensions…';
    try {
      const pages = new Map();
      const lines = await floorPlanText(file, message => { if (current === revision) status.textContent = message; }, (number, canvas) => pages.set(number, canvas));
      if (current !== revision || getPlan() !== sourcePlan) return;
      const detected = planRooms(lines);
      if (pages.size) {
        viewer.remove();
        for (const [number, canvas] of pages) {
          const figure = document.createElement('figure');
          const drawing = document.createElement('div');
          drawing.className = 'upload-drawing'; drawing.append(canvas);
          const caption = document.createElement('figcaption');
          caption.textContent = pages.size > 1 ? `Floor plan · page ${number}` : 'Floor plan with detected rooms';
          const labels = document.createElement('ol');
          for (const room of detected.filter(room => room.page === number)) {
            const marker = document.createElement('span');
            marker.className = 'upload-pin'; marker.style.left = `${room.x * 100}%`; marker.style.top = `${room.y * 100}%`;
            marker.textContent = labels.children.length + 1; marker.setAttribute('aria-hidden', 'true');
            const label = document.createElement('li');
            label.textContent = room.name + (room.length && room.width ? ` · ${room.length} × ${room.width} ft` : ' · No readable dimensions');
            labels.append(label); drawing.append(marker);
          }
          figure.append(drawing, caption, labels); preview.insertBefore(figure, link);
        }
      }
      if (!detected.length) { status.textContent = 'No room labels could be read. You can still edit the rooms and dimensions below.'; return; }
      if (JSON.stringify(sourcePlan.roommates) !== sourceRooms) { status.textContent = 'Room details changed while the floor plan was being read. Try again to apply the detected measurements.'; return; }
      applyRooms(detected.slice(0, 12));
      const missing = detected.filter(room => !room.length || !room.width).length;
      status.textContent = `Filled ${detected.length} detected sleeping spaces. You can edit every room name, length, and width below.` + (missing ? ` ${missing} space${missing === 1 ? '' : 's'} need measurements added manually.` : '');
    } catch (error) {
      if (current === revision) status.textContent = error.cause ? error.message : 'The floor plan could not be read. Try a PNG or JPEG copy.';
    }
  }

  async function readOfficialPlan(source) {
    const readButton = official.querySelector('button');
    if (readButton) readButton.disabled = true;
    status.textContent = 'Opening the official floor plan…';
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error('The official floor plan image is unavailable right now.');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('The official floor plan is not an image that can be read.');
      const planName = getPlan().floorPlan || 'floor-plan';
      await importPlan(new File([blob], `${planName}.png`, { type: blob.type }));
    } catch (error) {
      status.textContent = error.message || 'The official floor plan could not be read. You can upload a copy instead.';
    } finally {
      if (readButton) readButton.disabled = false;
    }
  }

  input.addEventListener('change', event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) importPlan(file);
  });

  return {
    mount: host => {
      if (!host) return;
      host.append(panel);
      renderOfficial();
      const plan = getPlan();
      const source = officialUrl(plan);
      const key = `${plan.floorPlanPropertyId}|${plan.floorPlan}`;
      const needsMeasurements = plan.roommates.some(room => room.occupants > 0 && !(room.length > 0 && room.width > 0));
      if (source && needsMeasurements && automaticReadKey !== key) {
        automaticReadKey = key;
        setTimeout(() => readOfficialPlan(source), 0);
      }
    },
    reset: () => { automaticReadKey = ''; clearReading(); },
  };
}
