import { floorPlanText, planRooms } from '../../roommate-split/floor-plan.js';

export function createFloorPlanUpload({ getPlan, applyRooms }) {
  const panel = document.createElement('div');
  panel.className = 'floor-plan-upload';
  panel.innerHTML = `<label class="field upload-field"><span>Apartment floor plan</span><input type="file" accept="image/*,.heic,.heif,application/pdf" aria-label="Upload floor plan" /></label><p class="upload-status" role="status"></p><div class="upload-preview"></div>`;
  const status = panel.querySelector('.upload-status'), preview = panel.querySelector('.upload-preview');
  let revision = 0, url;
  const reset = () => { revision++; if (url) URL.revokeObjectURL(url); url = null; preview.replaceChildren(); status.textContent = ''; };
  panel.querySelector('input').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    reset();
    const current = revision;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && !/\.(pdf|heic|heif)$/i.test(file.name)) {
      status.textContent = 'Choose an image or PDF.'; return;
    }
    const sourcePlan = getPlan();
    const sourceRooms = JSON.stringify(sourcePlan.roommates);
    url = URL.createObjectURL(file);
    const image = file.type.startsWith('image/') || /\.hei[cf]$/i.test(file.name);
    const viewer = document.createElement(image ? 'img' : 'iframe');
    viewer.src = url;
    if (image) viewer.alt = 'Uploaded apartment floor plan'; else viewer.title = 'Uploaded apartment floor plan';
    const link = document.createElement('a');
    Object.assign(link, {href:url, target:'_blank', rel:'noopener', textContent:'Open original floor plan'});
    preview.append(viewer, link);
    status.textContent = 'Reading room labels and dimensions…';
    try {
      const pages = new Map();
      const lines = await floorPlanText(file, message => { if (current === revision) status.textContent = message; }, (number, canvas) => pages.set(number, canvas));
      if (current !== revision || getPlan() !== sourcePlan) return;
      const detected = planRooms(lines);
      if (pages.size) {
        viewer.remove();
        for (const [number,canvas] of pages) {
          const figure = document.createElement('figure'), drawing = document.createElement('div');
          drawing.className = 'upload-drawing';
          drawing.append(canvas);
          const caption = document.createElement('figcaption');
          caption.textContent = pages.size > 1 ? `Floor plan · page ${number}` : 'Your floor plan';
          const labels = document.createElement('ol');
          for (const room of detected.filter(room => room.page === number)) {
            const marker = document.createElement('span');
            marker.className = 'upload-pin';
            marker.style.left = `${room.x*100}%`; marker.style.top = `${room.y*100}%`;
            marker.textContent = labels.children.length + 1; marker.setAttribute('aria-hidden','true');
            const label = document.createElement('li');
            label.textContent = room.name + (room.length && room.width ? ` · ${room.length} × ${room.width} ft` : ' · Add missing dimensions below');
            labels.append(label); drawing.append(marker);
          }
          figure.append(drawing, caption, labels);
          preview.insertBefore(figure,link);
        }
      }
      if (!detected.length) { status.textContent = 'No room labels could be read. Try a clearer plan or add rooms below.'; return; }
      if (JSON.stringify(sourcePlan.roommates) !== sourceRooms) { status.textContent = 'Room details changed while the file was being read. Upload again to apply the detected rooms.'; return; }
      applyRooms(detected.slice(0,12));
      const missing = detected.filter(room => !room.length || !room.width).length;
      status.textContent = `Found ${detected.length} sleeping spaces. Review room sizes and who sleeps where below.` + (missing ? ` Add dimensions or an area for ${missing} spaces.` : '') + (detected.length > 12 ? ' The first 12 spaces were imported.' : '');
    } catch (error) {
      if (current === revision) status.textContent = error.cause ? error.message : 'The floor plan could not be read. Try a PNG or JPEG copy.';
    }
  });
  return { mount: host => host?.append(panel), reset };
}
