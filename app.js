(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flag=a=>a.replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
const C={};COUNTRIES.forEach(([code,name,cont,num,terr])=>C[code]={code,name,cont,num,terr:!!terr});
const NUM2A={};COUNTRIES.forEach(c=>NUM2A[c[3]]=c[0]);
const CONT={EU:'Europe',AS:'Asia',AF:'Africa',NA:'North America',SA:'South America',OC:'Oceania',AN:'Antarctica'};
const CONT_TOTAL={};COUNTRIES.forEach(c=>{if(!c[4])CONT_TOTAL[c[2]]=(CONT_TOTAL[c[2]]||0)+1});
const WORLD=195;
const PRESETS=['#5856D6','#AF52DE','#FF2D55','#FF3B30','#FF9500','#FFCC00','#34C759','#00C7BE','#30B0C7','#007AFF','#A2845E'];
const KINDS={visited:'Been there',planned:'Planned',lived:'Lived there',wish:'Want to go'};
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const haptic=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}};

/* ---------- state ---------- */
const LS='wayfarer.v1';
const APP_VERSION='1.3.2';
const DEF_SETTINGS={map:'globe',spin:true,theme:'system',colors:{}};
let state={trips:[],plans:[],wish:[],lived:[],home:null,settings:{...DEF_SETTINGS},updatedAt:0};
function normalize(s){
  return {trips:Array.isArray(s.trips)?s.trips:[],plans:Array.isArray(s.plans)?s.plans:[],wish:Array.isArray(s.wish)?s.wish:[],lived:Array.isArray(s.lived)?s.lived:[],
    home:s.home&&C[s.home]?s.home:null,settings:{...DEF_SETTINGS,...(s.settings||{}),colors:{...((s.settings||{}).colors||{})}},updatedAt:s.updatedAt||0};
}
try{const s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&Array.isArray(s.trips))state=normalize(s)}catch(e){}
function persist(){
  state.updatedAt=Date.now();
  try{localStorage.setItem(LS,JSON.stringify(state))}
  catch(e){if(!persist.warned){persist.warned=true;toast('Couldn’t save: storage is full or blocked.')}}
}
function save(){persist();renderAll()}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}

const visitedSet=()=>new Set(state.trips.map(t=>t.code));
const livedSet=()=>{const s=new Set(state.lived.map(l=>l.code));if(state.home)s.add(state.home);return s};
const wishSet=()=>new Set(state.wish.map(w=>w.code));
const allSet=()=>new Set([...visitedSet(),...livedSet()]);
const placesCount=()=>{const s=new Set();state.trips.forEach(t=>(t.places||[]).forEach(p=>s.add(t.code+'|'+p.name)));state.lived.forEach(l=>{const n=l.place?.name||l.city;if(n)s.add(l.code+'|'+n)});return s.size};

