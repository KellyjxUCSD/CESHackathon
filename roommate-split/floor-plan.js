const assetURL = path => new URL(path, import.meta.url).href;

const roomLabel = /\b((?:(?:primary|master|guest|secondary)\s+)?bed\s*(?:room|rm)|living\s*(?:[/&]\s*dining(?:\s+room)?|room|area)|great\s+room|studio|den|loft)\b(?:\s*#?\s*(\d{1,2})(?![\d.'′’″":-]|\s*(?:[x×]|ft\b|feet\b|m\b)))?/gi;
const measurement = String.raw`(\d+(?:\.\d+)?)\s*(?:(?:['′’]|ft\b|feet\b)\s*(?:(\d{1,2})\s*(?:["″”]|in\b))?|(m)\b)?`;
const dimensionPair = new RegExp(String.raw`(?<![\w.])` + measurement + String.raw`\s*[x×]\s*` + measurement + String.raw`(?![\w.]|\s*["″”])`, 'gi');

export function plausiblePlanSize(length,width){
  const short=Math.min(length,width), long=Math.max(length,width);
  return short>=5 && long<=45 && long/short<=4 && short*long<=1000;
}
function normalizePlanDimensions(text){
  return text.replace(/[✕✖]/g,'×')
    .replace(/[‘`]/g,'′')
    .replace(/[“]/g,'″')
    .replace(/(\d)\s*['′’]\s*(\d{1,2})\s*['′’*](?=\s*(?:[x×]|$))/gi,'$1′$2″')
    .replace(/(\d+\s*['′’])\s*[-–]\s*(?=\d)/g,'$1')
    .replace(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})(?=\s*["″”x×]|\s*$)/gi,'$1′$2')
    .replace(/(\d)[oO](?=["″”]|\s*[x×]|$)/g,(_,digit)=>digit+'0')
    .replace(/(["″”]\s*[x×]\s*)([1-4]\d)([0-9])(?=\s*$)/gi,'$1$2′$3″')
    .replace(/(\d+)\s*['′’]\s*[oO]\s*(?=["″”])/g,"$1′0")
    .replace(/(^|[^\d.])(\d{2})([0-9])\s*(?=["″”])/g,"$1$2′$3")
    .replace(/(\d+)\s*['′’]\s*(\d{1,2})\s*(?=[x×]|$)/gi,'$1′$2″');
}
export function planRooms(lines){
  const labels=[], sizes=[];
  function position(line,start,length){
    if(!line.span) return line;
    return {...line,x:line.x+line.span*((start+length/2)/line.text.length-0.5)};
  }
  for(const rawLine of lines){
    const line={...rawLine,text:rawLine.text.trimEnd()};
    const labelText=line.text.replace(/^\s*living(?=\s*(?:\d+[.'′’x×]|$))/i,'Living Room');
    for(const match of labelText.matchAll(roomLabel)){
      const rest=labelText.slice(match.index+match[0].length);
      if(/^\s*(?:[/&-]\s*)?(?:\d+\s*)?(?:bath\b|bathroom\b|ba\b)/i.test(rest)) continue;
      if(/(?:^|\s)[\dIl|]+[\s-]*$/i.test(labelText.slice(0,match.index).trim())) continue;
      const base=match[1].replace(/bed\s*(?:room|rm)/i,'bedroom').replace(/livingroom/i,'living room');
      const name=(base+(match[2]?' '+match[2]:'')).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
      labels.push({...position({...line,text:labelText},match.index,match[0].length),name,number:match[2],kind:/living|great/i.test(base)?'living':/den|loft|studio/i.test(base)?'open':'bedroom'});
    }
    const dimensionText=normalizePlanDimensions(line.text);
    for(const match of dimensionText.matchAll(dimensionPair)){
      const feet=(whole,inches,unit)=>Number(whole)*(unit==='m'?3.280839895:1)+Number(inches||0)/12;
      const sharedMetric=!/['′’]|\b(?:ft|feet)\b/i.test(match[0])&&(match[3]||match[6]);
      const length=feet(match[1],match[2],match[3]||sharedMetric);
      const width=feet(match[4],match[5],match[6]||sharedMetric);
      if(Number(match[2])>=12||Number(match[5])>=12||!plausiblePlanSize(length,width)) continue;
      const size={...position({...line,text:dimensionText},match.index,match[0].trim().length),length:+length.toFixed(3),width:+width.toFixed(3),precision:Number(Boolean(match[2]))+Number(Boolean(match[5]))};
      if(!sizes.some(other=>other.page===size.page&&other.precision>=size.precision&&Math.hypot(other.x-size.x,other.y-size.y)<0.025&&
        other.length===size.length&&other.width===size.width)) sizes.push(size);
    }
  }
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function nearbyMeasurement(label){
    return sizes.reduce((nearest,size)=>{
      if(size.page!==label.page||Math.abs(size.x-label.x)>0.09||
        size.y<label.y-0.008||size.y>label.y+0.055) return nearest;
      return !nearest||distance(label,size)<distance(label,nearest)?size:nearest;
    },null);
  }
  for(const label of labels) label.nearbySize=nearbyMeasurement(label);
  const distinct=[];
  for(const label of labels.sort((a,b)=>Number(Boolean(b.number))-Number(Boolean(a.number))||b.name.length-a.name.length||
    (a.nearbySize?distance(a,a.nearbySize):1)-(b.nearbySize?distance(b,b.nearbySize):1))){
    if(distinct.some(other=>other.page===label.page&&other.kind===label.kind&&
      (!other.number||!label.number||other.number===label.number)&&
      Math.abs(other.y-label.y)<0.018&&(
        Math.abs(other.x-label.x)<0.033||
        (label.kind==='living'&&Math.abs(other.x-label.x)<0.09&&
          (label.nearbySize&&label.nearbySize===other.nearbySize||
            other.name===label.name&&(!label.nearbySize||!other.nearbySize)))
      ))) continue;
    distinct.push(label);
  }
  distinct.sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x);
  const candidates=[];
  for(const label of distinct){
    for(const size of sizes){
      if(label.page===size.page && distance(label,size)<=0.13) candidates.push({label,size,gap:distance(label,size)});
    }
  }
  const claimed=new Set();
  for(const {label,size,gap} of candidates.sort((a,b)=>
    (a.label===b.label&&Math.abs(a.size.x-b.size.x)<0.025&&Math.abs(a.size.y-b.size.y)<0.015&&
      Math.trunc(a.size.length)===Math.trunc(b.size.length)&&Math.trunc(a.size.width)===Math.trunc(b.size.width)
      ? b.size.precision-a.size.precision : 0)||a.gap-b.gap)){
    if(label.size||claimed.has(size)) continue;
    // Leave ambiguous nearby dimensions for the student to confirm.
    if(candidates.some(other=>other.size===size&&other.label!==label&&Math.abs(other.gap-gap)<0.012)) continue;
    label.size=size;
    claimed.add(size);
  }
  const resolved=[];
  for(const label of distinct.toSorted((a,b)=>
    (a.size?distance(a,a.size):1)-(b.size?distance(b,b.size):1))){
    const duplicate=label.kind==='living'&&label.size&&resolved.some(other=>
      other.kind===label.kind&&other.page===label.page&&other.name===label.name&&
      (!other.number||!label.number||other.number===label.number)&&
      Math.abs(other.x-label.x)<0.09&&Math.abs(other.y-label.y)<0.018&&
      other.size?.length===label.size.length&&other.size.width===label.size.width&&
      distance(other.size,label.size)<0.055);
    if(!duplicate) resolved.push(label);
  }
  resolved.sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x);
  const seen=new Map();
  return resolved.map(({name,kind,page,x,y,size})=>{
    const count=(seen.get(name)||0)+1;
    seen.set(name,count);
    const duplicate=resolved.filter(label=>label.name===name).length>1;
    return {name:duplicate?name+' '+count:name,kind,page,x,y,length:size?.length??'',width:size?.width??''};
  });
}

function planLineOnColoredPanel(line, pixels, width, height){
  // Sample around the text so white lettering doesn't hide a solid brochure background.
  const centerX=Math.round(line.x*width), centerY=Math.round(line.y*height);
  const offsetX=Math.max(2,Math.round(width*0.012)), offsetY=Math.max(2,Math.round(height*0.009));
  let colored=0;
  for(const dy of [-2,-1,1,2]){
    for(const dx of [-2,-1,0,1,2]){
      const x=centerX+dx*offsetX, y=centerY+dy*offsetY;
      if(x<0||x>=width||y<0||y>=height) continue;
      const index=(y*width+x)*4;
      const red=pixels[index], green=pixels[index+1], blue=pixels[index+2];
      const lightest=Math.max(red,green,blue), darkest=Math.min(red,green,blue);
      if(pixels[index+3]>220&&lightest<165&&lightest-darkest>=28) colored++;
    }
  }
  return colored>=16;
}

export async function floorPlanText(file,onProgress,onPage=()=>{}, documentMode=false){
  let worker;
  async function stage(message, action){
    try { return await action(); }
    catch(error){ throw new Error(message,{cause:error}); }
  }
  async function recognize(source,page,mode='11',whitelist=''){
    if(!worker){
      await stage('The text recognition library could not load. Open the website through its local preview and try again.',()=>new Promise((resolve,reject)=>{
        if(window.Tesseract){resolve();return;}
        const script=document.createElement('script');
        script.src=assetURL('vendor/ocr/tesseract.min.js');
        const timer=setTimeout(()=>{script.remove();reject(new Error('Script load timed out'));},15000);
        script.onload=()=>{clearTimeout(timer);resolve();};
        script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Script load failed'));};
        document.head.append(script);
      }));
      worker=await stage('The text recognition engine could not start. Open the website through its local preview and try again.',()=>window.Tesseract.createWorker('eng',1,{
        workerPath:assetURL('vendor/ocr/worker.min.js'),
        workerBlobURL:false,
        corePath:assetURL('vendor/ocr/tesseract-core-lstm.wasm.js'),
        langPath:assetURL('vendor/ocr/')
      }));
      await worker.setParameters({tessedit_pageseg_mode:'11'});
    }
    await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:whitelist});
    const {data}=await stage('The image opened, but text recognition failed. Try exporting the plan as a PNG or JPEG.',()=>worker.recognize(source,{}, {blocks:true}));
    return (data.blocks||[]).flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines)).flatMap(line=>{
      if(mode!=='11'||!line.words?.length) return [{
        text:line.text,page,span:(line.bbox.x1-line.bbox.x0)/source.width,
        x:(line.bbox.x0+line.bbox.x1)/2/source.width,y:(line.bbox.y0+line.bbox.y1)/2/source.height
      }];
      // OCR sometimes groups labels from different rooms into a single line.
      const groups=[];
      for(const word of line.words){
        const group=groups.at(-1);
        if(group&&word.bbox.x0-group.at(-1).bbox.x1<source.width*0.025) group.push(word);
        else groups.push([word]);
      }
      return groups.map(group=>{
        const left=group[0].bbox.x0, right=group.at(-1).bbox.x1;
        return {text:group.map(word=>word.text).join(' '),page,span:(right-left)/source.width,
          x:(left+right)/2/source.width,y:(line.bbox.y0+line.bbox.y1)/2/source.height};
      });
    });
  }
  function enhancedCanvas(source,left,top,width,height,scale,contrast){
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d');
    context.fillStyle='white';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.filter='grayscale(1) contrast('+contrast+')';
    context.imageSmoothingQuality='high';
    context.drawImage(source,left,top,width,height,0,0,canvas.width,canvas.height);
    return canvas;
  }
  async function recheckDimensions(source,room,page){
    const left=Math.max(0,Math.floor((room.x-0.045)*source.width));
    const top=Math.max(0,Math.floor((room.y+0.013)*source.height));
    const width=Math.min(Math.round(source.width*0.15),source.width-left);
    const height=Math.min(Math.round(source.height*0.018),source.height-top);
    if(width<2||height<2) return null;
    const digits="0123456789xX×.'′’\"″ ";
    const readings=new Map();
    async function scan(canvas,whitelist,compact=false){
      for(const line of await recognize(canvas,page,'7',whitelist)){
        let text=line.text.trim();
        // A paired half-foot measurement can lose both decimal points in a blurry scan.
        if(compact) text=text.replace(/^([1-3]\d)5\s*[x×]\s*([1-3]\d)5$/i,'$1.5 x $2.5');
        const candidate=planRooms([{...room,text:room.name},{...room,text}])[0];
        if(!candidate?.length) continue;
        const key=candidate.length+' x '+candidate.width;
        const prior=readings.get(key);
        const inchMarks=value=>(normalizePlanDimensions(value).match(/["″”]/g)||[]).length;
        readings.set(key,{count:(prior?.count||0)+1,text:prior&&inchMarks(prior.text)>inchMarks(text)?prior.text:text});
      }
    }
    await scan(enhancedCanvas(source,left,top,width,height,4,1),'');
    await scan(enhancedCanvas(source,left,top,width,height,2,1.3),digits);
    for(const threshold of [195,205]){
      if([...readings.values()].some(reading=>reading.count>=2&&(!room.length||!room.width||/["″”]/.test(normalizePlanDimensions(reading.text))))) break;
      const canvas=enhancedCanvas(source,left,top,width,height,3,1);
      const context=canvas.getContext('2d');
      const image=context.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<image.data.length;i+=4){
        const value=image.data[i]<threshold?0:255;
        image.data[i]=image.data[i+1]=image.data[i+2]=value;
      }
      context.putImageData(image,0,0);
      await scan(canvas,'',true);
      await scan(canvas,digits,true);
    }
    const ranked=[...readings.values()].sort((a,b)=>b.count-a.count);
    if(ranked[0]?.count>=2&&ranked[0].count>(ranked[1]?.count||0)){
      return {text:ranked[0].text,page,x:room.x,y:(top+height/2)/source.height};
    }
    return null;
  }
  async function recognizePlan(source,page,extracted=[]){
    const longest=Math.max(source.width,source.height);
    const lines=[...extracted];
    try{
      lines.push(...await recognize(source,page));
    }catch(error){
      if(!extracted.length) throw error;
    }
    const scale=Math.min(4,Math.max(1,2800/longest));
    const enhanced=enhancedCanvas(source,0,0,source.width,source.height,scale,1.65);
    try{
      lines.push(...await recognize(enhanced,page));
    }catch(error){
      console.warn('Enhanced floor plan scan failed',error);
    }
    const sample=document.createElement('canvas');
    const sampleScale=Math.min(1,800/longest);
    sample.width=Math.max(1,Math.round(source.width*sampleScale));
    sample.height=Math.max(1,Math.round(source.height*sampleScale));
    const sampleContext=sample.getContext('2d');
    // Keep the original colors for distinguishing brochure panels from the drawing.
    sampleContext.drawImage(source,0,0,sample.width,sample.height);
    const pixels=sampleContext.getImageData(0,0,sample.width,sample.height).data;
    const onPanel=line=>planLineOnColoredPanel(line,pixels,sample.width,sample.height);
    const planLines=lines.filter(line=>!onPanel(line));
    const rooms=planRooms(planLines);
    if(rooms.length) onProgress('Rechecking small dimension labels on page '+page+'…');
    for(const room of rooms){
      if(room.length&&room.width){
        // Whole-foot readings can be valid, but OCR may have dropped the inch marks and digits.
        if(!Number.isInteger(room.length)&&!Number.isInteger(room.width)) continue;
      }
      try{
        const dimension=await recheckDimensions(source,room,page);
        if(dimension){planLines.push(dimension);continue;}
      }catch(error){
        console.warn('Focused dimension scan failed',error);
      }
      if(room.length&&room.width) continue;
      const left=Math.max(0,Math.floor((room.x-0.075)*source.width));
      const top=Math.max(0,Math.floor((room.y+0.006)*source.height));
      const width=Math.min(Math.round(source.width*0.15),source.width-left);
      const height=Math.min(Math.round(source.height*0.065),source.height-top);
      if(width<2||height<2) continue;
      const crop=enhancedCanvas(source,left,top,width,height,3,1.7);
      try{
        const hasDimensions=line=>[...normalizePlanDimensions(line.text).matchAll(dimensionPair)].length>0;
        const sparse=await recognize(crop,page);
        const readings=sparse.some(hasDimensions)?sparse:await recognize(crop,page,'7');
        for(const line of readings.filter(hasDimensions)){
          const positioned={...line,x:(left+line.x*width)/source.width,y:(top+line.y*height)/source.height,span:line.span*width/source.width};
          if(!onPanel(positioned)) planLines.push(positioned);
        }
      }catch(error){
        console.warn('Could not re-read a room dimension label',error);
      }
    }
    return planLines;
  }
  try{
    if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name)){
      const bitmap=await stage('This image could not be opened. Try exporting the original as a PNG or JPEG.',async()=>{
        try{return await createImageBitmap(file);}
        catch{
          const url=URL.createObjectURL(file);
          try{const image=new Image();image.src=url;await image.decode();return image;}
          catch(error){
            if(!/\.hei[cf]$/i.test(file.name)&&!/image\/hei[cf]/i.test(file.type)) throw error;
            if(!window.heic2any){
              await new Promise((resolve,reject)=>{
                const script=document.createElement('script');
                script.src=assetURL('vendor/heic2any.min.js');
                script.onload=resolve;
                script.onerror=reject;
                document.head.append(script);
              });
            }
            const converted=await window.heic2any({blob:file,toType:'image/png'});
            return createImageBitmap(Array.isArray(converted)?converted[0]:converted);
          }
          finally{URL.revokeObjectURL(url);}
        }
      });
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,3000/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      bitmap.close?.();
      onPage(1,canvas);
      return documentMode?await recognize(enhancedCanvas(canvas,0,0,canvas.width,canvas.height,Math.min(3,Math.max(1,2600/Math.max(canvas.width,canvas.height))),1.25),1,'3'):await recognizePlan(canvas,1);
    }
    const pdfjs=await stage('The PDF reader could not load. Open the website through its local preview and try again.',()=>import('./vendor/pdf/pdf.min.mjs'));
    pdfjs.GlobalWorkerOptions.workerSrc=assetURL('vendor/pdf/pdf.worker.min.mjs');
    const pdf=await stage('The PDF could not be opened. If it is password-protected, export an unlocked copy and try again.',async()=>pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise);
    try{
      const lines=[];
      for(let i=1;i<=pdf.numPages;i++){
        onProgress('Reading page '+i+' of '+pdf.numPages+'…');
        const page=await pdf.getPage(i), viewport=page.getViewport({scale:1});
        const {items}=await page.getTextContent();
        if(documentMode){
          const text=items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim();
          if(text){lines.push({text,page:i});continue;}
        }
        const rows=[];
        for(const item of items.filter(item=>item.str?.trim())){
          const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
          rows.push({text:item.str,x:x/viewport.width,y:(y-item.height/2)/viewport.height,span:item.width/viewport.width,page:i});
        }
        const grouped=[];
        for(const row of rows.sort((a,b)=>a.y-b.y||a.x-b.x)){
          const group=grouped.find(group=>Math.abs(group.y-row.y)<0.006 && row.x>=group.x&&row.x-group.end<0.018);
          if(group){ group.parts.push(row); group.end=Math.max(group.end,row.x+row.span); }
          else grouped.push({...row,end:row.x+row.span,parts:[row]});
        }
        const extracted=grouped.map(group=>({...group,x:(group.x+group.end)/2,span:group.end-group.x,text:group.parts.map(part=>part.text).join(' ')}));
        const rendered=page.getViewport({scale:Math.min(3,2800/Math.max(viewport.width,viewport.height))});
        const canvas=document.createElement('canvas');
        canvas.width=Math.ceil(rendered.width);canvas.height=Math.ceil(rendered.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport:rendered}).promise;
        onPage(i,canvas);
        lines.push(...await (documentMode?recognize(canvas,i,'3'):recognizePlan(canvas,i,extracted)));
      }
      return lines;
    }finally{await pdf.destroy();}
  }finally{if(worker) await worker.terminate();}
}

