const $ = id => document.getElementById(id);
const demo = 'University City 2B2B near UC San Diego. Advertised rent is $2,400 per month on a 12-month lease. Water and sewer are included. Electricity is billed separately. Parking is available. Contact the leasing office for the full fee sheet and move-in charges.';
const labels = {rent:'Base rent', building:'Required monthly fees', parking:'Parking', internet:'Internet', insurance:'Renters insurance', utilities:'Energy / utilities', deposit:'Refundable deposit', move:'One-time move-in fees'};
const hints = {rent:'Check the advertised monthly price for your lease term.', building:'Ask for the itemized mandatory monthly fee sheet.', parking:'Ask for the monthly price per vehicle.', internet:'Ask whether an internet package is required and what it costs.', insurance:'Check the coverage requirement, then get a premium quote.', utilities:'Check which utilities the lease includes, or use a local estimate below.', deposit:'Ask how much is refundable and when it is due.', move:'Ask for application, admin, and other one-time charges and their due dates.'};
const makePerson = name => ({name, area:'', bath:false, preference:1, budget:''});
function blank(){
  return {fees:Object.entries(labels).map(([id,label])=>({id,label,amount:null,source:'',status:'Needs checking', type:id==='deposit'?'deposit':id==='move'?'once':'monthly', due:['rent','deposit','move'].includes(id),split:'equal',custom:[]})), beds:'',baths:'',rooms:[],months:'', listing:'',people:[makePerson('Roommate 1'),makePerson('Roommate 2')],method:'equal',parking:false,water:false,waterSeparate:false, upfront:1,start:'',end:'',commute:''};
}
function readDraft(){
  try { return JSON.parse(localStorage.getItem('roommate-split-v1')); } catch { return null; }
}
let state = readDraft() || blank();
const calculatorPage = Boolean($('listing'));
const roommatePage = Boolean($('people'));
state.beds ??= state.layout ? state.layout[0] : '';
state.baths ??= state.layout ? state.layout[2] : '';
state.rooms ??= [];
if(roommatePage){
  for(const room of state.rooms){
    if(room.page && room.dimensionsEdited!==true && room.length && room.width && !plausiblePlanSize(+room.length,+room.width)){
      room.length='';
      room.width='';
    }
  }
}
if(state.method==='weighted' && !state.rooms.length && state.people.some(p=>p.area)){
  for(const person of state.people){
    const room = makeRoom(person.name + '’s room');
    Object.assign(room,{bath:person.bath,preference:person.preference});
    state.rooms.push(room);
    person.room=room.id;
  }
}
function makeRoom(name){
  return {id:crypto.randomUUID?.() || String(Date.now()+Math.random()),name,kind:'bedroom',length:'',width:'',bath:false,preference:1,tenants:''};
}
const save = () => {try {localStorage.setItem('roommate-split-v1',JSON.stringify(state));} catch {}};
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:cents%100?2:0}).format(cents/100);
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cents = value => value===''||value==null||!Number.isFinite(+value)||+value<0 ? null : Math.round(+value*100);
const active = fee => fee.id!=='parking'||state.parking;
const feeById = id => state.fees.find(fee=>fee.id===id);
const monthly = () => state.fees.filter(f=>f.type==='monthly'&&(f.id==='rent'||f.amount!==null));
const pending = fees => fees.filter(f=>f.amount===null);
const count = fees => fees.reduce((sum,f)=>sum+(f.amount??0),0);
const leaseMonths = () => Number.isInteger(+state.months)&&+state.months>0 ? +state.months : 0;
function importText(){
  const text = state.listing.trim();
  if (!text){ $('notice').textContent='Paste listing details to find fees.'; return; }
  const layout = text.match(/\b(\d+)\s*b(?:ed(?:room)?s?)?\s*(?:[\/,·-]|and)?\s*(\d+(?:\.5)?)\s*b(?:ath(?:room)?s?)?\b/i);
  if(layout) [state.beds,state.baths]=layout.slice(1,3);
  else if(/\bstudio\b/i.test(text)) state.beds='0';
  const term=text.match(/\b(\d+)\s*[- ]?months?\s*(?:lease|term)/i);
  if(term) state.months=term[1];
  const parts=text.split(/\n+|(?<=[.!?;])\s+/).map(part=>part.trim()).filter(Boolean);
  const patterns={rent:/\b(?:base rent|advertised rent|rent)\b/i,building:/\b(?:building|amenity|mandatory|admin(?:istration)?|service|technology|community)\b.{0,25}\bfee\b/i,parking:/\bparking\b/i,internet:/\b(?:internet|wi-fi|wifi)\b/i,insurance:/\binsurance\b/i,utilities:/\b(?:electricity|energy|utilities|gas)\b/i,deposit:/\b(?:refundable|security) deposit\b/i,move:/\b(?:application|move-in|admin(?:istration)?)\b.{0,20}\bfee\b/i};
  const ambiguities=[];
  let found=0;
  for(const [id,pattern] of Object.entries(patterns)){
    const fee=feeById(id);
    const candidates=parts.filter(part=>pattern.test(part)&& (id!=='building'||!/one.time|application|move.in/i.test(part))&&(id!=='move'||!/monthly|per month/i.test(part)));
    const priced=[];
    const included = candidates.find(part=>/included|no charge/i.test(part)&&!/not included|excluded|if included/i.test(part));
    if(id==='utilities' && candidates.some(part=>/billed separately/i.test(part))) {
      fee.source ||= candidates.find(part=>/billed separately/i.test(part));
    }
    for(const part of candidates){
      const values=[...part.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)];
      if(values.length) priced.push(...values.map(match=>({value:cents(match[1].replaceAll(',','')),part})));
    }
    const unique=[...new Set(priced.map(entry=>entry.value))];
    if(unique.length>1 || (unique.length && priced.some(entry=>/starting at|depending on|varies|up to/i.test(entry.part)))){
      fee.amount=null; fee.status='Needs checking'; fee.source=priced.map(entry=>entry.part).filter((part,i,all)=>all.indexOf(part)===i).join(' ');
      ambiguities.push(fee.label); continue;
    }
    if(unique.length===1){fee.amount=unique[0];fee.source=priced[0].part;fee.status='Listed';found++;}
    else if(included && !(id==='utilities' && candidates.some(part=>/billed separately/i.test(part)))){
      fee.amount=0;fee.source=included;fee.status='Included';found++;
    }else if(!fee.source&&candidates.length){fee.source=candidates[0];}
  }
  for(const part of parts){
    if(/\bwater\b/i.test(part)&&/\bsewer\b/i.test(part)){
      if(/included/i.test(part)&&!/not included/i.test(part)){state.water=true;state.waterSeparate=false;}
      if(/not included|billed separately|tenant pays/i.test(part)){state.water=false;state.waterSeparate=true;}
    }
  }
  render();
  $('notice').textContent=(found ? 'Found '+found+' listed or included cost'+(found===1?'':'s')+'. ' : 'No explicit prices found. ')+(ambiguities.length?'Review pricing options for '+ambiguities.join(', ')+'.':'Review the items that still need checking.');
}
function renderFees(){
  $('fees').innerHTML=state.fees.map((f,i)=>'<div class="fee"><div><label for="amount'+i+'">'+esc(f.label)+'</label><span class="status" id="status'+i+'">'+esc(f.status)+'</span></div><input id="amount'+i+'" data-fee="'+i+'" type="number" min="0" step="0.01" placeholder="Unknown" value="'+(f.amount===null?'':f.amount/100)+'">'+
  (f.source?'<p>“'+esc(f.source)+'”</p>':'')+
  (f.amount===null?'<p>'+esc(hints[f.id]||'Check the amount with the leasing office.')+'</p>':'')+
  (i>=Object.keys(labels).length?'<label>Timing<select data-type="'+i+'"><option value="monthly" '+(f.type==='monthly'?'selected':'')+'>Monthly</option><option value="once" '+(f.type==='once'?'selected':'')+'>One-time</option><option value="deposit" '+(f.type==='deposit'?'selected':'')+'>Refundable deposit</option></select></label>':'')+
  (f.id==='rent'?'':'<label class="check"><input type="checkbox" data-due="'+i+'" '+(f.due?'checked':'')+'> Due before move-in</label>')+'</div>').join('');
}
function renderBench(){
  const ranges={0:[[82,95],[242,255]],1:[[96,114],[264,282]],2:[[125,157],[349,381]],3:[[156,200],[482,526]],4:[[187,241],[519,573]],5:[[219,284],[551,616]]};
  const selected = state.beds==='' ? ['1','2'] : [state.beds];
  $('bench').innerHTML=selected.map(beds=>{
    if(!ranges[beds]) return '<p>Use a property estimate or a recent bill for this bedroom count.</p>';
    const label=beds==='0'?'Studio':beds+' bedroom'+(beds==='1'?'':'s');
    return '<strong>'+label+'</strong>'+ranges[beds].map(([low,high],i)=>{
    const title=i?'Energy, water & sewer':'Energy only';
    const match=i?state.waterSeparate:state.water;
    return '<div class="range"><span>'+title+(match?' <span class="status">Matches listing</span>':'')+'<br><strong>$'+low+'–$'+high+' / mo</strong></span><button class="secondary" data-mid="'+((low+high)/2)+'" aria-label="Use midpoint for '+label+' '+title+'">Use midpoint</button></div>';
    }).join('');
  }).join('');
}
function metric(label,value,unknown,description=''){
  return '<div class="metric"><small>'+label+'</small><strong>'+value+'</strong>'+(unknown.length?'<small>Partial estimate · Check '+esc(unknown.map(f=>f.label.toLowerCase()).join(', '))+'</small>':'')+description+'</div>';
}
function updateTotals(){
  const rent=feeById('rent');
  $('totals').innerHTML=metric('Estimated monthly cost',rent.amount===null?'Enter apartment rent':money(count(monthly())),[]);

}
function renderPeople(){
  const showRoomAssignment=state.method==='weighted'||state.rooms.length>0;
  $('weightHelp').hidden=state.method!=='weighted';
  $('roomAssignmentHelp').hidden=!showRoomAssignment;
  $('people').innerHTML=state.people.map((person,i)=>'<div class="person"><div class="two"><label>Roommate name<input data-person="'+i+'" data-key="name" value="'+esc(person.name)+'"></label><label>Monthly budget ($, optional)<input type="number" min="0" step="0.01" data-person="'+i+'" data-key="budget" value="'+esc(person.budget)+'"></label></div>'+
  '<p class="small" id="budgetStatus'+i+'" aria-live="polite" hidden></p>'+
  (showRoomAssignment?'<label>Where will this roommate sleep?<select aria-describedby="roomAssignmentHelp" data-person="'+i+'" data-key="room"><option value="">Choose a room or area</option>'+state.rooms.filter(includedInRent).map(r=>'<option value="'+esc(r.id)+'" '+(person.room===r.id?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label>':'')+
  (state.people.length>1?'<button class="secondary" data-remove="'+i+'">Remove '+esc(person.name||'roommate')+'</button>':'')+'</div>').join('');
}
function renderAllocation(){
  $('allocation').innerHTML=monthly().filter(f=>f.id!=='rent'&&f.amount>0).map(f=>'<label>'+esc(f.label)+'<select data-split="'+esc(f.id)+'">'+[['equal','Split equally'],['custom','Custom percentages'],...state.people.map((p,i)=>['person'+i,p.name||'Roommate '+(i+1)])].map(([val,label])=>'<option value="'+val+'" '+(f.split===val?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
  (f.split==='custom'?'<div class="two">'+state.people.map((p,i)=>'<label>'+esc(p.name||'Roommate '+(i+1))+' (%)<input type="number" min="0" max="100" step="0.01" data-custom="'+esc(f.id)+'" data-index="'+i+'" value="'+esc(f.custom[i])+'"></label>').join('')+'</div>':'')).join('')||'<p class="small">Known recurring charges will appear here.</p>';
}
function allocate(amount,weights){
  const total=weights.reduce((sum,v)=>sum+v,0);
  const exact=weights.map(w=>amount*w/total);
  const parts=exact.map(Math.floor);
  const order=exact.map((v,i)=>({i,r:v-parts[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);
  const remainder=amount-parts.reduce((sum,v)=>sum+v,0);
  for(let n=0;n<remainder;n++) parts[order[n].i]++;
  return parts;
}
let summary='';
function updateShares(){
  if(!roommatePage) return;
  const people=state.people, rec=monthly();
  function showBudget(i,message,over=false){
    const status=$('budgetStatus'+i);
    status.textContent=message;
    status.style.fontWeight=over?'700':'';
    status.hidden=!message;
  }
  people.forEach((person,i)=>showBudget(i,cents(person.budget)===null?'':'Complete the monthly split to check this budget.'));
  const equal=people.map(()=>1);
  const occupied = people.map(person=>state.rooms.find(room=>room.id===person.room&&includedInRent(room)));
  const rentWeights=state.method==='equal'?equal:occupied.map(room=>
    room ? roomWeight(room)/occupied.filter(other=>other===room).length : 0
  );
  summary='';
  if(state.method==='weighted'&&rentWeights.some(weight=>!Number.isFinite(weight)||weight<=0)){
    $('shares').textContent='Choose where everyone will sleep. Enter a size and a preference multiplier above zero for each occupied room or area.';return;
  }
  const rows=[];
  for(const f of rec.filter(f=>f.amount!==null)){
    let weights=f.id==='rent'?rentWeights:equal;
    if(f.id!=='rent'&&f.split.startsWith('person')) weights=people.map((_,i)=>f.split==='person'+i?1:0);
    if(f.id!=='rent'&&f.amount&&f.split==='custom'){
      weights=people.map((_,i)=>f.custom[i]===''||f.custom[i]==null?NaN:Math.round(+f.custom[i]*100));
      if(weights.some(w=>!Number.isFinite(w)||w<0||w>10000)||weights.reduce((sum,w)=>sum+w,0)!==10000){$('shares').textContent=f.label+' percentages must add up to 100%.';return;}
    }
    rows.push([f.label,allocate(f.amount,weights)]);
  }
  const unknown=pending(rec);
  const marker=unknown.length?'Partial monthly estimate':'Estimated monthly split';
  const peopleTotals=people.map((p,i)=>({name:p.name||'Roommate '+(i+1),total:rows.reduce((sum,row)=>sum+row[1][i],0),budget:cents(p.budget)}));
  const budgetMessages=peopleTotals.map(({budget,total},i)=>{
    if(budget===null) return '';
    if(feeById('rent').amount===null&&total<=budget){
      showBudget(i,'Enter apartment rent to check the monthly budget.');
      return '';
    }
    const difference=total-budget;
    const message=difference>0?money(difference)+' over budget':difference===0?(unknown.length?'At budget so far':'At budget'):
      money(-difference)+(unknown.length?' under budget so far':' under budget');
    showBudget(i,money(total)+' per month · '+message,difference>0);
    return message;
  });
  $('shares').innerHTML='<p class="small">'+marker+(unknown.length?' · Check '+esc(unknown.map(f=>f.label).join(', ')):'')+'</p>'+
    peopleTotals.map((p,i)=>'<div class="shares"><strong>'+esc(p.name)+' · '+money(p.total)+'</strong><div class="small">'+
      rows.map(([label,parts])=>esc(label)+' '+money(parts[i])).join(' · ')+'</div>'+
      (budgetMessages[i]?'<div class="small">'+esc(budgetMessages[i])+'</div>':'')+'</div>').join('');
  summary=marker+'\n'+peopleTotals.map((p,i)=>p.name+': '+money(p.total)+(budgetMessages[i]?' · '+budgetMessages[i]:'')).join('\n')+
    '\nHousehold: '+money(count(rec))+(unknown.length?'\nStill to check: '+unknown.map(f=>f.label).join(', '):'');
}
function render(){
  if(calculatorPage){
    for(const id of ['beds','baths','months','listing','upfront','start','end','commute']) $(id).value=state[id];
    $('needParking').checked=state.parking;
    renderFees();
    renderBench();
  }
  if(roommatePage){
    $('method').value=state.method;
    $('dimensionUnit').value=state.dimensionUnit==='m'?'m':'ft';
    renderRooms();
    const rent=feeById('rent').amount;
    $('roomBaseRent').value=rent===null?'':rent/100;
    renderRoomRent();
    renderPeople();
    $('monthlyFees').innerHTML=state.fees.map((fee,i)=>fee.type==='monthly'&&fee.id!=='rent'
      ? '<label>'+esc(fee.label)+' ($)<input type="number" min="0" step="0.01" data-fee="'+i+'" value="'+
        (fee.amount===null?'':fee.amount/100)+'"></label>' : '').join('');
    renderAllocation();
    updateShares();
  }
  updateTotals();
  save();
}
window.addEventListener('pageshow',event=>{
  if(!event.persisted) return;
  state=readDraft() || state;
  clearRoomRent();
  render();
});
if(location.hash==='#roommates' && calculatorPage) location.replace('roommates.html');
async function copy(text,id){
  const field=$(id);
  field.value=text;field.hidden=false;
  try{await navigator.clipboard.writeText(text);}catch{field.focus();field.select();}
}
if($('demo')) $('demo').onclick=()=>{
  state=blank();state.listing=demo;
  state.rooms=[{...makeRoom('Bedroom 1'),length:15,width:12,bath:true},{...makeRoom('Bedroom 2'),length:12,width:10,bath:true},{...makeRoom('Living room'),length:15,width:10,kind:'living'}];
  state.people=[{...makePerson('Maya'),room:state.rooms[0].id},{...makePerson('Alex'),room:state.rooms[1].id}];
  importText();$('calculator').scrollIntoView();
};
if($('extract')) $('extract').onclick=importText;
if($('listingFile')) $('listingFile').onchange=async event=>{
  const input=event.target;
  const file=input.files[0];
  if(!file) return;
  const status=$('listingFileStatus');
  const previousListing=state.listing;
  status.textContent='Reading '+file.name+'…';
  try{
    const isText=/\.(txt|md|csv|eml)$/i.test(file.name)||file.type.startsWith('text/');
    const text=(isText?await file.text():(await floorPlanText(file,message=>{
      if(input.files[0]===file) status.textContent=message;
    },undefined,true)).map(line=>line.text.trim()).filter(Boolean).join('\n')).trim();
    if(input.files[0]!==file) return;
    if(!text){
      status.textContent='No text was detected. Try another file or paste the fee details.';
      return;
    }
    if(state.listing!==previousListing){
      status.textContent='Listing text changed while the file was reading. Choose the file again to load it.';
      return;
    }
    state.listing=text;
    $('listing').value=text;
    save();
    status.textContent='Loaded '+file.name+'. Review the text and select Find fees.';
  }catch(error){
    console.warn('Listing file extraction failed',error);
    if(input.files[0]===file) status.textContent='Could not read the file. Try another file or paste the fee details.';
  }finally{
    if(input.files[0]===file) input.value='';
  }
};
if($('questions')) $('questions').onclick=()=>{
  const missing=pending(state.fees.filter(active));
  const message=missing.length?'Hi, I’m reviewing an apartment near UC San Diego. Could you confirm the following for this unit?\n\n'+missing.map(f=>'• '+(hints[f.id]||'Please confirm '+f.label.toLowerCase()+'.').replace(/^Ask (?:for |whether |how much )?/,'Please confirm ')).join('\n')+'\n\nThank you!':'All active fee amounts have been entered.';
  copy(message,'copyQuestions');
};
if($('summary')) $('summary').onclick=()=>{if(summary) copy(summary,'copySummary');};
if($('addFee')) $('addFee').onclick=()=>{
  const label=window.prompt('Name of the charge');
  if(!label?.trim()) return;
  state.fees.push({id:'extra'+Date.now(),label:label.trim(),amount:null,source:'',status:'Needs checking',type:'monthly',due:false,split:'equal',custom:[]});render();
};
if($('addPerson')) $('addPerson').onclick=()=>{state.people.push(makePerson('Roommate '+(state.people.length+1)));render();};
document.addEventListener('click',event=>{
  const d=event.target.dataset;
  if(d.mid){
    const fee=feeById('utilities');
    fee.amount=cents(d.mid);fee.source='San Diego Housing Commission benchmark midpoint, April 2025';fee.status='Estimated';render();
  }
  if(d.remove!==undefined){
    const removed=+d.remove;state.people.splice(removed,1);
    for(const fee of state.fees){
      fee.custom.splice(removed,1);
      if(fee.split.startsWith('person')){
        const index=+fee.split.slice(6);
        fee.split=index===removed?'equal':'person'+(index>removed?index-1:index);
      }
    }
    render();
  }
});
document.addEventListener('input',event=>{
  const input=event.target, d=input.dataset;
  if(['listing','beds','baths','months','upfront','start','end','commute'].includes(input.id)) state[input.id]=input.value;
  if(input.id==='beds') renderBench();
  if(d.room!==undefined){
    clearRoomRent();
    const room=state.rooms[Number(d.room)];
    if(d.field==='length'||d.field==='width') room.dimensionsEdited=true;
    const factor=dimensionFactor(d.field);
    room[d.field]=input.type==='checkbox'?input.checked:factor!==1&&input.value!==''?Number(input.value)/factor:input.value;
    $('roomArea'+d.room).textContent=roomAreaText(room);
  }
  if(d.fee!==undefined){
    const f=state.fees[d.fee];f.amount=cents(input.value);f.status=f.amount===null?'Needs checking':'Entered';f.source='';

    if(roommatePage) renderAllocation();
  }
  if(d.person!==undefined) state.people[d.person][d.key]=input.type==='checkbox'?input.checked:input.value;
  if(d.custom!==undefined) feeById(d.custom).custom[d.index]=input.value;
  if(input.id==='roomBaseRent'){
    const rent=feeById('rent');
    rent.amount=cents(input.value);
    rent.status=rent.amount===null?'Needs checking':'Entered';
    rent.source='';
  }
  if(roommatePage) renderRoomRent();
  updateTotals();updateShares();save();
});
document.addEventListener('change',event=>{
  const input=event.target,d=input.dataset;
  if(input.id==='dimensionUnit'){state.dimensionUnit=input.value;render();return;}
  if(input.id==='method') state[input.id]=input.value;
  else if(input.id==='needParking') state.parking=input.checked;
  else if(d.room!==undefined){
    if(['length','width'].includes(d.field)) return;
    state.rooms[Number(d.room)][d.field]=input.type==='checkbox'?input.checked:input.value;
  }
  else if(d.person!==undefined&&d.key==='room') state.people[d.person].room=input.value;
  else if(d.due!==undefined) state.fees[d.due].due=input.checked;
  else if(d.type!==undefined) state.fees[d.type].type=input.value;
  else if(d.split!==undefined) feeById(d.split).split=input.value;
  else if(d.fee===undefined&&d.key!=='name'&&d.field!=='name') return;
  render();
});
function roomArea(room){
  const length=Number(room.length), width=Number(room.width);
  return length>0&&width>0 ? length*width : 0;
}
function roomWeight(room){
  const privacy={bedroom:1,living:0.7,open:0.8}[room.kind];
  return roomArea(room)*privacy*(room.bath?1.1:1)*Number(room.preference);
}
function includedInRent(room){
  return room.kind!=='living'||room.includeLiving===true;
}
function roomTenantCount(room){
  return room.tenants ?? '';
}
function lengthUnit(){return state.dimensionUnit==='m'?'m':'ft';}
function areaUnit(){return lengthUnit()==='m'?'m²':'sq ft';}
function dimensionFactor(field){
  if(lengthUnit()!=='m') return 1;
  return field==='area'?0.3048**2:['length','width'].includes(field)?0.3048:1;
}
function displayDimension(value,field){
  return value===''?'':Number((Number(value)*dimensionFactor(field)).toFixed(3));
}
function displayDimensionInput(room,field){
  return ['length','width'].includes(field)?displayDimension(room[field],field):room[field];
}
function roomAreaText(room){
  const area=roomArea(room);
  return area>0?'Area '+displayDimension(area,'area')+' '+areaUnit():'';
}
function renderRooms(){
  const input = (room,i,field,label,attrs='')=>'<label>'+label+'<input data-room="'+i+'" data-field="'+field+'" '+attrs+' value="'+esc(displayDimensionInput(room,field))+'"></label>';
  const number='type="number" min="0" step="any"';
  $('rooms').innerHTML=state.rooms.map((room,i)=>'<div class="person"><div class="two">'+
    input(room,i,'name','Room or area name')+
    (room.kind==='living'?'<label class="check"><input type="checkbox" data-room="'+i+'" data-field="includeLiving" '+(room.includeLiving?'checked':'')+'> Someone will sleep in the living room</label>':'')+
    (includedInRent(room)?'<label>How many people will sleep here?<input type="number" min="0" step="1" data-room="'+i+'" data-field="tenants" value="'+esc(roomTenantCount(room))+'" placeholder="Enter number of people"></label>':'')+
    '<label>Space type<select data-room="'+i+'" data-field="kind">'+[['bedroom','Bedroom / enclosed room'],['living','Living room / common area'],['open','Open den / loft']].map(([value,label])=>'<option value="'+value+'" '+(room.kind===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>'+
    '<div class="two">'+input(room,i,'length','Length ('+lengthUnit()+')',number)+input(room,i,'width','Width ('+lengthUnit()+')',number)+(room.page&&includedInRent(room)&&!(+room.length>0&&+room.width>0)?'<p class="small">Fill in the missing length or width from your plan.</p>':'')+input(room,i,'preference','Preference multiplier',number)+'</div>'+
    '<label class="check"><input type="checkbox" data-room="'+i+'" data-field="bath" '+(room.bath?'checked':'')+'> Private bathroom</label>'+
    '<p><strong id="roomArea'+i+'">'+roomAreaText(room)+'</strong></p>'+
    '<button class="secondary" data-remove-room="'+i+'">Remove space</button></div>').join('');
}
function roomRentPlan(rent,rooms){
  if(rent===null) return {message:'Enter the apartment’s total monthly rent above.'};
  rooms=rooms.filter(includedInRent);
  if(!rooms.length) return {message:'Upload a floor plan or add a room to see the suggested rent.'};
  const counts=rooms.map(room=>roomTenantCount(room)==='' ? NaN : Number(roomTenantCount(room)));
  if(counts.some(count=>!Number.isSafeInteger(count)||count<0)){
    return {message:'Enter a whole number of people for each room or area.'};
  }
  const occupied=rooms.map((room,i)=>({room,count:counts[i]})).filter(entry=>entry.count>0);
  if(!occupied.length) return {message:'Enter at least one person in an occupied room or area.'};
  const weights=occupied.map(({room})=>roomWeight(room));
  if(weights.some(weight=>!Number.isFinite(weight)||weight<=0)){
    return {message:'Enter a size and a preference multiplier above zero for each occupied room or area.'};
  }
  const totals=allocate(rent,weights);
  return {rows:occupied.map(({room,count},i)=>({
    name:room.name, count, total:totals[i], each:Math.floor(totals[i]/count), extra:totals[i]%count
  }))};
}
function renderRoomRent(){
  const rent=feeById('rent').amount;
  const result=roomRentPlan(rent,state.rooms);
  const output=$('roomRentResults');
  if(result.message){output.textContent=result.message;return;}
  output.innerHTML='<h3>Suggested monthly room rent</h3>'+
    result.rows.map(({name,count,total,each,extra})=>{
      const perPerson=extra ? money(each)+'–'+money(each+1)+' per person' : money(each)+' per person';
      return '<div class="shares"><strong>'+esc(name)+' · '+money(total)+'</strong><div class="small">'+count+' '+(count===1?'person':'people')+' · '+perPerson+'</div>'+
        (extra?'<div class="small">'+extra+' '+(extra===1?'person pays':'people pay')+' one cent more so the shares add up.</div>':'')+'</div>';
    }).join('')+'<p class="small">Total rent: '+money(rent)+'. Split utilities and fees separately below.</p>';
}
function clearRoomRent(){
  const output=$('roomRentResults');
  if(output) output.replaceChildren();
}
if($('addRoom')) $('addRoom').onclick=()=>{
  clearRoomRent();
  state.rooms.push(makeRoom('Space '+(state.rooms.length+1)));
  state.method='weighted';
  render();
};
let planRevision=0;
function addDetectedRooms(detected){
  const status=$('planStatus');
  const previous=state.rooms;
  const used=new Set();
  const imported=detected.map(info=>{
    const sameName=previous.filter(room=>!used.has(room.id)&&room.name.trim().toLowerCase()===info.name.toLowerCase());
    const existing=sameName.find(room=>room.page===info.page&&Math.hypot(room.x-info.x,room.y-info.y)<0.04)
      || (sameName.length===1?sameName[0]:null);
    const room=existing||makeRoom(info.name);
    used.add(room.id);
    if(!existing||existing.page) room.kind=info.kind;
    Object.assign(room,{page:info.page,x:info.x,y:info.y});
    if(!room.dimensionsEdited){
      room.length=info.length;
      room.width=info.width;
    }
    return room;
  });
  state.rooms=[...imported,...previous.filter(room=>!room.page&&!used.has(room.id))];
  for(const person of state.people){
    if(!state.rooms.some(room=>room.id===person.room&&includedInRent(room))) person.room='';
  }
  state.method='weighted';
  const missing=imported.filter(room=>includedInRent(room)&&!(+room.length>0&&+room.width>0)).length;
  const bedrooms=detected.filter(room=>room.kind==='bedroom').length;
  status.textContent='Detected '+bedrooms+' '+(bedrooms===1?'bedroom':'bedrooms')+' and '+(detected.length-bedrooms)+' other '+(detected.length-bedrooms===1?'space':'spaces')+'. Review the count and dimensions below.'+
    (missing?' Fill in missing dimensions for '+missing+' marked '+(missing===1?'space.':'spaces.'):'');
  render();
}
function showUploadedPlan(preview,pages,rooms=[]){
  for(const [page,canvas] of pages){
    const figure=document.createElement('figure');
    const drawing=document.createElement('div');
    drawing.className='plan-drawing';
    drawing.append(canvas);
    const caption=document.createElement('figcaption');
    caption.className='small';
    caption.textContent=pages.size>1?'Floor plan · page '+page:'2D floor plan';
    figure.append(drawing,caption);
    const labels=document.createElement('ol');
    labels.className='small';
    for(const room of rooms.filter(room=>room.page===page)){
      const marker=document.createElement('span');
      marker.className='plan-pin';
      marker.style.left=100*room.x+'%';
      marker.style.top=100*room.y+'%';
      marker.textContent=labels.children.length+1;
      marker.setAttribute('aria-hidden','true');
      drawing.append(marker);
      const item=document.createElement('li');
      item.textContent=room.name+(room.length&&room.width?' · '+room.length+' × '+room.width+' ft ('+Number((room.length*0.3048).toFixed(3))+' × '+Number((room.width*0.3048).toFixed(3))+' m)':' · Dimensions need review');
      labels.append(item);
    }
    if(labels.children.length) figure.append(labels);
    preview.insertBefore(figure,preview.lastChild);
  }
}
let planUrl;
if($('planFile')) $('planFile').onchange=async event=>{
  const file=event.target.files[0];
  if(!file) return;
  event.target.value='';
  const revision=++planRevision;
  const status=$('planStatus');
  status.textContent='';
  if(planUrl) URL.revokeObjectURL(planUrl);
  const preview=$('planPreview');
  preview.replaceChildren();
  if(!file.type.startsWith('image/')&&file.type!=='application/pdf'&&!/\.(pdf|heic|heif)$/i.test(file.name)){
    preview.textContent='Choose an image or PDF.';return;
  }
  planUrl=URL.createObjectURL(file);
  const image=file.type.startsWith('image/')||/\.hei[cf]$/i.test(file.name);
  const viewer=document.createElement(image?'img':'iframe');
  viewer.src=planUrl;
  if(image) viewer.alt='Uploaded apartment floor plan';
  else viewer.title='Uploaded apartment floor plan PDF';
  const link=document.createElement('a');
  link.href=planUrl;link.target='_blank';link.rel='noopener';link.textContent='Open floor plan in a new tab';
  preview.append(viewer,link);
  status.textContent='Reading room labels and dimensions…';
  try{
    const pages=new Map();
    const lines=await floorPlanText(file,message=>{if(revision===planRevision) status.textContent=message;},(page,canvas)=>pages.set(page,canvas));
    if(revision!==planRevision) return;
    const detected=planRooms(lines);
    if(pages.size){
      viewer.remove();
      showUploadedPlan(preview,pages,detected);
    }
    if(!detected.length){
      status.textContent='No room labels could be read. Try a clearer plan or add the rooms below.';
      return;
    }
    addDetectedRooms(detected);
  }catch(error){
    console.warn('Floor plan import failed',error);
    if(revision===planRevision) status.textContent=error.cause ? error.message : 'The floor plan could not be processed. Try a PNG or JPEG copy.';
  }
};
document.addEventListener('click',event=>{
  const index=event.target.dataset.removeRoom;
  if(index===undefined) return;
  clearRoomRent();
  const [room]=state.rooms.splice(Number(index),1);
  for(const person of state.people) if(person.room===room.id) person.room='';
  render();
});
render();