/* ---------- dates ---------- */
const parseD=s=>!s?null:s.length===4?new Date(s+'-07-01T12:00:00'):s.length===7?new Date(s+'-15T12:00:00'):new Date(s+'T12:00:00');
const datePrec=t=>!t.start?'none':t.start.length===4?'year':t.start.length===7?'month':'day';
const fmtM=new Intl.DateTimeFormat('en',{day:'numeric',month:'short'});
const fmtMY=new Intl.DateTimeFormat('en',{day:'numeric',month:'short',year:'numeric'});
const fmtMon=new Intl.DateTimeFormat('en',{month:'short',year:'numeric'});
function range(t){
  const a=parseD(t.start),b=parseD(t.end);
  if(!a)return 'No date';
  const pr=datePrec(t);
  if(pr==='year')return t.start+(t.end&&t.end>t.start?' – '+t.end.slice(0,4):'');
  if(pr==='month'){const fm=new Intl.DateTimeFormat('en',{month:'short'});
    if(!b||t.end<=t.start)return fmtMon.format(a);
    return a.getFullYear()===b.getFullYear()?fm.format(a)+' – '+fmtMon.format(b):fmtMon.format(a)+' – '+fmtMon.format(b)}
  if(!b||t.end===t.start)return fmtMY.format(a);
  if(a.getFullYear()===b.getFullYear())return fmtM.format(a)+' – '+fmtMY.format(b);
  return fmtMY.format(a)+' – '+fmtMY.format(b);
}
const days=t=>{if(datePrec(t)!=='day')return 0;const a=parseD(t.start),b=parseD(t.end)||a;if(!a)return 0;return Math.max(1,Math.round((b-a)/864e5)+1)};
const daysTxt=t=>{const d=days(t);return d?d+(d===1?' day':' days'):''};
const YEARS=(()=>{const y=new Date().getFullYear(),a=[];for(let i=y+1;i>=1930;i--)a.push(i);return a})();
function convertPrec(e,to){
  const s=e.start||'',en=e.end||'';
  const conv=(v,fallback)=>{if(to==='none')return '';if(!v)return fallback;
    if(to==='year')return v.slice(0,4);
    if(to==='month')return v.length>=7?v.slice(0,7):v+'-01';
    return v.length>=10?v:v.length===7?v+'-01':v+'-01-01'};
  e.start=conv(s,to==='year'?String(new Date().getFullYear()):to==='month'?thisMonth():todayISO());
  e.end=to==='year'||!en?'':conv(en,'');e.prec=to;
}
function dateFieldsHTML(e){
  const p=e.prec||datePrec(e);
  let f='';
  if(p==='day')f=`<div class="field"><label for="dS">Arrived</label><input type="date" id="dS" value="${e.start}"></div><div class="field"><label for="dE">Left</label><input type="date" id="dE" value="${e.end}" min="${e.start}"></div>`;
  else if(p==='month')f=`<div class="field"><label>From</label>${monthSel('dS',e.start,false)}</div><div class="field"><label>To</label>${monthSel('dE',e.end,true)}</div>`;
  else if(p==='year')f=`<div class="field"><label for="dS">Year</label><select id="dS">${YEARS.map(y=>`<option ${String(y)===e.start?'selected':''}>${y}</option>`).join('')}</select></div>`;
  const hint={day:'Leave “Left” empty for a single day.',month:'Leave “To” empty if it was within one month.',year:'Just the year you went.',none:'No problem. It goes under “Undated”.'}[p];
  return `<div class="section" style="margin-bottom:6px"><div class="group" style="padding:10px 12px${p==='none'?'':';border-radius:26px 26px 0 0'}">${segHTML([['day','Dates'],['month','Month'],['year','Year'],['none','No date']],p,'data-prec','in-group')}</div>${f?`<div class="group" style="border-radius:0 0 26px 26px;border-top:.5px solid var(--sep)">${f}</div>`:''}<div class="hint">${hint}</div></div>`;
}
function bindDateFields(e,rerender){if(!e.prec)e.prec=datePrec(e);
  $$('[data-prec]').forEach(b=>b.onclick=()=>{haptic();convertPrec(e,b.dataset.prec);rerender()});
  if(e.prec==='month'){onMonth('dS',v=>{e.start=v;if(e.end&&e.end<=e.start)e.end='';rerender()});onMonth('dE',v=>{e.end=v});return}
  const s=$('#dS'),en=$('#dE');
  if(s)s.onchange=()=>{e.start=s.value;if(e.end&&e.end<=e.start)e.end='';rerender()};
  if(en)en.onchange=()=>{e.end=en.value};
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthSel(id,val,opt){const [y,m]=(val||'').split('-');
  return `<span class="msel"><select id="${id}M" aria-label="Month">${opt?'<option value="">—</option>':''}${MONTHS.map((n,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}" ${v===m?'selected':''}>${n}</option>`}).join('')}</select><select id="${id}Y" aria-label="Year">${opt?'<option value="">—</option>':''}${YEARS.map(yy=>`<option ${String(yy)===y?'selected':''}>${yy}</option>`).join('')}</select></span>`}
function readMonth(id){const m=$('#'+id+'M')?.value,y=$('#'+id+'Y')?.value;return m&&y?y+'-'+m:''}
function onMonth(id,fn){['M','Y'].forEach(x=>{const el=$('#'+id+x);if(el)el.onchange=()=>fn(readMonth(id))})}
const pad2=n=>String(n).padStart(2,'0');
const nextMonth=()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+1);return d.getFullYear()+'-'+pad2(d.getMonth()+1)};
const startOfToday=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const periodStart=t=>{const s=t.start;if(!s)return null;return new Date((s.length===4?s+'-01-01':s.length===7?s+'-01':s)+'T00:00:00')};
const periodEnd=t=>{const s=t.end&&t.end>t.start?t.end:t.start;if(!s)return null;if(s.length===4)return new Date(+s,11,31,23,59);
  if(s.length===7){const [y,m]=s.split('-').map(Number);return new Date(y,m,0,23,59)}return new Date(s+'T23:59:00')};
const planDue=p=>{const e=periodEnd(p);return !!e&&e<startOfToday()};
function countdown(p){
  const a=periodStart(p);if(!a)return 'Someday';const t=startOfToday(),e=periodEnd(p);
  if(a<=t&&e>=t)return 'Now';
  const d=Math.round((a-t)/864e5);if(d<=0)return 'Past';if(d===1)return 'Tomorrow';
  if(d<45)return `in ${d} days`;const m=Math.round(d/30.44);if(m<18)return `in ${m} months`;return `in ${Math.round(d/365)} years`;
}
const upcomingPlans=()=>state.plans.filter(p=>!planDue(p)).sort((a,b)=>(a.start||'9999').localeCompare(b.start||'9999'));
const duePlans=()=>state.plans.filter(planDue).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
const plannedSet=()=>new Set(state.plans.map(p=>p.code));
const cleanEnd=e=>e.end&&e.start&&e.end>e.start&&e.end.length===e.start.length?e.end:'';
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const thisMonth=()=>todayISO().slice(0,7);
function livedRange(l){const a=parseD(l.start);if(!a)return 'No dates';return fmtMon.format(a)+' – '+(l.end?fmtMon.format(parseD(l.end)):'now')}
function livedDur(l){
  const a=parseD(l.start);if(!a)return '';const b=l.end?parseD(l.end):new Date();
  let m=(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())+(l.end?1:0);m=Math.max(1,m);
  if(m<12)return m+(m===1?' month':' months');const y=Math.floor(m/12),r=m%12;
  return y+(y===1?' yr':' yrs')+(r?' '+r+' mo':'');
}

/* ---------- icons ---------- */
const I={
  chev:'<svg class="chev" width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m1.5 1.5 6 6-6 6"/></svg>',
  split:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-7.5L5.5 7M12 13.5 18.5 7"/><path d="M5 11.5V6.5h5M19 11.5V6.5h-5"/></svg>',
  more:'<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="12" r="2.1"/></svg>',
  trash:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6"/></svg>',
  cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  grip:'<svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2h16M2 7h16M2 12h16"/></svg>',
  x:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5 7.5 12l7.5 7.5"/></svg>',
  ok:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5L19.5 7"/></svg>',
  check:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
  plane:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15.5v-2l-8-5V3.6a1.6 1.6 0 0 0-3.2 0v4.9l-8 5v2l8-2.5v4.9L7.6 19.5V21l3.8-1 3.8 1v-1.5L13 18v-5l8 2.5Z"/></svg>',
  star:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.5Z"/></svg>',
  house:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.6 11h2.6v9.3h5.3v-5.6h3v5.6h5.3V11h2.6L12 3.2Z"/></svg>',
  globe:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/></svg>',
};

/* ---------- settings application ---------- */
function luminance(hex){const m=hex.replace('#','');const n=parseInt(m.length===3?m.split('').map(c=>c+c).join(''):m,16);
  const [r,g,b]=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b}
function applySettings(){
  const s=state.settings,root=document.documentElement;
  if(s.theme==='light'||s.theme==='dark')root.dataset.theme=s.theme;else delete root.dataset.theme;
  ['visited','planned','lived','wish'].forEach(k=>{
    const c=s.colors[k];
    if(c){root.style.setProperty('--'+k,c);root.style.setProperty('--'+k+'-ink',luminance(c)>.45?'#000':'#fff')}
    else{root.style.removeProperty('--'+k);root.style.removeProperty('--'+k+'-ink')}
  });
  setMapMode(s.map);
}
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- tabs ---------- */
let curTab='atlas';
const tabs=['atlas','visited','lived','wish','settings'];
function setTab(t){
  curTab=t;haptic();
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='v-'+t));
  $('#tabPill').style.transform='translateX('+(tabs.indexOf(t)*70)+'px)';
}
$$('.tab').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='settings'&&curTab==='settings'&&setRoute!=='root'){goSettings('root');return}setTab(b.dataset.tab)});
$$('.view').forEach(v=>{const nav=v.querySelector('.nav');v.addEventListener('scroll',()=>nav.classList.toggle('scrolled',v.scrollTop>38),{passive:true})});
$$('[data-add]').forEach(b=>b.onclick=()=>openAdd(b.dataset.add||(curTab==='lived'?'lived':curTab==='wish'?'wish':'visited')));

/* ---------- atlas ---------- */
function animateNum(el,to){
  const from=+el.dataset.v||0;el.dataset.v=to;if(from===to){el.textContent=to;return}
  const t0=performance.now(),d=700;
  const step=t=>{const p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,3);el.textContent=Math.round(from+(to-from)*e);if(p<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}
function renderAtlas(){
  const all=allSet(),sov=[...all].filter(c=>C[c]&&!C[c].terr).length,ls=livedSet();
  animateNum($('#hCount'),all.size);
  $('#hLabel').textContent=all.size===1?'country':'countries';
  $('#hPct').textContent=Math.min(100,Math.round(sov/WORLD*100))+'% of the world'+(state.trips.length?' · '+state.trips.reduce((s,t)=>s+days(t),0)+' days away':'');
  const conts=new Set([...all].map(c=>C[c]?.cont).filter(Boolean));
  const totalDays=state.trips.reduce((s,t)=>s+days(t),0);
  $('#stats').innerHTML=[
    [state.trips.length,state.trips.length===1?'trip':'trips','visited',I.plane],
    [ls.size,'lived in','lived',I.house],
    [conts.size,'of 7 continents','visited',I.globe],
    [placesCount(),'cities & islands','wish','<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'],
  ].map(([v,k,c,ic])=>`<div class="stat"><div class="dot" style="background:color-mix(in srgb,var(--${c}) 16%,transparent);color:var(--${c})">${ic}</div><div><div class="v">${v}</div><div class="k">${k}</div></div></div>`).join('');
  const w=state.wish[0],np=upcomingPlans()[0];
  const nextTrip=np?`<button class="next plan" data-trip="${np.id}"><div class="flag">${flag(np.code)}</div><div class="txt" style="flex:1;min-width:0"><div class="t2">Next trip</div><div class="t1">${esc(C[np.code]?.name)}${np.places&&np.places.length?`<span style="color:var(--label2);font-weight:400"> · ${esc(placeNames(np.places))}</span>`:''}</div><div class="t2">${np.start?range(np):'No date yet'}</div></div><div class="cd big">${countdown(np)}</div></button>`:'';
  $('#nextSec').innerHTML=nextTrip+(w&&np?'<div style="height:10px"></div>':'')+(w?`<button class="next" data-detail="${w.code}"><div class="flag">${flag(w.code)}</div><div class="txt" style="flex:1;min-width:0"><div class="t2">Next on your list</div><div class="t1">${w.place?esc(w.place.name)+', ':''}${esc(C[w.code]?.name)}</div>${w.note?`<div class="t2" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.note)}</div>`:''}</div>${I.chev}</button>`:'');
  const years=state.trips.map(t=>parseD(t.start)?.getFullYear()).filter(Boolean);
  $('#contMeta').textContent=years.length?'Travelling since '+Math.min(...years):'';
  $('#conts').innerHTML=['EU','AS','NA','SA','AF','OC','AN'].map(k=>{
    const tot=k==='AN'?1:CONT_TOTAL[k];
    const n=[...all].filter(c=>C[c]?.cont===k&&(k==='AN'||!C[c].terr)).length;
    return `<div class="cont"><div class="top">${CONT[k]}<span>${n} / ${tot}</span></div><div class="bar"><i data-w="${Math.min(100,n/tot*100)}"></i></div></div>`;
  }).join('');
  requestAnimationFrame(()=>$$('#conts .bar i').forEach(i=>i.style.width=i.dataset.w+'%'));
  drawGlobe();
}
const tripRow=t=>`<button class="row" data-trip="${t.id}"><div class="flag">${flag(t.code)}</div><div class="txt"><div class="t1">${esc(C[t.code]?.name||t.code)}${t.places&&t.places.length?`<span style="color:var(--label2)"> · ${esc(placeNames(t.places))}</span>`:''}</div><div class="t2">${range(t)}${t.note?' · '+esc(t.note):''}</div></div>${I.chev}</button>`;

/* ---------- timeline ---------- */
let tFilter='all';
function renderTimeline(){
  const firsts=new Set();const seen=new Set();
  [...state.trips].sort((a,b)=>(a.start||'').localeCompare(b.start||'')).forEach(t=>{if(!seen.has(t.code)){seen.add(t.code);firsts.add(t.id)}});
  let ev=[];
  if(tFilter!=='moves')state.trips.forEach(t=>t.start&&ev.push({kind:'trip',date:t.start,t}));
  const undated=tFilter!=='moves'?state.trips.filter(t=>!t.start):[];
  if(tFilter!=='trips')state.lived.forEach(l=>{if(l.start)ev.push({kind:'in',date:l.start,l});if(l.end)ev.push({kind:'out',date:l.end,l})});
  ev.sort((a,b)=>b.date.localeCompare(a.date)||(a.kind==='out'?-1:1));
  const total=state.trips.length+state.lived.length+state.plans.length;
  $('#tFilters').innerHTML=total?[['all','Everything'],['trips','Trips'],['moves','Moves']].map(([k,l])=>`<button class="fchip ${tFilter===k?'on':''}" data-tf="${k}">${l}</button>`).join(''):'';
  $$('[data-tf]').forEach(b=>b.onclick=()=>{tFilter=b.dataset.tf;haptic();renderTimeline()});
  if(!total&&!state.home){$('#tList').innerHTML=`<div class="empty"><div class="ico">🗓️</div><h3>Your story starts here</h3><p>Trips and places you’ve lived appear here in order, newest first.</p><button class="pill-btn" data-add-empty="visited">Add a trip</button></div>`;return}
  const maxDays=Math.max(1,...state.trips.map(days));
  let html='<div class="tl">',lastY=null;
  const ups=tFilter!=='moves'?upcomingPlans().slice().reverse():[];
  if(ups.length){html+=`<div><span class="tl-year" style="background:var(--planned);color:var(--planned-ink)">Upcoming</span></div>`;ups.forEach(p=>html+=evHTML({kind:'plan',t:p},'planned'))}
  const nowLiving=state.lived.filter(l=>!l.end&&l.start).sort((a,b)=>b.start.localeCompare(a.start))[0];
  if(nowLiving&&tFilter!=='trips'){html+=`<div class="tl-year" style="background:var(--lived);color:var(--lived-ink)">Now</div>`;
    html+=evHTML({kind:'now',l:nowLiving},'lived')}
  ev.forEach(e=>{
    const y=e.date.slice(0,4);if(y!==lastY){html+=`<div><span class="tl-year">${y}</span></div>`;lastY=y}
    html+=evHTML(e,e.kind==='trip'?'visited':'lived',firsts,maxDays);
  });
  if(undated.length){html+=`<div><span class="tl-year">Undated</span></div>`;undated.forEach(t=>html+=evHTML({kind:'trip',t},'visited',firsts,maxDays))}
  if(state.home&&tFilter!=='trips'){const c=C[state.home];
    html+=`<div><span class="tl-year">Origin</span></div><button class="tl-ev tl-origin" data-detail="${c.code}" style="--c:var(--lived)"><div class="tl-node">${flag(c.code)}</div><div class="tl-card"><div class="k">${I.house.replace('width="18" height="18"','width="13" height="13"')} Home country</div><div class="t1">Where it all started</div><div class="t2">${esc(c.name)}</div></div></button>`}
  if(!ev.length&&!undated.length&&!nowLiving&&!state.home&&!ups.length)html+=`<div class="empty"><h3>Nothing here yet</h3><p>Try a different filter.</p></div>`;
  $('#tList').innerHTML=html+'</div>';
}
function evHTML(e,col,firsts,maxDays){
  if(e.kind==='plan'){const t=e.t,c=C[t.code];
    return `<button class="tl-ev" data-trip="${t.id}" style="--c:var(--${col})"><div class="tl-node plan">${flag(t.code)}</div><div class="tl-card">
      <div class="k">${I.plane.replace('width="18" height="18"','width="13" height="13"')} Planned <span class="tl-tag">${countdown(t)}</span></div>
      <div class="t1">${esc(c?.name)}</div>${t.places&&t.places.length?`<div class="t2" style="color:var(--label)">${t.places.map(p=>typeIcon(p.type)+' '+esc(p.name)).join('  ')}</div>`:''}<div class="t2">${t.start?range(t):'No date yet'}${days(t)?' · '+daysTxt(t):''}</div>
      ${t.note?`<div class="note">${esc(t.note)}</div>`:''}</div></button>`}
  if(e.kind==='trip'){const t=e.t,c=C[t.code],d=days(t);
    return `<button class="tl-ev" data-trip="${t.id}" style="--c:var(--${col})"><div class="tl-node">${flag(t.code)}</div><div class="tl-card">
      <div class="k">${I.plane.replace('width="18" height="18"','width="13" height="13"')} Trip ${firsts&&firsts.has(t.id)?'<span class="tl-tag">First visit</span>':''}</div>
      <div class="t1">${esc(c?.name)}</div>${t.places&&t.places.length?`<div class="t2" style="color:var(--label)">${t.places.map(p=>typeIcon(p.type)+' '+esc(p.name)).join('  ')}</div>`:''}<div class="t2">${range(t)}${d?' · '+daysTxt(t):''}</div>
      ${t.note?`<div class="note">${esc(t.note)}</div>`:''}${d?`<div class="tl-dur" style="width:${Math.max(4,Math.sqrt(d/maxDays)*100)}%"></div>`:''}</div></button>`}
  const l=e.l,c=C[l.code],place=l.city?esc(l.city)+', '+esc(c?.name):esc(c?.name);
  const label=e.kind==='in'?'Moved':e.kind==='out'?'Moved away':'Living';
  const title=e.kind==='out'?'Left '+(l.city?esc(l.city):esc(c?.name)):e.kind==='now'?place:'Moved to '+place;
  const sub=e.kind==='now'?'Since '+fmtMon.format(parseD(l.start))+' · '+livedDur(l):e.kind==='in'?fmtMon.format(parseD(l.start))+(l.end?' · stayed '+livedDur(l):' · still there'):fmtMon.format(parseD(l.end))+' · after '+livedDur(l);
  return `<button class="tl-ev" data-lived="${l.id}" style="--c:var(--${col})${e.kind==='out'?';opacity:.75':''}"><div class="tl-node">${flag(l.code)}</div><div class="tl-card">
    <div class="k">${I.house.replace('width="18" height="18"','width="13" height="13"')} ${label}</div><div class="t1">${title}</div><div class="t2">${sub}</div>${l.note&&e.kind!=='out'?`<div class="note">${esc(l.note)}</div>`:''}</div></button>`;
}

/* ---------- visited ---------- */
let vQuery='';
$('#vSearch').addEventListener('input',e=>{vQuery=e.target.value.trim().toLowerCase();renderVisited()});
let vMode='trips';
function renderVisitedMode(){
  const show=state.trips.length||state.lived.length||state.plans.length;
  $('#vSegWrap').innerHTML=show?segHTML([['trips','Trips'],['timeline','Timeline']],vMode,'data-vmode'):'';
  if(!show)vMode='trips';
  $$('[data-vmode]').forEach(b=>b.onclick=()=>{if(vMode===b.dataset.vmode)return;vMode=b.dataset.vmode;haptic();renderVisitedMode()});
  $('#vTripsWrap').hidden=vMode!=='trips';$('#vTimelineWrap').hidden=vMode!=='timeline';
}
const planRow=p=>`<button class="row" data-trip="${p.id}"><div class="flag">${flag(p.code)}</div><div class="txt"><div class="t1">${esc(C[p.code]?.name||p.code)}${p.places&&p.places.length?`<span style="color:var(--label2)"> · ${esc(placeNames(p.places))}</span>`:''}</div><div class="t2">${p.start?range(p):'No date yet'}${p.note?' · '+esc(p.note):''}</div></div><span class="cd">${countdown(p)}</span>${I.chev}</button>`;
function renderVisited(){
  const vs=visitedSet(),q=norm(vQuery);
  const match=t=>!q||norm(C[t.code]?.name).includes(q)||norm(t.note).includes(q)||norm(placeNames(t.places)).includes(q);
  const ups=upcomingPlans().filter(match),due=duePlans();
  const bits=[];
  if(state.trips.length)bits.push(`${vs.size} ${vs.size===1?'country':'countries'}, ${state.trips.length} ${state.trips.length===1?'trip':'trips'}`);
  if(state.plans.length)bits.push(`${state.plans.length} planned`);
  $('#vSub').textContent=bits.join(' · ');
  $('#vSearchWrap').style.display=state.trips.length+state.plans.length>1?'':'none';
  let top='';
  if(due.length)top+=`<div class="section"><div class="section-h"><h2>Did you go?</h2></div><div class="group">${due.map(p=>`<div class="row"><div class="flag">${flag(p.code)}</div><div class="txt"><div class="t1">${esc(C[p.code]?.name)}${p.places&&p.places.length?`<span style="color:var(--label2)"> · ${esc(placeNames(p.places))}</span>`:''}</div><div class="t2">Planned for ${range(p)}</div></div><button class="glass-btn sm" data-due-no="${p.id}" aria-label="Didn’t go" style="box-shadow:none;background:var(--fill)">${I.x}</button><button class="glass-btn sm prom" data-due-yes="${p.id}" aria-label="Yes, log it">${I.ok}</button></div>`).join('')}</div><div class="hint">Tap ✓ to add it to the places you’ve been.</div></div>`;
  if(ups.length)top+=`<div class="section"><div class="section-h"><h2>Upcoming</h2><span class="meta">${ups.length} planned</span></div><div class="group">${ups.map(p=>`<div class="swipe" data-del-plan="${p.id}"><button class="del">Delete</button>${planRow(p)}</div>`).join('')}</div></div>`;
  let rest='';
  if(!state.trips.length){
    if(!state.plans.length)rest=`<div class="empty"><div class="ico">🧳</div><h3>No trips yet</h3><p>Add the places you’ve been, or plan where you’re going next. Your map fills in as you go.</p><button class="pill-btn" data-add-empty="visited">Add a trip</button> <button class="pill-btn" data-add-empty="planned" style="background:var(--fill);color:var(--label)">Plan a trip</button></div>`;
  }else{
    const list=state.trips.filter(match).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
    if(!list.length&&!ups.length)rest=`<div class="empty"><h3>No matches</h3><p>No trip matches “${esc(vQuery)}”.</p></div>`;
    else{
      const groups={};list.forEach(t=>{const y=t.start?t.start.slice(0,4):'Undated';(groups[y]=groups[y]||[]).push(t)});
      const keys=Object.keys(groups).sort((a,b)=>b==='Undated'?-1:a==='Undated'?1:b-a);
      rest=keys.map(y=>{const g=groups[y],n=new Set(g.map(t=>t.code)).size;
        return `<div class="section"><div class="section-h"><h2>${y}</h2><span class="meta">${n} ${n===1?'country':'countries'}</span></div><div class="group">${g.map(t=>`<div class="swipe" data-del-trip="${t.id}"><button class="del">Delete</button>${tripRow(t)}</div>`).join('')}</div></div>`}).join('');
    }
  }
  $('#vList').innerHTML=top+rest;
  $$('#vList [data-del-trip]').forEach(el=>attachSwipe(el,()=>{const i=state.trips.findIndex(x=>x.id===el.dataset.delTrip),t=state.trips[i];state.trips.splice(i,1);save();toast('Trip deleted',()=>{state.trips.splice(i,0,t);save()})}));
  $$('#vList [data-del-plan]').forEach(el=>attachSwipe(el,()=>{const i=state.plans.findIndex(x=>x.id===el.dataset.delPlan),p=state.plans[i];state.plans.splice(i,1);save();toast('Plan deleted',()=>{state.plans.splice(i,0,p);save()})}));
  $$('[data-due-yes]').forEach(b=>b.onclick=e=>{e.stopPropagation();markPlanDone(state.plans.find(x=>x.id===b.dataset.dueYes))});
  $$('[data-due-no]').forEach(b=>b.onclick=e=>{e.stopPropagation();haptic();const i=state.plans.findIndex(x=>x.id===b.dataset.dueNo),p=state.plans[i];state.plans.splice(i,1);save();toast('Removed',()=>{state.plans.splice(i,0,p);save()})});
}
function markPlanDone(p){
  if(!p)return;const i=state.plans.indexOf(p),wasNew=!allSet().has(p.code);
  state.plans.splice(i,1);const t={...p,id:p.id};state.trips.push(t);clearWishFor(t.code,t.places||[]);save();haptic();
  if(wasNew){confetti();toast(`${flag(t.code)} New country! That’s ${allSet().size}.`)}else toast(`${flag(t.code)} Added to Been there`);
}

/* ---------- lived ---------- */
function renderLived(){
  const ls=livedSet();
  $('#lSub').textContent=ls.size?`${ls.size} ${ls.size===1?'country':'countries'} you’ve called home`:'';
  const h=state.home?C[state.home]:null;
  let html=`<div class="section">${h?
    `<button class="home-card" id="homeCard"><div class="flag">${flag(h.code)}</div><div class="txt" style="flex:1;min-width:0"><div class="k">${I.house.replace('width="18" height="18"','width="13" height="13"')} Home country</div><div class="t1">${esc(h.name)}</div><div class="t2">Where you’re from · tap to change</div></div>${I.chev}</button>`:
    `<button class="home-card" id="homeCard"><div class="flag">${I.house}</div><div class="txt" style="flex:1"><div class="t1" style="font-size:18px">Set your home country</div><div class="t2">Where you’re from. It counts as lived on your map.</div></div>${I.chev}</button>`}</div>`;
  if(!state.lived.length){
    html+=`<div class="empty" style="padding-top:20px"><div class="ico">🏡</div><h3>Places you’ve lived</h3><p>Add each city or country you’ve lived in, with when you moved in and out.</p><button class="pill-btn" data-add-empty="lived">Add a place</button></div>`;
  }else{
    const list=[...state.lived].sort((a,b)=>(!a.end?-1:0)-(!b.end?-1:0)||(b.start||'').localeCompare(a.start||''));
    html+=`<div class="section"><div class="section-h"><h2>Places you’ve lived</h2></div><div class="group">${list.map(l=>`<div class="swipe" data-lid="${l.id}"><button class="del">Delete</button><button class="row" data-lived="${l.id}"><div class="lv">${flag(l.code)}</div><div class="txt"><div class="t1">${l.city?esc(l.city)+', ':''}${esc(C[l.code]?.name)}</div><div class="t2">${livedRange(l)} · ${livedDur(l)}</div></div>${!l.end?'<span class="now">Now</span>':''}${I.chev}</button></div>`).join('')}</div></div>`;
  }
  $('#lList').innerHTML=html;
  $('#homeCard').onclick=()=>pickHome();
  $$('#lList .swipe').forEach(el=>attachSwipe(el,()=>{const i=state.lived.findIndex(x=>x.id===el.dataset.lid),l=state.lived[i];state.lived.splice(i,1);save();toast('Place removed',()=>{state.lived.splice(i,0,l);save()})}));
}
function pickHome(){
  openSheet('','');
  renderPicker(code=>{state.home=code;save();closeSheet();toast(`${flag(code)} Home country set`);spinTo(code)},{title:'Home country',clearLabel:state.home?'Clear home country':null,onClear:()=>{state.home=null;save();closeSheet();toast('Home country cleared')}});
}

/* ---------- wishlist ---------- */
const tierOf=i=>i<3?['Top priority','var(--wish)']:i<8?['Soon','var(--blue)']:['Someday','var(--label2)'];
function renderWish(){
  const n=state.wish.length;
  $('#wSub').textContent=n?`${n} ${n===1?'country':'countries'} · drag to reprioritise`:'';
  if(!n){$('#wList').innerHTML=`<div class="empty"><div class="ico">🧭</div><h3>Where to next?</h3><p>Build a ranked list of places you want to see. Number one shows up on your Atlas.</p><button class="pill-btn" data-add-empty="wish">Add a country</button></div>`;return}
  $('#wList').innerHTML=`<div class="section wl"><div class="group" id="wGroup">${state.wish.map((w,i)=>{
    const [tn,tc]=tierOf(i);
    return `<div class="swipe" data-wid="${w.id}"><button class="del">Delete</button><div class="row" data-detail="${w.code}" role="button" tabindex="0"><div class="rank">${i+1}<span class="f">${flag(w.code)}</span></div><div class="txt"><div class="t1">${w.place?esc(w.place.name)+`<span style="color:var(--label2)"> · ${esc(C[w.code]?.name)}</span>`:esc(C[w.code]?.name)}</div><div class="t2"><span style="color:${tc};font-weight:600">${tn}</span>${w.note?' · '+esc(w.note):''}</div></div><div class="grip" aria-label="Reorder">${I.grip}</div></div></div>`;
  }).join('')}</div></div>`;
  $$('#wGroup .swipe').forEach(el=>{
    attachSwipe(el,()=>{const i=state.wish.findIndex(x=>x.id===el.dataset.wid),w=state.wish[i];state.wish.splice(i,1);save();toast('Removed from list',()=>{state.wish.splice(i,0,w);save()})});
    attachDrag(el);
  });
}

/* ---------- swipe ---------- */
let openSwipe=null;
function attachSwipe(wrap,onDel){
  const row=wrap.querySelector('.row');let sx=0,sy=0,dx=0,active=false,locked=null,base=0;
  row.addEventListener('pointerdown',e=>{if(e.target.closest('.grip'))return;sx=e.clientX;sy=e.clientY;dx=0;active=true;locked=null;base=openSwipe===wrap?-88:0;if(openSwipe&&openSwipe!==wrap)closeSwipe()});
  row.addEventListener('pointermove',e=>{
    if(!active)return;const mx=e.clientX-sx,my=e.clientY-sy;
    if(locked===null&&(Math.abs(mx)>8||Math.abs(my)>8))locked=Math.abs(mx)>Math.abs(my)?'x':'y';
    if(locked!=='x')return;
    try{row.setPointerCapture(e.pointerId)}catch(_){}
    wrap.classList.add('swiping');dx=Math.min(0,base+mx);row.style.transition='none';row.style.transform=`translateX(${dx<-88?-88+(dx+88)*.3:dx}px)`;
  });
  const end=()=>{if(!active)return;active=false;row.style.transition='';
    if(locked==='x'){row.dataset.swiped='1';setTimeout(()=>delete row.dataset.swiped,50);
      if(dx<-44){row.style.transform='translateX(-88px)';openSwipe=wrap}else{row.style.transform='';if(openSwipe===wrap)openSwipe=null;setTimeout(()=>{if(openSwipe!==wrap)wrap.classList.remove('swiping')},320)}}};
  row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);
  wrap.querySelector('.del').onclick=e=>{e.stopPropagation();haptic();wrap.style.transition='height .25s';wrap.style.height=wrap.offsetHeight+'px';requestAnimationFrame(()=>{wrap.style.height='0'});openSwipe=null;setTimeout(onDel,230)};
}
function closeSwipe(){if(openSwipe){const w=openSwipe;w.querySelector('.row').style.transform='';openSwipe=null;setTimeout(()=>{if(openSwipe!==w)w.classList.remove('swiping')},320)}}

function attachDrag(wrap){
  const grip=wrap.querySelector('.grip');
  grip.addEventListener('pointerdown',e=>{
    e.preventDefault();e.stopPropagation();closeSwipe();
    const items=$$('#wGroup .swipe'),start=items.indexOf(wrap),h=wrap.offsetHeight,y0=e.clientY;let idx=start;
    grip.setPointerCapture(e.pointerId);wrap.classList.add('dragging');haptic();
    items.forEach(it=>it!==wrap&&it.classList.add('shift'));
    const move=ev=>{
      const dy=ev.clientY-y0;wrap.style.transform=`translateY(${dy}px) scale(1.02)`;
      const ni=Math.max(0,Math.min(items.length-1,Math.round(start+dy/h)));
      if(ni!==idx){idx=ni;haptic()}
      items.forEach((it,i)=>{if(it===wrap)return;let t=0;if(start<idx&&i>start&&i<=idx)t=-h;if(start>idx&&i>=idx&&i<start)t=h;it.style.transform=t?`translateY(${t}px)`:''});
    };
    const up=()=>{
      grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',up);
      wrap.style.transition='transform .2s';wrap.style.transform=`translateY(${(idx-start)*h}px)`;
      setTimeout(()=>{if(idx!==start){const [m]=state.wish.splice(start,1);state.wish.splice(idx,0,m);save()}else renderWish()},200);
    };
    grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',up);
  });
  grip.addEventListener('click',e=>e.stopPropagation());
}

document.addEventListener('click',e=>{
  const sw=e.target.closest('.row');if(sw&&sw.dataset.swiped)return;
  if(openSwipe&&!e.target.closest('.del')){const was=openSwipe;closeSwipe();if(e.target.closest('.swipe')===was)return}
  const t=e.target.closest('[data-trip]');if(t){const id=t.dataset.trip;openTrip(state.trips.find(x=>x.id===id)||state.plans.find(x=>x.id===id));return}
  const l=e.target.closest('[data-lived]');if(l){openLived(state.lived.find(x=>x.id===l.dataset.lived));return}
  const d=e.target.closest('[data-detail]');if(d&&!e.target.closest('.grip')){openDetail(d.dataset.detail);return}
  const a=e.target.closest('[data-add-empty]');if(a){openAdd(a.dataset.addEmpty);return}
});

/* ---------- sheet ---------- */
const sheet=$('#sheet'),scrim=$('#scrim');
function openSheet(head,body,{half=false}={}){
  $('#sheetHead').innerHTML=head;$('#sheetBody').innerHTML=body;$('#sheetBody').scrollTop=0;
  sheet.classList.toggle('half',half);
  requestAnimationFrame(()=>{sheet.classList.add('on');scrim.classList.add('on')});
  globe.paused=true;
}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on');sheet.style.transform='';globe.paused=false;document.activeElement?.blur?.()}
scrim.onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('on'))closeSheet()});
(()=>{let y0=null,dy=0;const head=$('#sheetHead'),grab=sheet.querySelector('.grabber');
  const down=e=>{if(e.target.closest('button'))return;y0=e.clientY;dy=0;sheet.classList.add('dragging');e.currentTarget.setPointerCapture(e.pointerId)};
  const move=e=>{if(y0===null)return;dy=Math.max(0,e.clientY-y0);sheet.style.transform=`translateY(${dy}px)`};
  const up=()=>{if(y0===null)return;y0=null;sheet.classList.remove('dragging');if(dy>110)closeSheet();else sheet.style.transform=''};
  [head,grab].forEach(el=>{el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});
})();
const closeBtn=`<button class="glass-btn sm" data-close aria-label="Close">${I.x}</button>`;
const backBtn=id=>`<button class="glass-btn sm" id="${id}" aria-label="Back">${I.back}</button>`;
const okBtn=(id,on,label)=>`<button class="glass-btn sm prom" id="${id}" aria-label="${label}" ${on?'':'disabled'}>${I.ok}</button>`;
const SP='<span style="width:40px"></span>';
const moreBtn=id=>`<button class="glass-btn sm" id="${id}" aria-label="More" aria-haspopup="menu">${I.more}</button>`;
sheet.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet()});
const segHTML=(opts,cur,attr,cls='')=>{const i=Math.max(0,opts.findIndex(o=>o[0]===cur));
  return `<div class="seg ${cls}"><div class="knob" style="width:calc(${100/opts.length}% - ${6/opts.length}px);transform:translateX(${i*100}%)"></div>${opts.map(([k,l])=>`<button class="${k===cur?'on':''}" ${attr}="${k}">${l}</button>`).join('')}</div>`};

/* ---------- places gazetteer ---------- */
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let PLACES=null;
function loadPlaces(){
  if(PLACES)return PLACES;PLACES=[];
  ISLANDS_RAW.split('\n').forEach(l=>{const [n,cc,la,lo]=l.split('\t');if(C[cc])PLACES.push({name:n,cc,lat:+la,lng:+lo,type:'island',pop:0,k:norm(n)})});
  CITIES_RAW.split('\n').forEach(l=>{const [n,cc,la,lo,p]=l.split('\t');if(C[cc])PLACES.push({name:n,cc,lat:+la,lng:+lo,type:'city',pop:+p,k:norm(n)})});
  return PLACES;
}
function searchPlaces(q,cc,limit=40){
  const P=loadPlaces(),k=norm(q).trim();const pre=[],sub=[];
  for(const p of P){if(cc&&p.cc!==cc)continue;
    if(!k){pre.push(p);if(pre.length>=limit)break;continue}
    if(p.k.startsWith(k)){pre.push(p);if(pre.length>=limit)break}
    else if(k.length>=3&&sub.length<limit&&p.k.includes(k))sub.push(p)}
  return pre.concat(sub).slice(0,limit);
}
const pick=p=>({name:p.name,cc:p.cc,lat:p.lat??null,lng:p.lng??null,type:p.type||'place'});
const TYPE_LABEL={city:'City',island:'Island',place:'Place'};
const typeIcon=t=>t==='island'?'🏝️':t==='city'?'🏙️':'📍';
const placeNames=ps=>(ps||[]).map(p=>p.name).join(', ');
const fmtPop=p=>p>=1000?(p/1000).toFixed(p>=10000?0:1)+'M people':p>0?p+'k people':'';

/* ---------- picker ---------- */
// opts: {title, clearLabel, onClear, places:true|false, cc:null, onPlace}
function renderPicker(onPick,opts={}){
  const {title='Choose a place',clearLabel=null,onClear=null,places=false,cc=null,onPlace=null,back=null}=opts;
  $('#sheetHead').innerHTML=`${back?backBtn('pBack'):closeBtn}<h3>${esc(title)}</h3>${SP}`;
  const vs=visitedSet(),ls=livedSet(),ws=wishSet(),ps=plannedSet();let q='';
  const ph=cc?`Search cities & islands in ${C[cc].name}`:places?'Countries, cities, islands…':'Search 250 countries & territories';
  $('#sheetBody').innerHTML=`<label class="search" style="margin-top:4px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="pSearch" placeholder="${esc(ph)}" autocomplete="off"></label>${clearLabel?`<div class="section" style="margin-bottom:6px"><div class="group"><button class="row danger" id="pClear" style="min-height:48px">${clearLabel}</button></div></div>`:''}<div id="pList" class="picker-list"></div>`;
  const cRow=([code,name,cont,,terr])=>{
    const tag=code===state.home?'<span class="chip l sm">Home</span>':ls.has(code)?'<span class="chip l sm">Lived</span>':vs.has(code)?'<span class="chip v sm">Been</span>':ps.has(code)?'<span class="chip p sm">Planned</span>':ws.has(code)?'<span class="chip w sm">On list</span>':'';
    return `<button class="row" data-pick="${code}"><div class="flag">${flag(code)}</div><div class="txt"><div class="t1">${esc(name)}</div><div class="t2">${CONT[cont]}${terr?' · Territory':''}</div></div>${tag}</button>`};
  let shown=[];
  const pRow=(p,i)=>`<button class="row" data-pl="${i}"><div class="flag" style="font-size:20px">${typeIcon(p.type)}</div><div class="txt"><div class="t1">${esc(p.name)}</div><div class="t2">${TYPE_LABEL[p.type]} · ${flag(p.cc)} ${esc(C[p.cc].name)}${p.pop?' · '+fmtPop(p.pop):''}</div></div></button>`;
  const customRow=()=>`<div class="section" style="margin-top:14px"><div class="group"><button class="row" id="pCustom"><div class="flag" style="font-size:20px">📍</div><div class="txt"><div class="t1" style="color:var(--blue)">${q?`Add “${esc(q)}” as a new place`:'Add a place that’s not listed'}</div><div class="t2">Name it and drop a pin on the map</div></div></button></div></div>`;
  const draw=()=>{
    const ql=norm(q);let html='';
    if(!cc){
      const list=COUNTRIES.filter(c=>!ql||norm(c[1]).includes(ql)||c[0].toLowerCase()===ql);
      if(ql){
        if(list.length)html+=`<div class="alpha">Countries</div><div class="group" style="margin:0 16px">${list.slice(0,12).map(cRow).join('')}</div>`;
      }else{let last='';list.forEach(c=>{const L=c[1][0].toUpperCase();if(L!==last){if(last)html+='</div>';html+=`<div class="alpha">${L}</div><div class="group" style="margin:0 16px">`;last=L}html+=cRow(c)});if(last)html+='</div>'}
    }
    if(places&&(ql||cc)){
      shown=searchPlaces(q,cc,cc&&!ql?30:40);
      if(cc&&!ql){const isl=loadPlaces().filter(p=>p.cc===cc&&p.type==='island');shown=isl.concat(shown.filter(p=>p.type!=='island')).slice(0,40)}
      if(shown.length)html+=`<div class="alpha">${cc&&!ql?'Popular places':'Cities & islands'}</div><div class="group" style="margin:0 16px">${shown.map(pRow).join('')}</div>`;
      html+=customRow();
    }
    if(!html)html=`<div class="empty"><h3>No matches</h3><p>Try a different spelling.</p></div>`;
    $('#pList').innerHTML=html;
    const cu=$('#pCustom');if(cu)cu.onclick=()=>openCustomPlace(q,cc,p=>onPlace(p),()=>renderPicker(onPick,opts));
  };
  draw();
  const inp=$('#pSearch');let tm;inp.oninput=()=>{q=inp.value.trim();clearTimeout(tm);tm=setTimeout(draw,q.length<2?0:90)};
  $('#pList').onclick=e=>{const r=e.target.closest('[data-pick]');if(r){haptic();onPick(r.dataset.pick);return}
    const pl=e.target.closest('[data-pl]');if(pl&&onPlace){haptic();onPlace(pick(shown[+pl.dataset.pl]))}};
  if(clearLabel)$('#pClear').onclick=onClear;
  if(back)$('#pBack').onclick=back;
}

/* ---------- custom place with pin ---------- */
function openCustomPlace(name,cc,onDone,back){
  const p={name:name||'',cc:cc||null,lat:null,lng:null,type:'place'};
  const draw=()=>{
    $('#sheetHead').innerHTML=`${backBtn('cpBack')}<h3>New place</h3>${okBtn('cpSave',p.name.trim()&&p.cc,'Add')}`;
    $('#sheetBody').innerHTML=`
      <div class="section" style="margin-bottom:18px"><div class="group">
        <div class="field"><label for="cpN">Name</label><input type="text" id="cpN" placeholder="e.g. Hallstatt" value="${esc(p.name)}" autocomplete="off"></div>
        <button class="field" id="cpC"><span>Country</span><span style="color:var(--label2)">${p.cc?flag(p.cc)+' '+esc(C[p.cc].name):'Choose'} ›</span></button>
      </div></div>
      ${segHTML([['city','City'],['island','Island'],['place','Other']],p.type,'data-ptype')}
      <div class="section"><div class="section-h"><h2>Pin</h2><span class="meta" id="cpHint">${p.lat!=null?'Pinned':'Tap the map to drop a pin'}</span></div>
        <div class="group" style="padding:0;position:relative"><canvas id="pinMap" style="width:100%;aspect-ratio:1.6/1;display:block;touch-action:none;cursor:crosshair"></canvas></div>
        <div class="hint">Optional. The pin shows up on your map. Pinch or scroll to zoom.</div></div>`;
    $('#cpBack').onclick=back;
    const n=$('#cpN');n.oninput=()=>{p.name=n.value;$('#cpSave').disabled=!(p.name.trim()&&p.cc)};
    $('#cpC').onclick=()=>renderPicker(code=>{p.cc=code;p.lat=p.lng=null;draw()},{title:'Country',back:draw});
    $$('[data-ptype]').forEach(b=>b.onclick=()=>{p.type=b.dataset.ptype;haptic();
      $$('[data-ptype]').forEach(x=>x.classList.toggle('on',x===b));const i=['city','island','place'].indexOf(p.type);b.parentNode.querySelector('.knob').style.transform=`translateX(${i*100}%)`});
    $('#cpSave').onclick=()=>{p.name=p.name.trim();onDone(pick(p))};
    pinMap(p);
  };
  draw();
}
function pinMap(p){
  const cv2=$('#pinMap');if(!cv2||!window.d3||!features.length)return;
  const r=cv2.getBoundingClientRect(),w=r.width||340,h=r.height||210,d=Math.min(2,devicePixelRatio||1);cv2.width=w*d;cv2.height=h*d;
  const c2=cv2.getContext('2d');if(!c2)return;
  const proj=d3.geoMercator();const f=p.cc&&features.find(x=>x.code===p.cc);
  if(f)proj.fitExtent([[14,14],[w-14,h-14]],f);else proj.fitExtent([[6,6],[w-6,h-6]],{type:'Sphere'}).clipExtent(null);
  if(!f)proj.scale(w/6.4).translate([w/2,h*.6]);
  const pth=d3.geoPath(proj,c2);let z={k:1,x:0,y:0};
  const render=()=>{
    c2.setTransform(d,0,0,d,0,0);c2.clearRect(0,0,w,h);c2.fillStyle=cssVar('--ocean1');c2.fillRect(0,0,w,h);
    c2.setTransform(d*z.k,0,0,d*z.k,d*z.x,d*z.y);
    c2.beginPath();features.forEach(x=>{if(x!==f)pth(x)});c2.fillStyle=cssVar('--land');c2.fill();c2.strokeStyle=cssVar('--land-edge');c2.lineWidth=.6/z.k;c2.stroke();
    if(f){c2.beginPath();pth(f);c2.fillStyle=cssVar('--visited');c2.globalAlpha=.35;c2.fill();c2.globalAlpha=1;c2.strokeStyle=cssVar('--visited');c2.lineWidth=1.2/z.k;c2.stroke()}
    if(p.lat!=null){const q=proj([p.lng,p.lat]);if(q){c2.beginPath();c2.arc(q[0],q[1],7/z.k,0,7);c2.fillStyle=cssVar('--red');c2.fill();c2.lineWidth=2.5/z.k;c2.strokeStyle='#fff';c2.stroke()}}
  };
  render();
  const ptrs=new Map();let moved=0,pin=null,last=null;
  const rel=e=>{const b=cv2.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]};
  const clamp=()=>{z.k=Math.max(1,Math.min(20,z.k));z.x=Math.min(0,Math.max(w*(1-z.k),z.x));z.y=Math.min(0,Math.max(h*(1-z.k),z.y))};
  const zoom=(fct,mx,my)=>{const o=z.k;z.k=Math.max(1,Math.min(20,z.k*fct));const rr=z.k/o;z.x=mx-(mx-z.x)*rr;z.y=my-(my-z.y)*rr;clamp();render()};
  cv2.addEventListener('pointerdown',e=>{cv2.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,rel(e));if(ptrs.size===1){moved=0;last=rel(e)}else moved=99;
    if(ptrs.size===2){const [a,b]=[...ptrs.values()];pin={d:Math.hypot(a[0]-b[0],a[1]-b[1])}}});
  cv2.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const c=rel(e);ptrs.set(e.pointerId,c);
    if(ptrs.size===2&&pin){const [a,b]=[...ptrs.values()],dd=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom(dd/pin.d,(a[0]+b[0])/2,(a[1]+b[1])/2);pin.d=dd;return}
    if(last){const dx=c[0]-last[0],dy=c[1]-last[1];moved+=Math.abs(dx)+Math.abs(dy);if(moved>5){z.x+=dx;z.y+=dy;clamp();render()}last=c}});
  const up=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(ptrs.size)return;pin=null;last=null;
    if(moved<6&&e.type==='pointerup'){const c=rel(e),ll=proj.invert([(c[0]-z.x)/z.k,(c[1]-z.y)/z.k]);if(ll){p.lng=+ll[0].toFixed(3);p.lat=+ll[1].toFixed(3);haptic();
      if(!p.cc){const hit=features.find(x=>d3.geoContains(x,ll));if(hit&&C[hit.code]){p.cc=hit.code}}
      const hEl=$('#cpHint');if(hEl)hEl.textContent='Pinned';const sv=$('#cpSave');if(sv)sv.disabled=!(p.name.trim()&&p.cc);render()}}};
  cv2.addEventListener('pointerup',up);cv2.addEventListener('pointercancel',up);
  cv2.addEventListener('wheel',e=>{e.preventDefault();const c=rel(e);zoom(Math.exp(-e.deltaY*(e.ctrlKey?.012:.0022)),c[0],c[1])},{passive:false});
}

/* ---------- add flow ---------- */
let draft=null;
function openAdd(mode='visited',code=null,extra={}){
  draft={mode,code,prec:mode==='planned'?'month':'day',start:mode==='planned'?nextMonth():todayISO(),end:'',mStart:thisMonth(),mEnd:'',places:extra.place?[extra.place]:[],place:extra.place||null,note:extra.note||'',top:false,isHome:false};
  openSheet('','');
  if(code)renderForm();else renderPicker(c=>{draft.code=c;renderForm()},{places:true,title:'Where?',onPlace:p=>{draft.code=p.cc;draft.places=[p];draft.place=p;renderForm()}});
}
const wishMatch=(code,place)=>state.wish.some(w=>w.code===code&&(w.place?.name||'')===(place?.name||''));
function clearWishFor(code,places){state.wish=state.wish.filter(w=>!(w.code===code&&(!w.place||places.some(p=>p.name===w.place.name))))}
function placeRowsHTML(list,addLabel){
  return `<div class="group">${list.map((p,i)=>`<div class="row" style="min-height:52px"><div class="flag" style="font-size:20px">${typeIcon(p.type)}</div><div class="txt"><div class="t1">${esc(p.name)}</div><div class="t2">${TYPE_LABEL[p.type]||'Place'}${p.lat==null?' · no pin':''}</div></div><button class="glass-btn" data-rmp="${i}" aria-label="Remove ${esc(p.name)}" style="width:30px;height:30px;box-shadow:none;background:var(--fill)">${I.x}</button></div>`).join('')}
    <button class="row" data-addp style="min-height:52px"><div class="flag" style="background:color-mix(in srgb,var(--blue) 14%,transparent);color:var(--blue)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div><div class="txt"><div class="t1" style="color:var(--blue)">${addLabel}</div></div></button></div>`;
}
function renderForm(){
  const c=C[draft.code],m=draft.mode;
  const multi=m==='visited'||m==='planned';
  const inWish=m==='wish'&&wishMatch(draft.code,draft.place);
  const canSave=multi?true:m==='lived'?!!draft.mStart:!inWish;
  $('#sheetHead').innerHTML=`${closeBtn}<h3>${m==='visited'?'New trip':m==='planned'?'Plan a trip':m==='lived'?'New home':'Add to list'}</h3>${okBtn('saveBtn',canSave,'Add')}`;
  const placeList=multi?draft.places:(draft.place?[draft.place]:[]);
  const placeLabel=multi?(placeList.length?'Add another city or island':'Add cities or islands'):(placeList.length?'Change place':m==='lived'?'Add the city or island':'Add a specific place');
  let body=segHTML([['visited','Been'],['planned','Planned'],['lived','Lived'],['wish','Wishlist']],m,'data-mode')+
    `<div class="section" style="margin-bottom:18px"><div class="group"><button class="row" id="changeC"><div class="flag">${flag(c.code)}</div><div class="txt"><div class="t1">${esc(c.name)}</div><div class="t2">${CONT[c.cont]}</div></div><span style="color:var(--blue);font-size:15px">Change</span></button></div></div>
    <div class="section" style="margin-bottom:18px"><div class="section-h"><h2 style="font-size:17px">${multi?'Places':'Place'}</h2><span class="meta">Optional</span></div>${placeRowsHTML(placeList,placeLabel)}</div>`;
  if(multi)body+=`
      ${dateFieldsHTML(draft)}
      <div class="section" style="margin-top:18px"><div class="group"><div class="field"><textarea id="fNote" placeholder="${m==='planned'?'Bookings, who’s coming, what to see…':'People, moments, the meal you still think about…'}" rows="3">${esc(draft.note)}</textarea></div></div></div>
      ${m==='planned'?`<div class="hint" style="margin-top:-14px">Once the dates have passed, Wayfarer asks whether you went.</div>`:''}`;
  else if(m==='lived')body+=`
      <div class="section" style="margin-bottom:6px"><div class="group">
        <div class="field"><label>Moved in</label>${monthSel('fMS',draft.mStart,false)}</div>
        <div class="field"><label>Moved out</label>${monthSel('fME',draft.mEnd,true)}</div>
      </div><div class="hint">Leave “Moved out” empty if you still live there.</div></div>
      <div class="section" style="margin-top:18px;margin-bottom:6px"><div class="group"><button class="field" id="fHome"><span>This is my home country</span><span class="toggle ${draft.isHome||state.home===draft.code?'on':''}"></span></button></div><div class="hint">Your home country is where you’re from.</div></div>
      <div class="section" style="margin-top:18px"><div class="group"><div class="field"><textarea id="fNote" placeholder="Neighbourhood, job, what you miss…" rows="3">${esc(draft.note)}</textarea></div></div></div>`;
  else body+=`
      <div class="section" style="margin-bottom:6px"><div class="group">
        <button class="field" id="fTop"><span>Put at the top</span><span class="toggle ${draft.top?'on':''}"></span></button>
      </div><div class="hint">${inWish?`${esc(draft.place?draft.place.name:c.name)} is already on your list.`:`Otherwise it goes to the end, at #${state.wish.length+1}.`}</div></div>
      <div class="section" style="margin-top:18px"><div class="group"><div class="field"><textarea id="fNote" placeholder="Why go? Northern lights, a friend’s wedding, the food…" rows="3">${esc(draft.note)}</textarea></div></div></div>`;
  $('#sheetBody').innerHTML=body;
  $$('[data-mode]').forEach(b=>b.onclick=()=>{const prev=draft.mode;draft.mode=b.dataset.mode;haptic();const mm=['visited','planned'].includes(draft.mode);
    if(!mm&&!draft.place&&draft.places[0])draft.place=draft.places[0];if(mm&&draft.place&&!draft.places.length)draft.places=[draft.place];
    if(draft.mode==='planned'&&prev!=='planned'&&(!draft.start||draft.start<=todayISO())){draft.prec='month';draft.start=nextMonth();draft.end=''}
    if(draft.mode==='visited'&&prev==='planned'&&draft.start>todayISO()){draft.prec='day';draft.start=todayISO();draft.end=''}
    renderForm()});
  $('#changeC').onclick=()=>renderPicker(cc=>{if(cc!==draft.code){draft.places=[];draft.place=null}draft.code=cc;renderForm()},{places:true,title:'Where?',back:renderForm,onPlace:p=>{draft.code=p.cc;draft.places=[p];draft.place=p;renderForm()}});
  $$('[data-rmp]').forEach(b=>b.onclick=()=>{haptic();if(multi)draft.places.splice(+b.dataset.rmp,1);else draft.place=null;renderForm()});
  $('[data-addp]').onclick=()=>renderPicker(()=>{},{places:true,cc:draft.code,title:'Add a place',back:renderForm,onPlace:p=>{if(multi){if(!draft.places.some(x=>x.name===p.name))draft.places.push(p)}else draft.place=p;renderForm()}});
  const note=$('#fNote');note.oninput=()=>draft.note=note.value;
  if(multi){
    bindDateFields(draft,renderForm);
  }else if(m==='lived'){
    onMonth('fMS',v=>{draft.mStart=v;if(draft.mEnd&&draft.mEnd<draft.mStart)draft.mEnd='';renderForm()});
    onMonth('fME',v=>{draft.mEnd=v});
    draft.isHome=draft.isHome||state.home===draft.code;
    $('#fHome').onclick=()=>{draft.isHome=!draft.isHome;haptic();$('#fHome .toggle').classList.toggle('on',draft.isHome)};
  }else $('#fTop').onclick=()=>{draft.top=!draft.top;haptic();$('#fTop .toggle').classList.toggle('on',draft.top)};
  $('#saveBtn').onclick=()=>{try{saveDraft()}catch(err){console.error(err);toast('Couldn’t add that: '+String(err&&err.message||err).slice(0,60))}};
  function saveDraft(){
    const code=draft.code,wasNew=!allSet().has(code);
    if(m==='visited'){
      state.trips.push({id:uid(),code,places:draft.places.slice(),start:draft.start||'',end:cleanEnd(draft),note:(draft.note||'').trim()});
      clearWishFor(code,draft.places);
      save();closeSheet();
      if(wasNew){confetti();toast(`${flag(code)} New country! That’s ${allSet().size}.`)}else toast(draft.places.length?`${flag(code)} ${draft.places[0].name}${draft.places.length>1?' +'+(draft.places.length-1):''} added`:'Trip added');
    }else if(m==='planned'){
      const p={id:uid(),code,places:draft.places.slice(),start:draft.start||'',end:cleanEnd(draft),note:(draft.note||'').trim()};
      state.plans.push(p);save();closeSheet();
      toast(`${flag(code)} ${C[code].name} planned${p.start?' · '+countdown(p):''}`);
    }else if(m==='lived'){
      state.lived.push({id:uid(),code,place:draft.place,city:draft.place?draft.place.name:'',start:draft.mStart,end:draft.mEnd&&draft.mEnd>=draft.mStart?draft.mEnd:'',note:draft.note.trim()});
      if(draft.isHome)state.home=code;else if(state.home===code)state.home=null;
      clearWishFor(code,draft.place?[draft.place]:[]);
      save();closeSheet();
      if(wasNew)confetti();toast(`${flag(code)} Added to places you’ve lived`);
    }else{
      const w={id:uid(),code,place:draft.place,note:draft.note.trim()};
      draft.top?state.wish.unshift(w):state.wish.push(w);
      save();closeSheet();toast(`${flag(code)} ${draft.place?draft.place.name+' added':'Added to your list'}`);
    }
    try{spinTo(code,draft.places[0]||draft.place)}catch(e){}
  }
}

/* ---------- edit trip ---------- */
function openTrip(t,e){
  if(!t)return;const c=C[t.code],isPlan=state.plans.includes(t),L=isPlan?state.plans:state.trips;e=e||{...t,places:(t.places||[]).slice(),start:t.start||'',end:t.end||'',note:t.note||''};if(!e.prec)e.prec=datePrec(e);
  const fresh=!sheet.classList.contains('on');
  const head=`${closeBtn}<h3>${isPlan?'Planned Trip':'Trip'}</h3><div class="hbtns">${moreBtn('tMore')}${okBtn('tSave',true,'Save')}</div>`;
  const body=`
    <div class="detail-hero"><div class="bigflag">${flag(c.code)}</div><h2>${esc(c.name)}</h2><p>${range(e)}${daysTxt(e)?' · '+daysTxt(e):''}</p></div>
    <div class="section" style="margin-bottom:18px"><div class="section-h"><h2 style="font-size:17px">Places</h2></div>${placeRowsHTML(e.places,e.places.length?'Add another city or island':'Add cities or islands')}</div>
    ${dateFieldsHTML(e)}
    <div class="section" style="margin-top:18px"><div class="group"><div class="field"><textarea id="tN" placeholder="Notes" rows="3">${esc(e.note)}</textarea></div></div></div>
    <div style="height:24px"></div>`;
  if(fresh)openSheet(head,body);else{$('#sheetHead').innerHTML=head;$('#sheetBody').innerHTML=body;sheet.classList.remove('half')}
  bindDateFields(e,()=>openTrip(t,e));$('#tN').oninput=ev=>e.note=ev.target.value;
  $$('[data-rmp]').forEach(b=>b.onclick=()=>{haptic();e.places.splice(+b.dataset.rmp,1);openTrip(t,e)});
  $('[data-addp]').onclick=()=>renderPicker(()=>{},{places:true,cc:t.code,title:'Add a place',back:()=>openTrip(t,e),onPlace:p=>{if(!e.places.some(x=>x.name===p.name))e.places.push(p);openTrip(t,e)}});
  $('#tSave').onclick=()=>{Object.assign(t,{places:e.places,start:e.start||'',end:cleanEnd(e),note:(e.note||'').trim()});if(!isPlan)clearWishFor(t.code,e.places.length?e.places:[{name:'\u0000'}]);save();closeSheet();toast(isPlan?'Plan saved':'Trip saved')};
  $('#tMore').onclick=ev=>{const n=e.places.length;openMenu(ev.currentTarget,[
    ...(isPlan?[{label:'Mark as Been There',sub:'Move it to the places you’ve been',icon:I.ok,onClick:()=>{Object.assign(t,{places:e.places,start:e.start||'',end:cleanEnd(e),note:(e.note||'').trim()});closeSheet();markPlanDone(t)}}]:[]),
    {label:n>1?`Split into ${n} Trips`:'Split by Places',sub:n>1?'One trip per place, same dates':'Needs two or more places',icon:I.split,disabled:n<2,onClick:()=>{
      const i=L.indexOf(t),orig=JSON.parse(JSON.stringify(t)),base={code:t.code,start:e.start||'',end:cleanEnd(e),note:(e.note||'').trim()};
      const parts=e.places.map(p=>({id:uid(),...base,places:[p]}));
      if(i<0)L.push(...parts);else L.splice(i,1,...parts);
      save();closeSheet();haptic();
      toast(`Split into ${n} ${isPlan?'plans':'trips'}`,()=>{const ids=new Set(parts.map(x=>x.id));const j=L.findIndex(x=>ids.has(x.id));L=L.filter(x=>!ids.has(x.id));L.splice(j<0?L.length:j,0,orig);save()});
    }},
    {label:`View ${c.name}`,icon:I.globe,onClick:()=>openDetail(c.code)},
    {label:isPlan?'Delete Plan':'Delete Trip',icon:I.trash,red:true,onClick:()=>{const i=L.indexOf(t);L.splice(i,1);save();closeSheet();toast(isPlan?'Plan deleted':'Trip deleted',()=>{L.splice(i,0,t);save()})}},
  ])};
}

/* ---------- edit lived ---------- */
function openLived(l,e){
  if(!l)return;const c=C[l.code];
  e=e||{...l,place:l.place||(l.city?{name:l.city,cc:l.code,lat:null,lng:null,type:'city'}:null),isHome:state.home===l.code};
  const fresh=!sheet.classList.contains('on');
  const head=`${closeBtn}<h3>Lived there</h3><div class="hbtns">${moreBtn('lMore')}${okBtn('lSave',true,'Save')}</div>`;
  const body=`
    <div class="detail-hero"><div class="bigflag">${flag(c.code)}</div><h2>${e.place?esc(e.place.name):esc(c.name)}</h2><p>${e.place?esc(c.name)+' · ':''}${livedDur(l)}</p></div>
    <div class="section" style="margin-bottom:18px"><div class="section-h"><h2 style="font-size:17px">Place</h2></div>${placeRowsHTML(e.place?[e.place]:[],e.place?'Change place':'Add the city or island')}</div>
    <div class="section" style="margin-bottom:6px"><div class="group">
      <div class="field"><label>Moved in</label>${monthSel('lS',e.start,false)}</div>
      <div class="field"><label>Moved out</label>${monthSel('lE',e.end,true)}</div>
    </div><div class="hint">Leave “Moved out” empty if you still live there.</div></div>
    <div class="section" style="margin-top:18px;margin-bottom:18px"><div class="group"><button class="field" id="lH"><span>This is my home country</span><span class="toggle ${e.isHome?'on':''}"></span></button></div></div>
    <div class="section"><div class="group"><div class="field"><textarea id="lN" placeholder="Notes" rows="3">${esc(e.note)}</textarea></div></div></div>
    <div style="height:24px"></div>`;
  if(fresh)openSheet(head,body);else{$('#sheetHead').innerHTML=head;$('#sheetBody').innerHTML=body;sheet.classList.remove('half')}
  onMonth('lS',v=>{e.start=v});onMonth('lE',v=>{e.end=v});$('#lN').oninput=ev=>e.note=ev.target.value;
  $('#lH').onclick=()=>{e.isHome=!e.isHome;haptic();$('#lH .toggle').classList.toggle('on',e.isHome)};
  $$('[data-rmp]').forEach(b=>b.onclick=()=>{haptic();e.place=null;openLived(l,e)});
  $('[data-addp]').onclick=()=>renderPicker(()=>{},{places:true,cc:l.code,title:'Where did you live?',back:()=>openLived(l,e),onPlace:p=>{e.place=p;openLived(l,e)}});
  $('#lSave').onclick=()=>{Object.assign(l,{place:e.place,city:e.place?e.place.name:'',start:e.start,end:e.end&&e.end>=e.start?e.end:'',note:(e.note||'').trim()});
    if(e.isHome)state.home=l.code;else if(state.home===l.code)state.home=null;save();closeSheet();toast('Saved')};
  $('#lMore').onclick=ev=>openMenu(ev.currentTarget,[
    {label:`View ${c.name}`,icon:I.globe,onClick:()=>openDetail(c.code)},
    {label:'Remove Place',icon:I.trash,red:true,onClick:()=>{const i=state.lived.indexOf(l);state.lived.splice(i,1);save();closeSheet();toast('Place removed',()=>{state.lived.splice(i,0,l);save()})}},
  ]);
}

/* ---------- country detail ---------- */
function countryPlaces(code){
  const m=new Map();const add=(p,kind)=>{if(!p||!p.name)return;const k=p.name;const o=m.get(k)||{p,kinds:new Set(),n:0};o.kinds.add(kind);if(kind==='visited')o.n++;m.set(k,o)};
  state.trips.filter(t=>t.code===code).forEach(t=>(t.places||[]).forEach(p=>add(p,'visited')));
  state.lived.filter(l=>l.code===code).forEach(l=>add(l.place||(l.city?{name:l.city,type:'city'}:null),'lived'));
  state.plans.filter(p=>p.code===code).forEach(p=>(p.places||[]).forEach(x=>add(x,'planned')));
  state.wish.filter(w=>w.code===code).forEach(w=>add(w.place,'wish'));
  return [...m.values()];
}
function openDetail(code,focus){
  const c=C[code];if(!c)return;
  const trips=state.trips.filter(t=>t.code===code).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
  const lived=state.lived.filter(l=>l.code===code).sort((a,b)=>(b.start||'').localeCompare(a.start||''));
  const wi=state.wish.findIndex(w=>w.code===code&&!w.place),anyWish=state.wish.findIndex(w=>w.code===code),home=state.home===code;
  const places=countryPlaces(code),plans=state.plans.filter(p=>p.code===code).sort((a,b)=>(a.start||'9999').localeCompare(b.start||'9999'));
  const chips=[plans.length?`<span class="chip p">${I.plane} Planned · ${countdown(plans[0])}</span>`:'',home?`<span class="chip l">${I.house} Home country</span>`:'',lived.length?`<span class="chip l">${I.house} Lived here</span>`:'',trips.length?`<span class="chip v">${I.plane} ${trips.length} ${trips.length===1?'trip':'trips'}</span>`:'',anyWish>=0?`<span class="chip w">${I.star} #${anyWish+1} on your list</span>`:'',!trips.length&&!plans.length&&anyWish<0&&!lived.length&&!home?'<span class="chip n">Not yet</span>':''].join('');
  const kc={visited:'v',planned:'p',lived:'l',wish:'w'},kl={visited:'Been',planned:'Planned',lived:'Lived',wish:'Want to go'};
  openSheet(`${closeBtn}<span></span>${SP}`,`
    <div class="detail-hero"><div class="bigflag">${flag(code)}</div><h2>${esc(c.name)}</h2><p>${CONT[c.cont]}${c.terr?' · Territory':''}</p><div class="chips">${chips}</div></div>
    <div class="btn-row"><button class="btn-big v" id="dTrip">${I.plane}Add trip</button><button class="btn-big p" id="dPlan">${I.cal}Plan trip</button><button class="btn-big l" id="dLived">${I.house}Lived here</button><button class="btn-big w ${wi>=0?'on':''}" id="dWish">${I.star}${wi>=0?'On list':'Want to go'}</button></div>
    ${places.length?`<div class="section"><div class="section-h"><h2>Places</h2><span class="meta">${places.length}</span></div><div class="group">${places.map(({p,kinds,n})=>`<div class="row" style="min-height:54px${focus===p.name?';background:var(--card2)':''}"><div class="flag" style="font-size:20px">${typeIcon(p.type)}</div><div class="txt"><div class="t1">${esc(p.name)}</div><div class="t2">${TYPE_LABEL[p.type]||'Place'}${n>1?' · '+n+' visits':''}</div></div>${[...kinds].map(k=>`<span class="chip ${kc[k]} sm">${kl[k]}</span>`).join('')}</div>`).join('')}</div></div>`:''}
    ${wi>=0&&state.wish[wi].note?`<div class="section"><div class="section-h"><h2>Why go</h2></div><div class="group"><div class="row" style="min-height:0;padding:14px 16px">${esc(state.wish[wi].note)}</div></div></div>`:''}
    ${plans.length?`<div class="section"><div class="section-h"><h2>Planned</h2></div><div class="group">${plans.map(planRow).join('')}</div></div>`:''}
    ${lived.length?`<div class="section"><div class="section-h"><h2>Lived</h2></div><div class="group">${lived.map(l=>`<button class="row" data-lived="${l.id}"><div class="lv">${flag(l.code)}</div><div class="txt"><div class="t1">${l.city?esc(l.city):esc(c.name)}</div><div class="t2">${livedRange(l)} · ${livedDur(l)}</div></div>${I.chev}</button>`).join('')}</div></div>`:''}
    ${trips.length?`<div class="section"><div class="section-h"><h2>Trips</h2><span class="meta">${trips.reduce((s,t)=>s+days(t),0)} days total</span></div><div class="group">${trips.map(tripRow).join('')}</div></div>`:''}
  `,{half:true});
  spinTo(code);
  $('#dTrip').onclick=()=>openAdd('visited',code);
  $('#dLived').onclick=()=>openAdd('lived',code);
  $('#dPlan').onclick=()=>openAdd('planned',code);
  $('#dWish').onclick=()=>{
    haptic();
    if(wi>=0){const w=state.wish[wi];state.wish.splice(wi,1);save();toast('Removed from list',()=>{state.wish.splice(wi,0,w);save()});openDetail(code)}
    else openAdd('wish',code);
  };
}

/* ---------- settings (tab, iOS Settings style) ---------- */
let setRoute='root',setAnim='';
const SI={
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.4 5.2 3.4 8.5s-1 6.1-3.4 8.5c-2.4-2.4-3.4-5.2-3.4-8.5s1-6.1 3.4-8.5Z"/></svg>',
  spin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/></svg>',
  theme:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 0 18V3Z"/><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  colors:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="9" r="3.6"/><circle cx="16" cy="9" r="3.6" opacity=".75"/><circle cx="12" cy="15.5" r="3.6" opacity=".55"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.6 11h2.6v9.3h5.3v-5.6h3v5.6h5.3V11h2.6L12 3.2Z"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 13v6.5h14V13"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M5 13v6.5h14V13"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5l1 13.5h9l1-13.5"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/></svg>',
};
const sico=(icon,bg)=>`<span class="sico" style="background:${bg}">${SI[icon]}</span>`;
const srow=({id,icon,bg,label,val='',chev=true,cls='',attr=''})=>`<button class="srow ${cls}${icon?'':' noicon'}" ${id?`id="${id}"`:''} ${attr}>${icon?sico(icon,bg):''}<span class="lbl">${label}</span>${val?`<span class="val">${val}</span>`:''}${chev?I.chev:''}</button>`;
const MAPS=[['globe','Globe','A 3D globe you can spin.'],['flat','World map','A flat map that wraps around as you drag sideways.'],['static','Static map','A fixed flat map centred on Greenwich. Zoom in to pan around.']];
const THEMES=[['system','Automatic'],['light','Light'],['dark','Dark']];
function goSettings(route){setAnim=route==='root'?'pop-in':'push-in';setRoute=route;haptic();renderSettingsPage();$('#v-settings').scrollTop=0}
function renderSettingsPage(){
  const s=state.settings,page=$('#setPage');if(!page)return;
  const nav=$('#setNav'),titles={root:'Settings',map:'Map Style',theme:'Appearance',colors:'Colours'};
  nav.classList.toggle('sub',setRoute!=='root');
  $('#setInline').textContent=titles[setRoute];
  $('#setLead').innerHTML=setRoute==='root'?'':`<button class="glass-btn" id="setBack" aria-label="Back to Settings">${I.back}</button>`;
  if(setRoute!=='root')$('#setBack').onclick=()=>goSettings('root');
  let html='';
  if(setRoute==='root'){
    const all=allSet().size,home=state.home&&C[state.home];
    html=`<h1 class="large-title">Settings</h1>
    <div class="sgroup"><button class="profile-card" id="sHome"><div class="av">${home?flag(home.code):'🧭'}</div><div class="txt" style="flex:1;min-width:0"><div class="t1">${home?'From '+esc(home.name):'Set your home country'}</div><div class="t2">${all} ${all===1?'country':'countries'} · ${state.trips.length} ${state.trips.length===1?'trip':'trips'}</div></div>${I.chev}</button></div>
    <div class="sgap"></div>
    <div class="sgroup">
      ${srow({id:'sMap',icon:'map',bg:'#007AFF',label:'Map Style',val:MAPS.find(m=>m[0]===s.map)[1]})}
      ${s.map==='globe'?`<div class="srow">${sico('spin','#34C759')}<span class="lbl">Spin Globe When Idle</span><button class="toggle ${s.spin?'on':''}" id="sSpin" role="switch" aria-checked="${s.spin}" aria-label="Spin globe when idle"></button></div>`:''}
    </div>
    <div class="sgap"></div>
    <div class="sgroup">
      ${srow({id:'sTheme',icon:'theme',bg:'#636366',label:'Appearance',val:THEMES.find(t=>t[0]===s.theme)[1]})}
      ${srow({id:'sColors',icon:'colors',bg:'linear-gradient(135deg,var(--visited),var(--lived) 55%,var(--wish))',label:'Colours'})}
    </div>
    <div class="sgap"></div>
    <div class="sgroup">
      ${srow({id:'sExport',icon:'up',bg:'#007AFF',label:'Export Backup',chev:false})}
      ${srow({id:'sImport',icon:'down',bg:'#34C759',label:'Restore from Backup',chev:false})}
    </div>
    <div class="sfoot">Everything is stored only on this device, in this browser. Export a backup now and then, and to move to another device.</div>
    <div class="sgap"></div>
    <div class="sgroup">${srow({id:'sErase',icon:'trash',bg:'#FF3B30',label:'Erase All Data',chev:false,cls:'red'})}</div>
    <div class="sgap"></div>
    <div class="sgroup"><div class="srow">${sico('info','#8E8E93')}<span class="lbl">Version</span><span class="val">${APP_VERSION}</span></div></div>
    <div class="sfoot" style="text-align:center;padding-top:14px">Map data: Natural Earth · Places: GeoNames (CC BY 4.0)</div>
    <input type="file" id="sFile" accept="application/json,.json" hidden>`;
  }else if(setRoute==='map'){
    html=`<div style="height:12px"></div><div class="sgroup">${MAPS.map(([k,l])=>`<button class="srow noicon" data-map="${k}"><span class="lbl">${l}</span>${s.map===k?`<span class="chk">${I.check}</span>`:''}</button>`).join('')}</div>
    <div class="sfoot">${MAPS.find(m=>m[0]===s.map)[2]} Pinch, scroll or double-tap to zoom any map.</div>`;
  }else if(setRoute==='theme'){
    html=`<div style="height:12px"></div><div class="sgroup">${THEMES.map(([k,l])=>`<button class="srow noicon" data-theme-opt="${k}"><span class="lbl">${l}</span>${s.theme===k?`<span class="chk">${I.check}</span>`:''}</button>`).join('')}</div>
    <div class="sfoot">Automatic follows your device’s light and dark setting.</div>`;
  }else if(setRoute==='colors'){
    const colorRow=k=>{
      const cur=(s.colors[k]||cssVar('--'+k)).toUpperCase(),isPreset=PRESETS.includes(cur);
      return `<div class="color-row"><div class="top"><i style="background:var(--${k})"></i>${KINDS[k]}<span>${s.colors[k]?'Custom':'Default'}</span></div>
        <div class="swatches">${PRESETS.map(p=>`<button class="sw ${p===cur?'on':''}" style="background:${p};--sw:${p}" data-sw="${k}" data-c="${p}" aria-label="${p}"></button>`).join('')}
        <label class="sw custom ${!isPreset?'on':''}" style="--sw:${cur}" aria-label="Custom colour"><input type="color" data-cc="${k}" value="${cur.length===7?cur.toLowerCase():'#888888'}"></label></div></div>`;
    };
    html=`<div style="height:12px"></div><div class="sgroup">${['visited','planned','lived','wish'].map(colorRow).join('')}</div>
    <div class="sfoot">Used on the map, in lists and on the timeline.</div>
    <div class="sgap"></div><div class="sgroup">${srow({id:'sReset',label:'Reset to Default Colours',chev:false,cls:'blue'})}</div>`;
  }
  page.innerHTML=`<div class="${setAnim}">${html}<div style="height:30px"></div></div>`;setAnim='';
  const on=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=fn};
  on('sHome',pickHome);on('sMap',()=>goSettings('map'));on('sTheme',()=>goSettings('theme'));on('sColors',()=>goSettings('colors'));
  on('sSpin',()=>{s.spin=!s.spin;haptic();persist();renderSettingsPage()});
  on('sExport',exportBackup);on('sImport',()=>$('#sFile').click());
  const f=$('#sFile');if(f)f.onchange=e=>{const fl=e.target.files[0];if(fl)importBackup(fl);e.target.value=''};
  on('sErase',async()=>{if(!await iosAlert({title:'Erase All Data?',message:'This deletes every trip, place and wishlist entry on this device. It can’t be undone.',actions:[{label:'Cancel',style:'cancel',value:false},{label:'Erase',style:'destructive',value:true}]}))return;
    state.trips=[];state.plans=[];state.wish=[];state.lived=[];state.home=null;save();toast('All data erased')});
  $$('[data-map]').forEach(b=>b.onclick=()=>{s.map=b.dataset.map;haptic();persist();applySettings();renderSettingsPage()});
  $$('[data-theme-opt]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.themeOpt;haptic();persist();applySettings();renderSettingsPage();drawGlobe()});
  $$('[data-sw]').forEach(b=>b.onclick=()=>{s.colors[b.dataset.sw]=b.dataset.c;haptic();persist();applySettings();renderAll()});
  $$('[data-cc]').forEach(inp=>{inp.oninput=()=>{s.colors[inp.dataset.cc]=inp.value.toUpperCase();applySettings();drawGlobe()};inp.onchange=()=>{persist();renderAll()}});
  on('sReset',()=>{s.colors={};haptic();persist();applySettings();renderAll()});
}

/* ---------- iOS pull-down menu & alert ---------- */
function openMenu(anchor,items){
  closeMenu();haptic();
  const app=$('#app'),ar=app.getBoundingClientRect(),r=anchor.getBoundingClientRect();
  const sc=document.createElement('div');sc.className='menu-scrim';sc.id='menuScrim';
  const m=document.createElement('div');m.className='menu';m.id='menu';m.setAttribute('role','menu');
  m.innerHTML=items.map((it,i)=>`<button class="mi ${it.red?'red':''}" role="menuitem" data-mi="${i}" ${it.disabled?'disabled':''}><span class="mt"><span>${esc(it.label)}</span>${it.sub?`<span class="sub">${esc(it.sub)}</span>`:''}</span>${it.icon||''}</button>`).join('');
  m.style.top=(r.bottom-ar.top+8)+'px';m.style.right=(ar.right-r.right)+'px';
  app.appendChild(sc);app.appendChild(m);
  requestAnimationFrame(()=>m.classList.add('on'));
  sc.onpointerdown=e=>{e.preventDefault();closeMenu()};
  m.onclick=e=>{const b=e.target.closest('[data-mi]');if(!b||b.disabled)return;const it=items[+b.dataset.mi];closeMenu();setTimeout(()=>it.onClick&&it.onClick(),60)};
}
function closeMenu(){const m=$('#menu'),s=$('#menuScrim');if(s)s.remove();if(m){m.classList.remove('on');m.id='';setTimeout(()=>m.remove(),220)}}
function iosAlert({title,message='',actions}){
  return new Promise(res=>{
    const app=$('#app'),w=document.createElement('div');w.className='alert-scrim';
    w.innerHTML=`<div class="alert" role="alertdialog" aria-label="${esc(title)}"><h4>${esc(title)}</h4>${message?`<p>${esc(message)}</p>`:''}<div class="acts">${actions.map((x,i)=>`<button class="${x.style||'default'}" data-ai="${i}">${esc(x.label)}</button>`).join('')}</div></div>`;
    app.appendChild(w);requestAnimationFrame(()=>w.classList.add('on'));haptic();
    w.onclick=e=>{const b=e.target.closest('[data-ai]');if(!b)return;w.classList.remove('on');setTimeout(()=>w.remove(),200);res(actions[+b.dataset.ai].value)};
  });
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

/* ---------- backup ---------- */
async function exportBackup(){
  haptic();
  const d=new Date(),stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const name=`wayfarer-backup-${stamp}.json`;
  const blob=new Blob([JSON.stringify({app:'wayfarer',version:1,exportedAt:d.toISOString(),data:state},null,2)],{type:'application/json'});
  try{
    const file=new File([blob],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Wayfarer backup'});toast('Backup exported');return}
  }catch(e){if(e&&e.name==='AbortError')return}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Backup exported');
}
async function importBackup(file){
  try{
    const j=JSON.parse(await file.text()),d=j&&j.data?j.data:j;
    if(!d||!Array.isArray(d.trips))throw new Error('not a Wayfarer backup');
    const n=d.trips.length,l=(d.lived||[]).length,w=(d.wish||[]).length,pl=(d.plans||[]).length;
    if(!await iosAlert({title:'Restore Backup?',message:`This replaces everything on this device with ${n} trips, ${pl} planned trips, ${l} places lived and ${w} wishlist entries.`,actions:[{label:'Cancel',style:'cancel',value:false},{label:'Restore',style:'default',value:true}]}))return;
    state=normalize(JSON.parse(JSON.stringify(d)));persist();applySettings();renderAll();toast('Backup restored');
  }catch(e){toast('That file isn’t a Wayfarer backup.')}
}

/* ---------- toast & confetti ---------- */
let toastT;
function toast(msg,undo){
  const el=$('#toast');el.innerHTML=esc(msg)+(undo?' <button class="text-btn b" style="padding:0 0 0 6px;font-size:15px" id="undo">Undo</button>':'');
  el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),undo?4200:2400);
  if(undo)$('#undo').onclick=()=>{undo();el.classList.remove('on')};
}
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=$('#confetti'),app=$('#app'),dpr=devicePixelRatio||1;cv.width=app.clientWidth*dpr;cv.height=app.clientHeight*dpr;
  const ctx=cv.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);
  const cols=['--visited','--lived','--wish','--blue'].map(cssVar);
  const W=app.clientWidth,P=Array.from({length:110},()=>({x:W/2+(Math.random()-.5)*60,y:app.clientHeight*.35,vx:(Math.random()-.5)*11,vy:-Math.random()*13-4,r:Math.random()*6+3,a:Math.random()*6,va:(Math.random()-.5)*.4,c:cols[Math.random()*cols.length|0]}));
  let f=0;(function tick(){ctx.clearRect(0,0,W,app.clientHeight);P.forEach(p=>{p.vy+=.38;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);ctx.restore()});if(++f<150)requestAnimationFrame(tick);else ctx.clearRect(0,0,W,app.clientHeight)})();
}

/* ---------- map (globe / world map / static map) ---------- */
const globe={rot:[-10,-30,0],vel:[0,0],paused:false,dragging:false,idleAt:0,anim:null,sel:null,mode:'globe',k:1,tx:0,ty:0};
let features=[],featuresLo=[],projection,path,ctx,cv,W=0,H=0,dpr=1,graticule,baseScale=1;
const SPHERE={type:'Sphere'};
const ZMIN={globe:.7,flat:1,static:1},ZMAX={globe:8,flat:14,static:14};
function setMapMode(mode){
  const prev=globe.mode;globe.mode=['flat','static'].includes(mode)?mode:'globe';
  $('#globeWrap').classList.toggle('flat',globe.mode!=='globe');
  if(!window.d3)return;
  if(prev!==globe.mode||!projection){
    projection=globe.mode==='flat'?d3.geoEqualEarth().precision(.6):globe.mode==='static'?d3.geoNaturalEarth1().precision(.6):d3.geoOrthographic().clipAngle(90).precision(.6);
    path=ctx?d3.geoPath(projection,ctx):null;
    globe.rot=globe.mode==='globe'?[globe.rot[0],-30,0]:globe.mode==='flat'?[-10,0,0]:[0,0,0];
    globe.vel=[0,0];globe.anim=null;globe.k=1;globe.tx=0;globe.ty=0;
    resizeMap();updateZoomUI();
  }
}
function resizeMap(){
  if(!cv||!projection)return;const r=$('#globeWrap').getBoundingClientRect();if(!r.width)return;
  W=r.width;H=r.height;dpr=Math.min(2,devicePixelRatio||1);cv.width=W*dpr;cv.height=H*dpr;
  if(globe.mode==='globe'){baseScale=W*.4;projection.translate([W/2,H/2]).scale(baseScale*globe.k)}
  else{projection.rotate([0,0,0]).fitExtent([[2,2],[W-2,H-2]],SPHERE)}
  clampView();drawGlobe();
}
function clampView(){
  const g=globe;g.k=Math.max(ZMIN[g.mode],Math.min(ZMAX[g.mode],g.k));
  if(g.mode==='globe'){g.tx=g.ty=0;return}
  g.tx=Math.min(0,Math.max(W*(1-g.k),g.tx));g.ty=Math.min(0,Math.max(H*(1-g.k),g.ty));
}
function zoomAt(f,mx,my){
  const g=globe,old=g.k;g.k=Math.max(ZMIN[g.mode],Math.min(ZMAX[g.mode],g.k*f));const r=g.k/old;
  if(g.mode==='globe')projection.scale(baseScale*g.k);
  else{g.tx=mx-(mx-g.tx)*r;g.ty=my-(my-g.ty)*r;clampView()}
  g.idleAt=performance.now();updateZoomUI();drawGlobe();
}
function animateView(target,dur=420){
  const g=globe,from={k:g.k,tx:g.tx,ty:g.ty,rot:[...g.rot]};
  const ik=d3.interpolate(from.k,target.k??from.k),itx=d3.interpolate(from.tx,target.tx??from.tx),ity=d3.interpolate(from.ty,target.ty??from.ty);
  let tr=target.rot?[...target.rot]:from.rot;if(target.rot){from.rot[0]=((from.rot[0]-tr[0]+540)%360)-180+tr[0]}
  const ir=d3.interpolate(from.rot,tr);
  g.vel=[0,0];g.anim={t0:performance.now(),dur,apply:e=>{g.k=ik(e);g.tx=itx(e);g.ty=ity(e);g.rot=ir(e);if(g.mode==='globe')projection.scale(baseScale*g.k)},done:()=>{clampView();updateZoomUI()}};
}
function resetZoom(){haptic();const g=globe;animateView(g.mode==='globe'?{k:1}:{k:1,tx:0,ty:0})}
function updateZoomUI(){$('#zoomReset').classList.toggle('on',Math.abs(globe.k-1)>.02)}
const toLocal=(x,y)=>globe.mode==='globe'?[x,y]:[(x-globe.tx)/globe.k,(y-globe.ty)/globe.k];
function initGlobe(){
  if(!window.d3||!window.topojson){$('#globeWrap').style.display='none';$('.legend').style.display='none';return}
  features=topojson.feature(TOPO,TOPO.objects.countries).features.filter(f=>f.id);
  features.forEach(f=>{f.code=NUM2A[f.id]||null;f._c=d3.geoCentroid(f);f._a=d3.geoArea(f);if(f._a>6.3)f._a=0});
  featuresLo=topojson.feature(TOPO_LO,TOPO_LO.objects.countries).features.filter(f=>f.id);
  featuresLo.forEach(f=>f.code=NUM2A[f.id]||null);
  cv=$('#globe');ctx=cv.getContext('2d');graticule=d3.geoGraticule10();
  projection=null;setMapMode(state.settings.map);path=d3.geoPath(projection,ctx);
  new ResizeObserver(resizeMap).observe($('#globeWrap'));
  const wrap=$('#globeWrap'),ptrs=new Map();
  let last=null,moved=0,lastT=0,pinch=null,lastTap=0;
  const rel=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  const pinchInfo=()=>{const [a,b]=[...ptrs.values()];return {d:Math.hypot(a[0]-b[0],a[1]-b[1]),m:[(a[0]+b[0])/2,(a[1]+b[1])/2]}};
  wrap.addEventListener('pointerdown',e=>{
    if(e.target.closest('.map-ctl'))return;
    wrap.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,rel(e));
    globe.dragging=true;globe.vel=[0,0];globe.anim=null;lastT=performance.now();
    if(ptrs.size===2){pinch=pinchInfo();moved=99}else if(ptrs.size===1){last=rel(e);moved=0}
  });
  wrap.addEventListener('pointermove',e=>{
    if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,rel(e));
    const g=globe;
    if(ptrs.size>=2&&pinch){
      const p=pinchInfo();zoomAt(p.d/Math.max(1,pinch.d),p.m[0],p.m[1]);
      panBy(p.m[0]-pinch.m[0],p.m[1]-pinch.m[1]);pinch=p;return;
    }
    if(!last)return;const cur=rel(e),dx=cur[0]-last[0],dy=cur[1]-last[1];last=cur;moved+=Math.abs(dx)+Math.abs(dy);
    const now=performance.now(),dt=Math.max(1,now-lastT);lastT=now;
    const v=panBy(dx,dy);g.vel=[v[0]*16/dt,v[1]*16/dt];
  });
  const up=e=>{
    if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
    if(ptrs.size===1){pinch=null;last=[...ptrs.values()][0];globe.vel=[0,0];return}
    if(ptrs.size>0)return;
    const wasPinch=!!pinch;pinch=null;
    const p=rel(e);last=null;globe.dragging=false;globe.idleAt=performance.now();
    if(wasPinch){globe.vel=[0,0];return}
    if(moved<6&&e.type==='pointerup'){globe.vel=[0,0];
      const now=performance.now();
      if(now-lastTap<300){lastTap=0;clearTimeout(globe.tapT);zoomAt(2,p[0],p[1]);haptic();return}
      lastTap=now;
      clearTimeout(globe.tapT);globe.tapT=setTimeout(()=>{
        let best=null,bd=15;allPins().forEach(pn=>{const q=pinScreen(pn);if(!q)return;const dd=Math.hypot(q[0]-p[0],q[1]-p[1]);if(dd<bd){bd=dd;best=pn}});
        if(best&&C[best.cc]){haptic();globe.selPin=best.name;openDetail(best.cc,best.name);return}
        const ll=projection.invert(toLocal(p[0],p[1]));
        if(ll&&(globe.mode!=='globe'||d3.geoDistance(ll,[-globe.rot[0],-globe.rot[1]])<Math.PI/2)){
          const f=features.find(f=>d3.geoContains(f,ll));if(f&&f.code&&C[f.code]){haptic();openDetail(f.code)}}
      },260);
    }
  };
  wrap.addEventListener('pointerup',up);wrap.addEventListener('pointercancel',up);
  wrap.addEventListener('wheel',e=>{e.preventDefault();globe.anim=null;const p=rel(e);
    const f=Math.exp(-e.deltaY*(e.ctrlKey?.012:.0022));zoomAt(f,p[0],p[1])},{passive:false});
  $('#zoomIn').onclick=()=>{haptic();const g=globe;animateZoom(1.8)};
  $('#zoomOut').onclick=()=>{haptic();animateZoom(1/1.8)};
  $('#zoomReset').onclick=resetZoom;
  requestAnimationFrame(loop);
}
function animateZoom(f){
  const g=globe,nk=Math.max(ZMIN[g.mode],Math.min(ZMAX[g.mode],g.k*f)),r=nk/g.k,mx=W/2,my=H/2;
  if(g.mode==='globe')animateView({k:nk});
  else{let tx=mx-(mx-g.tx)*r,ty=my-(my-g.ty)*r;tx=Math.min(0,Math.max(W*(1-nk),tx));ty=Math.min(0,Math.max(H*(1-nk),ty));animateView({k:nk,tx,ty})}
}
// returns applied velocity components
function panBy(dx,dy){
  const g=globe;
  if(g.mode==='globe'){const k=110/projection.scale()*.55;g.rot[0]+=dx*k;g.rot[1]=Math.max(-85,Math.min(85,g.rot[1]-dy*k));drawGlobe();return [dx*k,-dy*k]}
  if(g.mode==='flat'){const k=360/(W*g.k);g.rot[0]+=dx*k;g.ty+=dy;clampView();drawGlobe();return [dx*k,dy]}
  g.tx+=dx;g.ty+=dy;clampView();drawGlobe();return [dx,dy];
}
let wasMoving=false;
function loop(t){
  const g=globe;g.spinning=false;
  if(!g.dragging&&!g.anim){
    if(Math.abs(g.vel[0])+Math.abs(g.vel[1])>.01){
      if(g.mode==='globe'){g.rot[0]+=g.vel[0];g.rot[1]=Math.max(-85,Math.min(85,g.rot[1]+g.vel[1]))}
      else if(g.mode==='flat'){g.rot[0]+=g.vel[0];g.ty+=g.vel[1];clampView()}
      else{g.tx+=g.vel[0];g.ty+=g.vel[1];clampView()}
      g.vel=g.vel.map(v=>v*.93);drawGlobe();
    }
    else if(g.mode==='globe'&&state.settings.spin&&!g.paused&&!document.hidden&&curTab==='atlas'&&g.k<=1.05&&t-g.idleAt>3500&&!reduceMotion){g.spinning=true;g.rot[0]+=.07;drawGlobe()}
  }
  if(g.anim){const a=g.anim,p=Math.min(1,(t-a.t0)/a.dur),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;a.apply(e);drawGlobe();if(p>=1){g.anim=null;a.done&&a.done();g.idleAt=t+2500;drawGlobe()}}
  const mv=g.dragging||!!g.anim||g.spinning||Math.abs(g.vel[0])+Math.abs(g.vel[1])>.01;
  if(wasMoving&&!mv)drawGlobe();wasMoving=mv;
  requestAnimationFrame(loop);
}
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function allPins(){
  const m=new Map(),rank={lived:4,visited:3,planned:2,wish:1};
  const add=(p,cc,kind)=>{if(!p||p.lat==null||p.lng==null)return;const k=cc+'|'+p.name;const o=m.get(k);if(!o||rank[kind]>rank[o.kind])m.set(k,{name:p.name,cc,lat:p.lat,lng:p.lng,kind,type:p.type})};
  state.trips.forEach(t=>(t.places||[]).forEach(p=>add(p,t.code,'visited')));
  state.lived.forEach(l=>add(l.place,l.code,'lived'));
  state.plans.forEach(p=>(p.places||[]).forEach(x=>add(x,p.code,'planned')));
  state.wish.forEach(w=>add(w.place,w.code,'wish'));
  return [...m.values()];
}
function pinScreen(p){const q=projection([p.lng,p.lat]);if(!q)return null;
  if(globe.mode==='globe'){if(d3.geoDistance([p.lng,p.lat],[-globe.rot[0],-globe.rot[1]])>Math.PI/2-.02)return null;return q}
  return [q[0]*globe.k+globe.tx,q[1]*globe.k+globe.ty]}
function spinTo(code,place){
  if(!features.length)return;const f=features.find(x=>x.code===code);globe.sel=code;globe.selPin=place&&place.lat!=null?place.name:null;
  const hasP=place&&place.lat!=null;
  if(!f&&!hasP){drawGlobe();return}
  const [lon,lat]=hasP?[place.lng,place.lat]:d3.geoCentroid(f),g=globe;
  if(g.mode==='globe')animateView({rot:[-lon,Math.max(-70,Math.min(70,-lat)),0]},900);
  else if(g.mode==='flat'){const p=d3.geoEqualEarth().fitExtent([[2,2],[W-2,H-2]],SPHERE)([0,lat]);let ty=H/2-p[1]*g.k;ty=Math.min(0,Math.max(H*(1-g.k),ty));animateView({rot:[-lon,0,0],ty},900)}
  else{const p=projection([lon,lat]);if(p&&g.k>1.02){let tx=W/2-p[0]*g.k,ty=H/2-p[1]*g.k;tx=Math.min(0,Math.max(W*(1-g.k),tx));ty=Math.min(0,Math.max(H*(1-g.k),ty));animateView({tx,ty},700)}}
  clearTimeout(g.selT);g.selT=setTimeout(()=>{g.sel=null;g.selPin=null;drawGlobe()},4000);
}
function drawGlobe(){
  if(!ctx||!W||!projection)return;
  if(!path||path.projection()!==projection)path=d3.geoPath(projection,ctx);
  const g=cssVar,G=globe,isG=G.mode==='globe',k=isG?1:G.k;
  projection.rotate(isG?G.rot:G.mode==='flat'?[G.rot[0],0,0]:[0,0,0]);
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const cx=W/2,cy=H/2,R=isG?projection.scale():0;
  if(isG){const atm=ctx.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.18);atm.addColorStop(0,g('--atmo'));atm.addColorStop(1,'transparent');
    ctx.fillStyle=atm;ctx.beginPath();ctx.arc(cx,cy,R*1.2,0,7);ctx.fill()}
  if(!isG)ctx.setTransform(dpr*k,0,0,dpr*k,dpr*G.tx,dpr*G.ty);
  const oc=isG?ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R):ctx.createLinearGradient(0,0,0,H);
  oc.addColorStop(0,g('--ocean1'));oc.addColorStop(1,g('--ocean2'));
  ctx.save();ctx.beginPath();path(SPHERE);ctx.fillStyle=oc;ctx.fill();ctx.clip();
  ctx.beginPath();path(graticule);ctx.strokeStyle=g('--grat');ctx.lineWidth=.6/k;ctx.stroke();
  const vs=visitedSet(),ls=livedSet(),ws=wishSet();
  const pls=plannedSet();
  const kind=c=>ls.has(c)?'lived':vs.has(c)?'visited':pls.has(c)?'planned':ws.has(c)?'wish':null;
  const fills={null:g('--land'),visited:g('--visited'),planned:g('--planned'),lived:g('--lived'),wish:g('--wish')};
  const moving=G.dragging||!!G.anim||Math.abs(G.vel[0])+Math.abs(G.vel[1])>.01||G.spinning;
  const st=G.mode==='static';
  const FS=(!st&&moving&&featuresLo.length)?featuresLo:features;
  ctx.lineWidth=(isG?.5:.5+Math.min(.5,(k-1)*.08))/k;ctx.strokeStyle=g('--land-edge');
  if(st){
    const key=W+'x'+H;if(G.p2dKey!==key){const gp=d3.geoPath(projection);features.forEach(f=>{f._p2d=new Path2D(gp(f)||'')});G.p2dKey=key}
    features.forEach(f=>{ctx.fillStyle=fills[kind(f.code)];ctx.fill(f._p2d)});
    features.forEach(f=>ctx.stroke(f._p2d));
  }else{
    ctx.beginPath();FS.forEach(f=>path(f));ctx.fillStyle=fills.null;ctx.fill();ctx.stroke();
    ['wish','planned','visited','lived'].forEach(kk=>{let any=false;ctx.beginPath();FS.forEach(f=>{if(kind(f.code)===kk){path(f);any=true}});if(any){ctx.fillStyle=fills[kk];ctx.fill();ctx.stroke()}});
  }
  const S=projection.scale()*k;
  features.forEach(f=>{const kk=kind(f.code);if(!kk)return;if(f._a*S*S>14)return;const c=f._c;
    if(isG&&d3.geoDistance(c,[-G.rot[0],-G.rot[1]])>Math.PI/2-.05)return;const p=projection(c);if(!p)return;
    ctx.beginPath();ctx.arc(p[0],p[1],(isG?3.2:2.8)/k,0,7);ctx.fillStyle=fills[kk];ctx.fill();ctx.lineWidth=1.2/k;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke()});
  if(G.sel){const f=features.find(x=>x.code===G.sel);if(f){ctx.beginPath();if(st&&f._p2d)ctx.stroke(f._p2d),ctx.beginPath();else path(f);ctx.strokeStyle='#fff';ctx.lineWidth=2/k;ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0}}
  const pinsL=allPins(),zoomed=isG?G.k>=2.2:k>=2.6;
  ctx.textAlign='center';ctx.textBaseline='middle';
  pinsL.forEach(pn=>{if(isG&&d3.geoDistance([pn.lng,pn.lat],[-G.rot[0],-G.rot[1]])>Math.PI/2-.02)return;const q=projection([pn.lng,pn.lat]);if(!q)return;
    const sel=G.selPin===pn.name,r=(sel?6.5:4.2)/k;
    ctx.beginPath();ctx.arc(q[0],q[1],r+1.8/k,0,7);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=4;ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(q[0],q[1],r,0,7);ctx.fillStyle=fills[pn.kind];ctx.fill();
    if(zoomed||sel){ctx.font=`600 ${12/k}px -apple-system,system-ui,sans-serif`;ctx.lineJoin='round';ctx.lineWidth=3/k;ctx.strokeStyle=g('--bg');
      ctx.strokeText(pn.name,q[0],q[1]-(r+9/k));ctx.fillStyle=g('--label');ctx.fillText(pn.name,q[0],q[1]-(r+9/k))}});
  if(state.home){const f=features.find(x=>x.code===state.home);if(f){const c=f._c;
    if(!isG||d3.geoDistance(c,[-G.rot[0],-G.rot[1]])<Math.PI/2-.05){const p=projection(c);if(p){ctx.font=(15/k)+'px -apple-system,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.beginPath();ctx.arc(p[0],p[1],10/k,0,7);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=5;ctx.fill();ctx.shadowBlur=0;ctx.fillText('🏠',p[0],p[1]+1/k)}}}}
  ctx.restore();
  if(isG){const sp=ctx.createRadialGradient(cx-R*.45,cy-R*.5,0,cx-R*.3,cy-R*.35,R*1.1);sp.addColorStop(0,'rgba(255,255,255,.22)');sp.addColorStop(.5,'rgba(255,255,255,0)');sp.addColorStop(1,'rgba(0,0,0,.18)');
    ctx.fillStyle=sp;ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fill()}
  else{ctx.beginPath();path(SPHERE);ctx.strokeStyle=g('--sep');ctx.lineWidth=1/k;ctx.stroke()}
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{applySettings();drawGlobe()});

['gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
function renderAll(){renderAtlas();renderTimeline();renderVisited();renderVisitedMode();renderLived();renderWish();renderSettingsPage()}
initGlobe();applySettings();renderAll();
})();
