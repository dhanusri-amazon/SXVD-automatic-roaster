const ROSTER_ROLE_FILTERS = ['All Employees','Managers Only','TL Only','Associates Only','Male Associates Only','Female Associates Only','Female Only (Associate + DHH)','DHH Only','PAs Only'];
function matchesRosterRole(e, f) {
  const r=String(e.role||'').trim().toLowerCase(), g=String(e.gender||'').trim().toLowerCase(), a=r==='associate'||r==='associates';
  if(f==='Managers Only') return r==='manager'||r==='managers';
  if(f==='TL Only') return ['tl','team lead','team leader'].includes(r);
  if(f==='Associates Only') return a;
  if(f==='Male Associates Only') return a&&g==='male';
  if(f==='Female Associates Only') return a&&g==='female';
  if(f==='Female Only (Associate + DHH)') return g==='female'&&(a||r==='dhh');
  if(f==='DHH Only') return r==='dhh';
  if(f==='PAs Only') return ['pa','pas','personal assistant','personal assistants'].includes(r);
  return true;
}
/* ===== SXVD AI Roster - all data stored in browser localStorage ===== */
const $ = s => document.querySelector(s);
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = [2026,2027,2028,2029,2030];
const GROUPS = {A:[0,1],B:[1,2],C:[2,3],D:[3,4],E:[4,5],F:[5,6],G:[6,0]};
const GNAME = g => g+' — '+GROUPS[g].map(d=>DAYS[d]).join(' & ');

const DEFAULT = {
  users:[],
  emps:[
    {id:1,name:'Dhanusri',group:'A',role:'Associate',gender:'Female',lc:'FT1'},
    {id:2,name:'Ravi Kumar',group:'B',role:'Associate',gender:'Male',lc:'FT2'},
    {id:3,name:'Priya',group:'C',role:'TL',gender:'Female',lc:'—'},
    {id:4,name:'Arun',group:'D',role:'DHH',gender:'Male',lc:'—'},
    {id:5,name:'Sowmya',group:'E',role:'Associate',gender:'Female',lc:'FT1'},
    {id:6,name:'Karthik',group:'F',role:'Manager',gender:'Male',lc:'—'}],
  settings:{ds:'09:45',de:'19:45',ns:'20:00',ne:'06:00',dayReq:10,nightReq:8},
  cons:{maxDays:5,minOff:2,nightDay:'No',useAvail:'Yes'},
  avail:[], roster:{}, notes:[], rule:'Balanced'
};
let S = JSON.parse(localStorage.getItem('sxvd') || 'null') || DEFAULT;
/* migrate data saved by older versions: 5 working days + 2 OFF per week */
if (S.cons.maxDays === 6 && S.cons.minOff === 1) { S.cons.maxDays = 5; S.cons.minOff = 2; S.roster = {}; }
S.rule = 'Balanced';
const save = () => localStorage.setItem('sxvd', JSON.stringify(S));
let user = null, page = 'dashboard', roleF = 'All Employees', empQ = '', empR = 'All', empG = 'All', empL = 'All';
let month = new Date().toISOString().slice(0,7);
/* keep month inside the 2026 - 2030 range */
if (+month.slice(0,4) < YEARS[0]) month = YEARS[0] + '-01';
if (+month.slice(0,4) > YEARS[YEARS.length-1]) month = YEARS[YEARS.length-1] + '-12';

const dayL = () => `${S.settings.ds}-${S.settings.de}`;
const nightL = () => `${S.settings.ns} - ${S.settings.ne}`;
const OFF = 'OFF';
const cls = v => v===OFF ? 'O' : v===dayL() ? 'D' : 'N';
const notify = (t,m) => { S.notes.unshift({t,m,at:new Date().toLocaleString(),read:false}); save(); if(document.querySelector('#nav')) buildNav(); };

/* ===== CUSTOM ICON SET + LOGO (inline SVG, no emoji) ===== */
const ic = p => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICONS = {
  dashboard: ic('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  employees: ic('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.2c2.4.2 4 2.1 4 4.8"/>'),
  roster:    ic('<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h2M14 14h2M8 17.5h2"/>'),
  shift:     ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>'),
  cons:      ic('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>'),
  reports:   ic('<path d="M5 20v-8M11 20V5M17 20v-5M3 21h18"/>'),
  avail:     ic('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>'),
  ai:        ic('<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  notes:     ic('<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>'),
  users:     ic('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  dl:        ic('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 20h16"/>')
};
/* SXVD logo: a mini roster grid (Day / Night / Off cells) + spark */
const LOGO = id => '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f7cff"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>'+
  '<rect width="48" height="48" rx="14" fill="url(#lg'+id+')"/>'+
  [['1','.55','.22'],['.55','.22','1'],['.22','1','.55']].map((row,r)=>row.map((o,c)=>'<rect x="'+(12+c*9)+'" y="'+(12+r*9)+'" width="6" height="6" rx="1.8" fill="#fff" fill-opacity="'+o+'"/>').join('')).join('')+
  '<path d="M40 3.5L41.3 6.7 44.5 8 41.3 9.3 40 12.5 38.7 9.3 35.5 8 38.7 6.7Z" fill="#fff"/></svg>';

document.querySelector('.logo').innerHTML = LOGO('a');
document.querySelector('.brand span').innerHTML = LOGO('b');

/* ===== AUTH ===== */
let signup = false;
$('#authSwitch').onclick = e => {
  e.preventDefault(); signup = !signup;
  $('#p2').classList.toggle('hide', !signup);
  $('#authTitle').textContent = signup ? 'Create your account' : 'Login to continue';
  $('#authBtn').textContent = signup ? '➕ Create Account' : '🔐 Login';
  $('#authSwitch').textContent = signup ? 'Back to Login' : 'Create Account';
  $('#authMsg').textContent = '';
};
$('#authBtn').onclick = () => {
  const u = $('#u').value.trim(), p = $('#p').value, r = $('#r').value, m = $('#authMsg');
  if (!u || !p) return m.textContent = 'Enter username and password.';
  if (signup) {
    if (p !== $('#p2').value) return m.textContent = 'Passwords do not match.';
    if (S.users.find(x => x.u.toLowerCase() === u.toLowerCase())) return m.textContent = 'Username already exists.';
    S.users.push({u,p,r}); save(); $('#authSwitch').click();
    m.style.color = '#4ade80'; m.textContent = 'Account created. Please login.';
  } else {
    const f = S.users.find(x => x.u === u && x.p === p && x.r === r);
    if (!f) return m.textContent = 'Invalid username, password or role.';
    user = f; notify('Login Successful', 'Welcome '+f.u+'.');
    $('#auth').classList.add('hide'); $('#app').classList.remove('hide');
    $('#who').textContent = `👤 ${f.u} (${f.r})`; buildNav(); go('dashboard');
  }
};
$('#logout').onclick = () => location.reload();

/* ===== NAV ===== */
const NAV = [
  ['dashboard','Dashboard'],['employees','Employees'],['roster','Monthly Roster'],
  ['PLANNING'],['shift','Shift Settings'],['cons','Constraints'],['reports','Reports'],
  ['EMPLOYEES'],['avail','Availability'],
  ['SMART TOOLS'],['ai','AI Roster Assistant'],['notes','Notifications'],
  ['ADMINISTRATION'],['users','Users']];
function buildNav() {
  const unread=S.notes.filter(n=>!n.read).length;
  $('#nav').innerHTML=NAV.map(n=>n.length===1
    ? '<small>'+n[0]+'</small>'
    : '<button data-p="'+n[0]+'" class="'+(n[0]===page?'active':'')+'"><span class="ni">'+ICONS[n[0]]+'</span><span class="nl">'+n[1]+'</span>'+(n[0]==='notes'&&unread?'<span class="nav-badge">'+unread+'</span>':'')+'</button>'
  ).join('');
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.p));
}
function go(p) {
  page = p; buildNav();
  $('#who').classList.toggle('hide', p !== 'dashboard');
  const t = NAV.find(n => n[0]===p)[1];
  $('#pageTitle').innerHTML = '<span class="ttl-ic">'+ICONS[p]+'</span>'+t;
  ({dashboard,employees,roster,shift,cons,reports,avail,ai,notes,users})[p]();
}

/* ===== ROSTER ENGINE =====
   Rules:
   1. 2 weeks DAY, then 2 weeks NIGHT (4-block cycle).
   2. Every work block = exactly 5 working days followed by the employee's 2 compulsory OFF days.
   3. A shift only changes right after the 2 OFF days, so NIGHT is never followed by DAY on the next day.
   Each employee's block starts the day after their week-off pair (their group) ends. */
/* Headcount row of an employee - every employee belongs to exactly ONE row, so Total HC = sum of rows */
function rowOf(e) {
  if (e.role === 'DHH') return 'DHH';
  if (e.gender === 'Male') return 'Male';
  if (e.lc === 'FT1') return 'FT1';
  if (e.lc === 'FT2') return 'FT2';
  return null;
}
const daysIn = m => new Date(+m.slice(0,4), +m.slice(5), 0).getDate();
const BASE = new Date(2025, 11, 28);   /* Sunday, 28 Dec 2025 */
function blockNo(dt, startDay) {
  const diff = Math.round((dt - BASE) / 86400000) - startDay;   /* blocks begin on weekday startDay */
  return Math.floor(diff / 7);
}

/* FT1:FT2 must be between 40:60 and 60:40 (50:50 ideal). With very small / odd counts a 1-person difference is accepted. */
function ftRatioOK(a, b) {
  const t = a + b; if (!t) return true;
  const share = a / t;
  return (share >= 0.4 && share <= 0.6) || Math.abs(a - b) <= 1;
}
/* Pick each employee's starting point in the 4-block cycle (2 blocks DAY, 2 blocks NIGHT).
   Male / DHH are spread evenly. FT1 and FT2 staff are optimised together so that, on every day of the
   28-day cycle, FT1 : FT2 stays as close to 50:50 as possible (never worse than 40:60 / 60:40 where the
   headcount allows) on BOTH the DAY and the NIGHT shift, while DAY and NIGHT totals stay balanced. */
let _phKey = '', _phVal = null;   /* cache: phases only change when employee data changes */
function cyclePhases() {
  const key = JSON.stringify(S.emps.map(e => [e.id, e.group, e.role, e.gender, e.lc]));
  if (key === _phKey && _phVal) return _phVal;
  const PH = {}, seen = {};
  const pat = (e, ph) => {
    const offs = GROUPS[e.group] || [0,1], st = (offs[1]+1) % 7;
    return Array.from({length:28}, (_, j) => {
      const dt = new Date(BASE.getFullYear(), BASE.getMonth(), BASE.getDate() + j);
      if (offs.includes(dt.getDay())) return 2;
      return (((blockNo(dt, st) + ph) % 4) + 4) % 4 < 2 ? 0 : 1;
    });
  };
  S.emps.forEach(e => { const c = rowOf(e) || 'Other', k = seen[c] = (seen[c] || 0) + 1; PH[e.id] = (k - 1) % 4; });
  const ft = S.emps.filter(e => rowOf(e) === 'FT1' || rowOf(e) === 'FT2');
  if (!ft.length) { _phKey = key; _phVal = PH; return PH; }
  const cache = {}; ft.forEach(e => { cache[e.id] = [0,1,2,3].map(p => pat(e, p)); });
  const cost = () => {
    let c = 0;
    for (let j = 0; j < 28; j++) {
      const f1 = [0,0], f2 = [0,0];
      ft.forEach(e => { const v = cache[e.id][PH[e.id]][j]; if (v < 2) (rowOf(e) === 'FT1' ? f1 : f2)[v]++; });
      for (let sh = 0; sh < 2; sh++) c += (ftRatioOK(f1[sh], f2[sh]) ? 0 : 100) + Math.abs(f1[sh] - f2[sh]);
      c += 0.3 * Math.abs((f1[0] + f2[0]) - (f1[1] + f2[1]));   /* keep DAY / NIGHT totals even */
    }
    return c;
  };
  /* coordinate descent from several deterministic starting points; keep the best result */
  const descend = () => {
    let cur = cost();
    for (let pass = 0; pass < 10; pass++) {
      let improved = false;
      ft.forEach(e => {
        let bestP = PH[e.id];
        for (let p = 0; p < 4; p++) {
          const prev = PH[e.id]; PH[e.id] = p;
          const c = cost();
          if (c < cur - 1e-9) { cur = c; bestP = p; improved = true; }
          PH[e.id] = prev;
        }
        PH[e.id] = bestP;
      });
      if (!improved) break;
    }
    return cur;
  };
  let bestCost = descend(), bestPH = {...PH}, seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const restarts = ft.length > 40 ? 4 : 30;
  for (let t = 0; t < restarts && bestCost > 0.5; t++) {
    ft.forEach(e => { PH[e.id] = Math.floor(rnd() * 4); });
    const c = descend();
    if (c < bestCost) { bestCost = c; bestPH = {...PH}; }
  }
  Object.assign(PH, bestPH);
  _phKey = key; _phVal = PH;
  return PH;
}

function generate(m = month) {
  const n = daysIn(m), out = {}, seen = {};
  const PH = cyclePhases();
  S.emps.forEach((e, i) => {
    out[e.id] = [];
    /* spread every headcount row (Male / FT1 / FT2 / DHH) evenly over the 4 cycle phases,
       so FT1 and FT2 are balanced on DAY and on NIGHT */
    const cat = rowOf(e) || 'Other';
    const k = seen[cat] = (seen[cat] || 0) + 1;
    const offs = GROUPS[e.group] || [0,1];
    const startDay = (offs[1] + 1) % 7;   /* work block starts the day after the 2nd OFF day */
    const phase = PH[e.id];
    for (let d = 1; d <= n; d++) {
      const dt = new Date(+m.slice(0,4), +m.slice(5)-1, d), wd = dt.getDay();
      const iso = `${m}-${String(d).padStart(2,'0')}`;
      let v;
      if (offs.includes(wd)) v = OFF;
      else if (S.cons.useAvail==='Yes' && S.avail.find(a => a.emp==e.id && a.date===iso && a.status!=='Available')) v = OFF;
      else {
        const pos = (((blockNo(dt, startDay) + phase) % 4) + 4) % 4;   /* 0,1 = DAY | 2,3 = NIGHT */
        v = pos < 2 ? dayL() : nightL();
      }
      out[e.id].push(v);
    }
  });
  S.roster[m] = out; save(); return out;
}
const getRoster = (m = month) => S.roster[m] || generate(m);

/* Headcount table (used by Dashboard + Reports) */
function hcTable(from, to) {
  const r = getRoster(), n = daysIn(month), idx = [];
  for (let d = from; d <= Math.min(to,n); d++) idx.push(d-1);
  const head = idx.map(i => { const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
    return `<th>${DAYS[dt.getDay()]}<br>${String(i+1).padStart(2,'0')}/${month.slice(5)}</th>`; }).join('');
  let h = `<div class="scroll"><table><tr><th>Shift / HC</th>${head}</tr>`;
  const sh = [[dayL(),'Day'],[nightL(),'Night']];
  sh.forEach(([lab]) => {
    h += `<tr class="hd"><td colspan="${idx.length+1}">${lab} Shift — FT1 / FT2 Balanced</td></tr>`;
    /* every employee is counted in exactly one row, so Total HC = Male + FT1 + FT2 + DHH */
    const rows = ['Male','FT1','FT2','DHH'];
    const cnt = (name,i) => S.emps.filter(e => rowOf(e)===name && r[e.id] && r[e.id][i]===lab).length;
    const sums = idx.map(() => 0);
    rows.forEach(name => {
      h += `<tr><td>${name}</td>` + idx.map((i,k) => { const c = cnt(name,i); sums[k] += c; return `<td>${c}</td>`; }).join('') + '</tr>';
    });
    h += `<tr class="tot"><td>Total HC</td>` + sums.map(c=>`<td>${c}</td>`).join('') + '</tr>';
  });
  h += `<tr class="yl"><td>Total Working HC</td>` + idx.map(i => S.emps.filter(e => r[e.id] && r[e.id][i]!==OFF).length).map(c=>`<td>${c}</td>`).join('') + '</tr></table>';
  const miss = S.emps.filter(e => !rowOf(e));
  if (miss.length) h += `<p class="warn">⚠️ ${miss.length} employee(s) are not counted in the rows (${miss.map(e=>e.name).join(', ')}): female with no LC curve. Set their LC Curve to FT1 or FT2.</p>`;
  h += '</div>';
  return h;
}

/* ===== PAGES ===== */
/* ===== WEEKLY OVERVIEW (auto-updates from the roster) ===== */
let wkStart = null, wkMonth = null;
function weekRange() {
  const n = daysIn(month), now = new Date();
  const cur = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  if (wkMonth !== month || wkStart === null || wkStart < 1 || wkStart > n) {
    wkMonth = month;
    wkStart = month === cur ? Math.max(1, now.getDate() - now.getDay()) : 1;   /* current week starts on Sunday */
  }
  return [wkStart, Math.min(wkStart + 6, n)];
}
function dashboard() {
  const [f, t] = weekRange(), n = daysIn(month);
  $('#view').innerHTML = `
  <div class="card"><h3>📊 Weekly Operations Overview <span class="tag" style="float:right">LIVE</span></h3>
  <p class="sub">${MONTHS[+month.slice(5)-1]} ${month.slice(0,4)} · Days ${f}–${t} · Updates automatically whenever the roster, employees, shifts or availability change. Last updated ${new Date().toLocaleTimeString()}</p>
  <div class="bar"><button class="btn ghost" id="wp">◀ Prev Week</button><button class="btn ghost" id="wt">This Week</button><button class="btn ghost" id="wn">Next Week ▶</button><button class="btn green" id="wd">${ICONS.dl}Download Week Overview</button></div>
  ${hcTable(f,t)}</div>
  <div class="card"><h3>📅 Week-Off Planning <span class="tag" style="float:right">7 GROUPS</span></h3>
  <p class="sub">Weekly off groups used by the roster generator.</p><div class="grid">
  ${Object.keys(GROUPS).map(g => `<div class="grp"><h4>Group ${g}</h4><b>📅 ${GROUPS[g].map(d=>DAYS[d]).join('-')}</b>
  <p class="sub">Employees: ${S.emps.filter(e=>e.group===g).length}</p></div>`).join('')}</div></div>
  <div class="card"><h3>🔔 Latest Notifications</h3>${S.notes.slice(0,5).map(noteHTML).join('') || '<p class="sub">No notifications.</p>'}</div>`;
  $('#wp').onclick = () => { if (wkStart > 1) wkStart = Math.max(1, wkStart - 7); dashboard(); };
  $('#wn').onclick = () => { if (wkStart + 7 <= n) wkStart += 7; dashboard(); };
  $('#wt').onclick = () => { wkStart = null; dashboard(); };
  $('#wd').onclick = () => exportReportExcel(f, t, 'weekly-overview');
}
const noteHTML = n => '<div class="note '+(n.read?'read':'unread')+'"><b>'+n.t+'</b><br>'+n.m+'<br><small>'+n.at+'</small></div>';
function employees() {
  const list = S.emps.filter(e => (empR==='All'||e.role===empR) && (empG==='All'||e.gender===empG) && (empL==='All'||e.lc===empL) && (e.name.toLowerCase().includes(empQ.toLowerCase()) || String(e.id)===empQ));
  $('#view').innerHTML = `
  <div class="bar"><button class="btn" id="addE">➕ Add Employee</button></div>
  <div class="card"><div class="row f4"><div><label>🔎 Search Employee</label><input id="q" placeholder="Search by name or ID" value="${empQ}"></div>
  <div><label>🎯 Filter Role</label><select id="fr">${['All','Manager','TL','Associate','DHH','PA'].map(r=>`<option ${r===empR?'selected':''}>${r}</option>`).join('')}</select></div>
  <div><label>⚧ Gender</label><select id="fg">${['All','Male','Female'].map(g=>`<option ${g===empG?'selected':''}>${g}</option>`).join('')}</select></div>
  <div><label>📈 LC Curve</label><select id="fl">${[['All','All'],['FT1','FT1'],['FT2','FT2'],['—','None (—)']].map(([v,t])=>`<option value="${v}" ${v===empL?'selected':''}>${t}</option>`).join('')}</select></div></div></div>
  <div class="card scroll"><table><tr><th>ID</th><th>Employee Name</th><th>Group</th><th>Role</th><th>Gender</th><th>LC Curve</th><th>Actions</th></tr>
  ${list.map(e => `<tr><td>#${e.id}</td><td><b>${e.name}</b></td><td><span class="tag">Group ${e.group}</span></td>
  <td><span class="tag ${e.role}">${e.role}</span></td><td>${e.gender}</td><td>${e.lc}</td>
  <td><button class="btn" onclick="empForm(${e.id})">Edit</button> <button class="btn" onclick="delEmp(${e.id})">Delete</button></td></tr>`).join('')}</table></div>
  <dialog id="dlg"></dialog>`;
  $('#addE').onclick = () => empForm();
  $('#q').oninput = e => { empQ = e.target.value; employees(); $('#q').focus(); };
  $('#fr').onchange = e => { empR = e.target.value; employees(); };
  $('#fg').onchange = e => { empG = e.target.value; employees(); };
  $('#fl').onchange = e => { empL = e.target.value; employees(); };
}
function empForm(id) {
  const e = S.emps.find(x => x.id===id) || {name:'',group:'A',role:'Associate',gender:'Male',lc:'FT1'};
  const opt = (a,v) => a.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  $('#dlg').innerHTML = `<h3>${id?'Edit':'Add'} Employee</h3>
  <label>Name</label><input id="en" value="${e.name}">
  <label>Role</label><select id="er">${opt(['Manager','TL','Associate','DHH','PA'],e.role)}</select>
  <label>Gender</label><select id="eg">${opt(['Male','Female'],e.gender)}</select>
  <label>LC Curve</label><select id="el">${opt(['FT1','FT2','—'],e.lc)}</select>
  <label>Group (Week Off)</label><select id="ew">${Object.keys(GROUPS).map(g=>`<option value="${g}" ${g===e.group?'selected':''}>${GNAME(g)}</option>`).join('')}</select>
  <div class="bar" style="margin-top:16px"><button class="btn green" id="sv">💾 Save</button><button class="btn ghost" id="cn">Cancel</button></div>`;
  $('#dlg').showModal();
  $('#cn').onclick = () => $('#dlg').close();
  $('#sv').onclick = () => {
    if (!$('#en').value.trim()) return alert('Enter a name');
    const d = {name:$('#en').value.trim(),role:$('#er').value,gender:$('#eg').value,lc:$('#el').value,group:$('#ew').value};
    if (id) Object.assign(S.emps.find(x=>x.id===id), d);
    else S.emps.push({id:Math.max(0,...S.emps.map(x=>x.id))+1,...d});
    S.roster = {}; notify('Employee saved', d.name+' updated.'); save(); employees();
  };
}
function delEmp(id) {
  if (!confirm('Delete this employee?')) return;
  S.emps = S.emps.filter(e => e.id!==id); S.roster = {}; save(); employees();
}

function roster() {
  const r = getRoster(), n = daysIn(month);
  const list = S.emps.filter(e => matchesRosterRole(e, roleF));
  const curM = month.slice(5), curY = +month.slice(0,4);
  const heads = Array.from({length:n}, (_,i) => { const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
    return `<th>${DAYS[dt.getDay()]}<br>${String(i+1).padStart(2,'0')}/${month.slice(5)}</th>`; }).join('');
  $('#view').innerHTML = `
  <div class="bar"><button class="btn" id="gen">${ICONS.ai}Generate Roster</button><button class="btn green" id="csv">${ICONS.dl}Export Excel</button>
  <button class="btn ghost" id="pm">◀ Prev</button><button class="btn ghost" id="nm">Next ▶</button></div>
  <div class="card ov"><div class="row"><div><label>Month & Year</label><div class="mp" id="mp"><button type="button" class="mp-btn" id="mpb"><span>${ICONS.roster}${MONTHS[+curM-1]} ${curY}</span><i>▾</i></button><div class="mp-pop hide" id="mpp"></div></div></div>
  <div><label>Roster Rule</label><select id="ru"><option value="Balanced" selected>2 Weeks DAY + 2 Weeks NIGHT (5 days work, 2 OFF)</option></select></div>
  <div><label>View Roster By Role</label><select id="rf">${ROSTER_ROLE_FILTERS.map(x=>'<option value="'+x+'" '+(x===roleF?'selected':'')+'>'+x+'</option>').join('')}</select></div></div>
  <div class="legend" style="margin-top:14px"><span class="D">${dayL()}</span><span class="N">${nightL()}</span><span class="O">🔴 OFF</span></div></div>
  <div class="card scroll"><table><tr><th>Employee</th><th>Role</th><th>Group</th><th>LC</th>${heads}</tr>
  ${list.map(e => `<tr><td><b>${e.name}</b></td><td><span class="tag ${e.role}">${e.role}</span></td><td>${e.group}</td><td>${e.lc}</td>
  ${(r[e.id]||[]).map((v,i)=>`<td style="padding:0"><select class="sh ${cls(v)}" onchange="setShift(${e.id},${i},this.value)">
  ${[dayL(),nightL(),OFF].map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</table></div>`;

  /* custom month + year picker */
  const pop = $('#mpp');
  let pickY = curY;
  const clampM = m => +m.slice(0,4) < YEARS[0] ? YEARS[0]+'-01' : +m.slice(0,4) > YEARS[YEARS.length-1] ? YEARS[YEARS.length-1]+'-12' : m;
  const drawPop = () => {
    const t = new Date(), tm = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');
    pop.innerHTML =
      '<div class="mp-years">'+YEARS.map(y=>'<button type="button" class="mp-y'+(y===pickY?' on':'')+'" data-y="'+y+'">'+y+'</button>').join('')+'</div>'+
      '<div class="mp-grid">'+MONTHS.map((m,i)=>{const v=pickY+'-'+String(i+1).padStart(2,'0');return '<button type="button" class="mp-m'+(v===month?' on':'')+(v===tm?' now':'')+'" data-m="'+v+'">'+m+'</button>';}).join('')+'</div>'+
      '<div class="mp-foot"><button type="button" class="mp-today" id="mpt">This Month</button></div>';
    pop.querySelectorAll('.mp-y').forEach(b=>b.onclick=e=>{ e.stopPropagation(); pickY=+b.dataset.y; drawPop(); });
    pop.querySelectorAll('.mp-m').forEach(b=>b.onclick=()=>{ month=b.dataset.m; roster(); });
    $('#mpt').onclick=()=>{ month=clampM(tm); roster(); };
  };
  $('#mpb').onclick = e => { e.stopPropagation(); pop.classList.toggle('hide'); if(!pop.classList.contains('hide')){ pickY=curY; drawPop(); } };
  const shiftMonth = k => {
    const d = new Date(+month.slice(0,4), +month.slice(5)-1+k, 1);
    const y = d.getFullYear();
    if (y < YEARS[0] || y > YEARS[YEARS.length-1]) return alert('Roster is available only for '+YEARS[0]+' to '+YEARS[YEARS.length-1]);
    month = y + '-' + String(d.getMonth()+1).padStart(2,'0'); roster();
  };
  $('#pm').onclick = () => shiftMonth(-1);
  $('#nm').onclick = () => shiftMonth(1);
  $('#ru').onchange = () => { generate(); roster(); };
  $('#rf').onchange = e => { roleF = e.target.value; roster(); };
  $('#gen').onclick = () => { generate(); notify('Roster generated', 'Roster for '+month+' generated.'); roster(); };
  $('#csv').onclick = exportExcel;
}
function setShift(id, i, v) { S.roster[month][id][i] = v; save(); roster(); refreshOverview(); }
/* re-draw the weekly overview straight away if the dashboard is the open page */
function refreshOverview() { if (user && page === 'dashboard') dashboard(); }
/* roster edited in another browser tab -> reload data and refresh the open page */
window.addEventListener('storage', e => {
  if (e.key !== 'sxvd' || !e.newValue || !user) return;
  S = JSON.parse(e.newValue); buildNav(); go(page);
});

/* ===== COLORED EXCEL EXPORT (DAY = yellow, NIGHT = blue, WEEK OFF = red) ===== */
function exportCSV() { exportExcel(); }   /* keeps old button calls working */
function exportExcel() {
  const r = getRoster(), n = daysIn(month);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cell = (v, st) => '<Cell ss:StyleID="'+st+'"><Data ss:Type="String">'+esc(v)+'</Data></Cell>';
  const border = '<Borders>'+['Left','Right','Top','Bottom'].map(p=>'<Border ss:Position="'+p+'" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AA5C8"/>').join('')+'</Borders>';
  const style = (id, bg, fg, bold, align) =>
    '<Style ss:ID="'+id+'"><Alignment ss:Horizontal="'+(align||'Center')+'" ss:Vertical="Center" ss:WrapText="1"/>'+
    '<Font ss:FontName="Calibri" ss:Size="11" ss:Color="'+fg+'"'+(bold?' ss:Bold="1"':'')+'/>'+
    (bg?'<Interior ss:Color="'+bg+'" ss:Pattern="Solid"/>':'')+border+'</Style>';
  const styles =
    style('H','#1D3A8A','#FFFFFF',true)+            /* header */
    style('T','#FFFFFF','#000000',true,'Left')+     /* employee name */
    style('P','#FFFFFF','#000000',false)+           /* plain cells */
    style('D','#FFE699','#7A5A00',true)+            /* DAY shift   - yellow */
    style('N','#BDD7FF','#1D3FA8',true)+            /* NIGHT shift - blue   */
    style('O','#FFC7CE','#B00020',true);            /* WEEK OFF    - red    */
  const widths = '<Column ss:Width="120"/><Column ss:Width="70"/><Column ss:Width="55"/><Column ss:Width="45"/>'+
                 Array.from({length:n},()=>'<Column ss:Width="85"/>').join('');
  let rows = '<Row ss:Height="34">' + ['Employee','Role','Group','LC'].map(h=>cell(h,'H')).join('') +
    Array.from({length:n},(_,i)=>{
      const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
      return cell(DAYS[dt.getDay()]+'\n'+String(i+1).padStart(2,'0')+'/'+month.slice(5),'H');
    }).join('') + '</Row>';
  S.emps.forEach(e => {
    rows += '<Row ss:Height="24">' + cell(e.name,'T') + cell(e.role,'P') + cell(e.group,'P') + cell(e.lc,'P') +
      (r[e.id]||[]).map(v => cell(v === OFF ? 'WEEK OFF' : v, cls(v))).join('') + '</Row>';
  });
  rows += '<Row/><Row>'+cell('Legend','T')+cell(dayL(),'D')+cell(nightL(),'N')+cell('WEEK OFF','O')+'</Row>';
  const xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
    '<Styles>'+styles+'</Styles>'+
    '<Worksheet ss:Name="Roster '+month+'"><Table>'+widths+rows+'</Table>'+
    '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><SplitVertical>4</SplitVertical><TopRowBottomPane>1</TopRowBottomPane><LeftColumnRightPane>4</LeftColumnRightPane><ActivePane>0</ActivePane></WorksheetOptions>'+
    '</Worksheet></Workbook>';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], {type:'application/vnd.ms-excel'}));
  a.download = 'roster-' + month + '.xls';
  a.click();
}

/* ===== REPORTS: colored Excel of the Monthly Operations Overview (headcount table) ===== */
function exportReportExcel(from = 1, to = daysIn(month), tag = 'operations-overview') {
  const r = getRoster(), n = to - from + 1;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const txt = (v, st, extra='') => '<Cell ss:StyleID="'+st+'"'+extra+'><Data ss:Type="String">'+esc(v)+'</Data></Cell>';
  const num = (v, st) => '<Cell ss:StyleID="'+st+'"><Data ss:Type="Number">'+v+'</Data></Cell>';
  const border = '<Borders>'+['Left','Right','Top','Bottom'].map(p=>'<Border ss:Position="'+p+'" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AA5C8"/>').join('')+'</Borders>';
  const style = (id, bg, fg, bold, align) =>
    '<Style ss:ID="'+id+'"><Alignment ss:Horizontal="'+(align||'Center')+'" ss:Vertical="Center" ss:WrapText="1"/>'+
    '<Font ss:FontName="Calibri" ss:Size="11" ss:Color="'+fg+'"'+(bold?' ss:Bold="1"':'')+'/>'+
    '<Interior ss:Color="'+bg+'" ss:Pattern="Solid"/>'+border+'</Style>';
  const styles =
    style('H','#1D3A8A','#FFFFFF',true)+              /* date header */
    style('S','#4C2A9E','#FFFFFF',true,'Left')+       /* shift section title */
    style('L','#FFFFFF','#000000',true,'Left')+       /* row label */
    style('V','#FFFFFF','#000000',false)+             /* count */
    style('TL','#BDD7FF','#1D3FA8',true,'Left')+      /* Total HC label */
    style('TV','#BDD7FF','#1D3FA8',true)+             /* Total HC value */
    style('YL','#FFD966','#2A1A00',true,'Left')+      /* Total Working HC label */
    style('YV','#FFD966','#2A1A00',true);             /* Total Working HC value */
  const widths = '<Column ss:Width="130"/>'+Array.from({length:n},()=>'<Column ss:Width="62"/>').join('');
  const idx = Array.from({length:n},(_,k)=>from-1+k);   /* zero-based day indexes */
  let rows = '<Row ss:Height="34">'+txt('Shift / HC','H')+idx.map(i=>{
    const dt = new Date(+month.slice(0,4), +month.slice(5)-1, i+1);
    return txt(DAYS[dt.getDay()]+'\n'+String(i+1).padStart(2,'0')+'/'+month.slice(5),'H');
  }).join('')+'</Row>';
  [dayL(), nightL()].forEach(lab => {
    rows += '<Row ss:Height="24">'+txt(lab+' Shift — FT1 / FT2 Balanced','S',' ss:MergeAcross="'+n+'"')+'</Row>';
    const sums = idx.map(()=>0);
    ['Male','FT1','FT2','DHH'].forEach(name => {
      rows += '<Row>'+txt(name,'L')+idx.map(i=>{ const c=S.emps.filter(e=>rowOf(e)===name&&r[e.id]&&r[e.id][i]===lab).length; sums[i]+=c; return num(c,'V'); }).join('')+'</Row>';
    });
    rows += '<Row>'+txt('Total HC','TL')+sums.map(c=>num(c,'TV')).join('')+'</Row>';
  });
  rows += '<Row ss:Height="22">'+txt('Total Working HC','YL')+idx.map(i=>num(S.emps.filter(e=>r[e.id]&&r[e.id][i]!==OFF).length,'YV')).join('')+'</Row>';
  const xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
    '<Styles>'+styles+'</Styles><Worksheet ss:Name="Overview '+month+'"><Table>'+widths+rows+'</Table>'+
    '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><SplitVertical>1</SplitVertical><TopRowBottomPane>1</TopRowBottomPane><LeftColumnRightPane>1</LeftColumnRightPane><ActivePane>0</ActivePane></WorksheetOptions>'+
    '</Worksheet></Workbook>';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], {type:'application/vnd.ms-excel'}));
  a.download = tag + '-' + month + (from > 1 || to < daysIn(month) ? '-days-' + from + 'to' + to : '') + '.xls';
  a.click();
  return xml;
}

function shift() {
  const s = S.settings, f = (id,l,v,t='time') => `<div><label>${l}</label><input id="${id}" type="${t}" value="${v}"></div>`;
  $('#view').innerHTML = `<div class="card"><div class="row">
  ${f('ds',dayL()+' Start',s.ds)}${f('de',dayL()+' End',s.de)}${f('ns',nightL()+' Start',s.ns)}${f('ne',nightL()+' End',s.ne)}
  ${f('dr','DAY Required',s.dayReq,'number')}${f('nr','NIGHT Required',s.nightReq,'number')}</div>
  <button class="btn green" id="sv" style="margin-top:16px">💾 Save Settings</button></div>`;
  $('#sv').onclick = () => {
    Object.assign(S.settings, {ds:$('#ds').value,de:$('#de').value,ns:$('#ns').value,ne:$('#ne').value,dayReq:+$('#dr').value,nightReq:+$('#nr').value});
    S.roster = {}; save(); alert('Settings saved'); shift();
  };
}
function cons() {
  const c = S.cons, yn = v => ['Yes','No'].map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  $('#view').innerHTML = `<div class="card"><div class="row">
  <div><label>Maximum Consecutive Work Days</label><input id="c1" type="number" value="${c.maxDays}"></div>
  <div><label>Minimum Weekly OFF Days</label><input id="c2" type="number" value="${c.minOff}"></div>
  <div><label>Allow NIGHT → DAY Next Day</label><select id="c3">${yn(c.nightDay)}</select></div>
  <div><label>Use Availability in Roster</label><select id="c4">${yn(c.useAvail)}</select></div></div>
  <button class="btn green" id="sv" style="margin-top:16px">💾 Save Constraints</button></div>`;
  $('#sv').onclick = () => { S.cons = {maxDays:+$('#c1').value,minOff:+$('#c2').value,nightDay:$('#c3').value,useAvail:$('#c4').value}; S.roster = {}; save(); alert('Constraints saved'); };
}
function reports() {
  $('#view').innerHTML = `<div class="bar"><button class="btn" onclick="reports()">🔄 Refresh</button><button class="btn green" onclick="exportReportExcel()">📤 Download Monthly Excel</button></div>
  <div class="card"><h3>📈 Monthly Operations Overview</h3><p class="sub">Shows the full selected month. Updated ${new Date().toLocaleTimeString()}</p>${hcTable(1,31)}</div>`;
}

function avail() {
  const patterns=['1 Week DAY + 1 Week NIGHT','2 Weeks '+dayL()+' Shift','2 Weeks '+nightL()+' Shift','3 Weeks '+dayL()+' Shift','3 Weeks '+nightL()+' Shift','Customized'];
  $('#view').innerHTML='<div class="card"><div class="row">'+
    '<div><label>Employee</label><select id="ae">'+S.emps.map(e=>'<option value="'+e.id+'">'+e.name+' — '+e.role+'</option>').join('')+'</select></div>'+
    '<div><label>Date</label><input type="date" id="ad"></div>'+
    '<div><label>Status</label><select id="as"><option>Available</option><option>Leave</option><option>Sick</option></select></div>'+
    '<div><label>Shift Availability Pattern</label><select id="ap">'+patterns.map(p=>'<option>'+p+'</option>').join('')+'</select></div>'+
    '<div><label>Reason</label><input id="arn" placeholder="Optional"></div></div>'+
    '<button class="btn green" id="sv" style="margin-top:16px">💾 Save Availability</button></div>'+
    '<div class="card scroll"><table><tr><th>Employee</th><th>Date</th><th>Shift Pattern</th><th>Reason</th><th>Action</th></tr>'+
    (S.avail.map((a,i)=>'<tr><td>'+((S.emps.find(e=>e.id==a.emp)||{}).name||'?')+'</td><td>'+a.date+'</td><td>'+(a.pattern||a.status||'-')+'</td><td>'+(a.reason||'-')+'</td><td><button class="btn" onclick="delAv('+i+')">Delete</button></td></tr>').join('')||'<tr><td colspan="5">🟢 No availability records.</td></tr>')+
    '</table></div>';
  $('#sv').onclick=()=>{
    if(!$('#ad').value)return alert('Pick a date');
    S.avail.push({emp:$('#ae').value,date:$('#ad').value,status:$('#as').value,pattern:$('#ap').value,reason:$('#arn').value});
    S.roster={};save();avail();
  };
}
function delAv(i) { S.avail.splice(i,1); S.roster = {}; save(); avail(); }

/* Rule-based "AI" analysis of the roster */
/* ===== AI CHAT ASSISTANT =====
   Runs fully in the browser (no server / API key). It understands plain-English commands about the roster. */
const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mLabel = m => MONTHS[+m.slice(5)-1] + ' ' + m.slice(0,4);
const shortOf = v => v === OFF ? 'OFF' : v === dayL() ? 'DAY' : 'NIGHT';
const MNAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const CHAT_HELP = '<b>Here is what you can ask me:</b><br>'+
  '• <i>Generate roster for December 2026</i><br>'+
  '• <i>Analyze roster</i> / <i>Any understaffing?</i><br>'+
  '• <i>Who is off tomorrow?</i> / <i>Who works night on 15 Nov?</i><br>'+
  '• <i>Show Ravi\'s schedule</i><br>'+
  '• <i>Change Priya on 12 to night</i> / <i>Make Arun off on 20 Nov</i><br>'+
  '• <i>Put Sowmya on leave on 18 Nov</i><br>'+
  '• <i>Set day required to 12</i> / <i>Set night required to 9</i><br>'+
  '• <i>Add employee Meena role Associate gender Female group C lc FT2</i><br>'+
  '• <i>Remove employee Karthik</i> · <i>How many employees?</i><br>'+
  '• <i>Download roster</i> / <i>Download overview</i> · <i>Open dashboard</i> · <i>Switch to January 2027</i>';
let chat = [{who:'bot', html:'Hi! I am your roster assistant. Tell me what to do, for example <i>"generate roster for December"</i> or <i>"who is off tomorrow?"</i>. Type <b>help</b> to see everything I can do.'}];

function parseMonth(t) {
  const m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  if (!m) return null;
  const idx = MNAMES.findIndex(n => n.startsWith(m[1].slice(0,3)));
  const y = (t.match(/\b(20\d\d)\b/) || [])[1] || month.slice(0,4);
  if (idx < 0 || +y < YEARS[0] || +y > YEARS[YEARS.length-1]) return null;
  return y + '-' + String(idx+1).padStart(2,'0');
}
function parseDay(t) {
  const now = new Date(), ym = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  let x;
  if (/\btoday\b/.test(t)) return {m:ym(now), d:now.getDate()};
  if (/\btomorrow\b/.test(t)) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1); return {m:ym(d), d:d.getDate()}; }
  if ((x = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return {m:x[1]+'-'+x[2], d:+x[3]};
  if ((x = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/))) {
    const m = parseMonth(t) || month;
    if (+x[1] >= 1 && +x[1] <= daysIn(m)) return {m, d:+x[1]};
  }
  return null;
}
function findEmp(t) {
  const list = [...S.emps].sort((a,b) => b.name.length - a.name.length);
  return list.find(e => t.includes(e.name.toLowerCase())) ||
         list.find(e => { const f = e.name.toLowerCase().split(' ')[0]; return f.length >= 3 && new RegExp('\\b'+f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(t); });
}
function chatStats(m) {
  const r = getRoster(m), n = daysIn(m), s = S.settings, short = [];
  let ftBad = 0, ndBad = 0;
  for (let i = 0; i < n; i++) {
    const c = lab => S.emps.filter(e => r[e.id] && r[e.id][i] === lab).length;
    const dc = c(dayL()), nc = c(nightL());
    if (dc < s.dayReq || nc < s.nightReq) short.push((i+1)+' (D '+dc+'/'+s.dayReq+', N '+nc+'/'+s.nightReq+')');
    const f = (nm, lab) => S.emps.filter(e => rowOf(e) === nm && r[e.id] && r[e.id][i] === lab).length;
    if (!ftRatioOK(f('FT1',dayL()), f('FT2',dayL())) || !ftRatioOK(f('FT1',nightL()), f('FT2',nightL()))) ftBad++;
  }
  S.emps.forEach(e => { const row = r[e.id] || []; row.forEach((v,i) => { if (i && row[i-1] === nightL() && v === dayL()) ndBad++; }); });
  return {n, short, ftBad, ndBad};
}

function aiReply(q) {
  const t = q.toLowerCase().trim(), has = re => re.test(t), emp = findEmp(t);
  let after = null, x;
  if (!t) return {html:'Type a request, for example <i>generate roster for December</i>.'};
  if (has(/^(hi|hello|hey|good (morning|evening|afternoon))\b/)) return {html:'Hello! How can I help with the roster today? Type <b>help</b> for examples.'};
  if (has(/\b(help|what can you do|commands|examples)\b/)) return {html:CHAT_HELP};

  /* downloads */
  if (has(/\b(download|export)\b/)) {
    if (has(/overview|report|headcount|\bhc\b/)) { after = () => exportReportExcel(); return {html:'Downloading the monthly overview for <b>'+mLabel(month)+'</b>…', after}; }
    after = () => exportExcel(); return {html:'Downloading the colored roster for <b>'+mLabel(month)+'</b>…', after};
  }
  /* generate roster */
  if (has(/\b(generate|regenerate|build|create|make)\b.*\broster\b/)) {
    const m = parseMonth(t) || month; month = m; generate(m);
    notify('Roster generated', 'Roster for '+m+' generated by AI Assistant.');
    const st = chatStats(m);
    return {html:'Done. I generated the roster for <b>'+mLabel(m)+'</b> ('+S.emps.length+' employees, 2 weeks DAY + 2 weeks NIGHT, 5 working days + 2 OFF).<br>'+
      (st.short.length ? '⚠️ '+st.short.length+' day(s) are understaffed against your DAY/NIGHT targets. Ask me <i>"analyze roster"</i> for details.' : '✅ All days meet the DAY/NIGHT targets.')};
  }
  /* add employee */
  if (has(/\b(add|create|new)\b.*\b(employee|staff|person|member)\b/)) {
    const nm = q.match(/(?:employee|staff|person|member)\s+(?:named\s+|called\s+)?([a-z][a-z .'-]*?)(?=\s+(?:role|gender|group|lc|ft\d|as|male|female|manager|tl|associate|dhh|pa)\b|,|$)/i);
    if (!nm || !nm[1].trim()) return {html:'Please include a name, e.g. <i>add employee Meena role Associate gender Female group C lc FT2</i>.'};
    const role = (t.match(/\b(manager|tl|associate|dhh|pa)\b/) || [])[1];
    const e = {id:Math.max(0,...S.emps.map(z=>z.id))+1, name:nm[1].trim().replace(/\b\w/g,c=>c.toUpperCase()),
      role: role ? (role==='tl'?'TL':role==='dhh'?'DHH':role==='pa'?'PA':role[0].toUpperCase()+role.slice(1)) : 'Associate',
      gender: has(/\bfemale\b/) ? 'Female' : 'Male',
      group: ((t.match(/group\s*([a-g])\b/) || [])[1] || 'A').toUpperCase(),
      lc: (x = t.match(/\bft\s*([12])\b/)) ? 'FT'+x[1] : '—'};
    S.emps.push(e); S.roster = {}; notify('Employee saved', e.name+' added by AI Assistant.'); save();
    return {html:'Added <b>'+esc(e.name)+'</b> — '+e.role+', '+e.gender+', Group '+e.group+', LC '+e.lc+'. (Anything you did not mention uses defaults: Associate / Male / Group A / no LC.) The roster will be rebuilt.'};
  }
  /* remove employee */
  if (emp && has(/\b(delete|remove)\b/)) {
    if (!confirm('Delete '+emp.name+'?')) return {html:'Okay, I did not delete '+esc(emp.name)+'.'};
    S.emps = S.emps.filter(z => z.id !== emp.id); S.roster = {}; save();
    return {html:'Removed <b>'+esc(emp.name)+'</b>. The roster will be rebuilt.'};
  }
  /* leave / sick */
  if (emp && has(/\b(leave|sick)\b/)) {
    const d = parseDay(t); if (!d) return {html:'Which date? e.g. <i>put '+esc(emp.name)+' on leave on 18 Nov</i>.'};
    const iso = d.m+'-'+String(d.d).padStart(2,'0'), status = has(/\bsick\b/) ? 'Sick' : 'Leave';
    S.avail.push({emp:String(emp.id), date:iso, status, pattern:status, reason:'Added via AI Assistant'}); S.roster = {}; save();
    return {html:'Marked <b>'+esc(emp.name)+'</b> as <b>'+status+'</b> on '+iso+'. That day becomes OFF and the roster is rebuilt.'};
  }
  /* change a shift */
  if (emp && has(/\b(change|set|assign|make|put|move)\b/) && has(/\b(day|night|off)\b/)) {
    const d = parseDay(t); if (!d) return {html:'Which date? e.g. <i>change '+esc(emp.name)+' on 12 to night</i>.'};
    const v = has(/\boff\b|week ?off/) ? OFF : has(/\bnight\b/) ? nightL() : dayL();
    const r = getRoster(d.m); r[emp.id][d.d-1] = v; S.roster[d.m] = r; save();
    return {html:'Set <b>'+esc(emp.name)+'</b> to <b>'+shortOf(v)+'</b> on '+d.d+' '+mLabel(d.m)+'. Ask me <i>"analyze roster"</i> to check this against the rules.'};
  }
  /* DAY / NIGHT requirement */
  if ((x = t.match(/\b(day|night)\s*(?:shift)?\s*(?:required|requirement|target|headcount|needed?)\D{0,12}(\d+)/))) {
    if (x[1] === 'day') S.settings.dayReq = +x[2]; else S.settings.nightReq = +x[2];
    S.roster = {}; save();
    return {html:'Updated the <b>'+x[1].toUpperCase()+'</b> requirement to <b>'+x[2]+'</b>. DAY: '+S.settings.dayReq+' · NIGHT: '+S.settings.nightReq+'.'};
  }
  /* who works / is off */
  if (!emp && has(/\b(who|which|list)\b/) && has(/\b(off|working|work|works|leave|day|night)\b/)) {
    const d = parseDay(t); if (!d) return {html:'Which date? e.g. <i>who is off on 15 Nov</i> or <i>who works night tomorrow</i>.'};
    const r = getRoster(d.m), v = r, dt = new Date(+d.m.slice(0,4), +d.m.slice(5)-1, d.d);
    const at = lab => S.emps.filter(e => v[e.id] && v[e.id][d.d-1] === lab).map(e => esc(e.name));
    const line = (lab, nm) => '<b>'+lab+' ('+nm.length+'):</b> '+(nm.join(', ') || '—');
    let rows;
    if (has(/\boff\b|leave/)) rows = [line('OFF', at(OFF))];
    else if (has(/\bnight\b/)) rows = [line('NIGHT', at(nightL()))];
    else if (has(/\bday\b/)) rows = [line('DAY', at(dayL()))];
    else rows = [line('DAY', at(dayL())), line('NIGHT', at(nightL())), line('OFF', at(OFF))];
    return {html:'<b>'+DAYS[dt.getDay()]+' '+d.d+' '+mLabel(d.m)+'</b><br>'+rows.join('<br>')};
  }
  /* one employee's schedule */
  if (emp) {
    const m = parseMonth(t) || month, row = getRoster(m)[emp.id] || [], runs = [];
    row.forEach((val,i) => { const k = shortOf(val), l = runs[runs.length-1]; if (l && l.k === k) l.e = i+1; else runs.push({k, s:i+1, e:i+1}); });
    return {html:'<b>'+esc(emp.name)+'</b> ('+emp.role+', Group '+emp.group+') — '+mLabel(m)+':<br>'+
      runs.map(z => (z.s === z.e ? z.s : z.s+'–'+z.e)+': '+z.k).join(' · ')};
  }
  /* counts */
  if (has(/\b(how many|count|total number)\b.*\b(employee|staff|people|member)s?\b/)) {
    const c = k => S.emps.filter(e => rowOf(e) === k).length;
    return {html:'<b>'+S.emps.length+'</b> employees — Male: '+c('Male')+', FT1: '+c('FT1')+', FT2: '+c('FT2')+', DHH: '+c('DHH')+'.'};
  }
  /* analysis */
  if (has(/\b(analy[sz]e|check|issues?|problems?|understaff\w*|coverage|compliance|summary|status|health|balanced?)\b/)) {
    const m = parseMonth(t) || month, st = chatStats(m);
    return {html:'<b>'+mLabel(m)+'</b><br>'+
      (st.short.length ? '⚠️ <b>'+st.short.length+'</b> day(s) below target: '+st.short.slice(0,6).join('; ')+(st.short.length > 6 ? ' …' : '') : '✅ Every day meets the DAY/NIGHT targets.')+'<br>'+
      (st.ndBad ? '⚠️ '+st.ndBad+' NIGHT → DAY next-day case(s).' : '✅ No NIGHT → DAY next-day cases.')+'<br>'+
      (st.ftBad ? '⚠️ FT1 : FT2 outside 40:60 – 60:40 on '+st.ftBad+' day(s).' : '✅ FT1 : FT2 within 40:60 – 60:40 on DAY and NIGHT.')+
      (st.short.length && S.emps.length < S.settings.dayReq + S.settings.nightReq ? '<br>💡 You have '+S.emps.length+' employees for '+(S.settings.dayReq+S.settings.nightReq)+' daily shifts. Add staff or lower the targets.' : '')};
  }
  /* switch month */
  if ((x = parseMonth(t)) && has(/\b(switch|go to|open|view|show|change)\b/)) {
    month = x; return {html:'Switched to <b>'+mLabel(x)+'</b>. Ask me to analyze it or open the roster.'};
  }
  /* navigation */
  if (has(/\b(open|go to|take me|navigate|show me|switch to)\b/)) {
    const map = [[/dashboard|overview/,'dashboard'],[/roster/,'roster'],[/report/,'reports'],[/employee/,'employees'],[/constraint/,'cons'],[/shift setting|settings/,'shift'],[/availab/,'avail'],[/notification/,'notes'],[/\busers?\b/,'users']];
    const hit = map.find(z => z[0].test(t));
    if (hit) { after = () => go(hit[1]); return {html:'Opening <b>'+NAV.find(z=>z[0]===hit[1])[1]+'</b>…', after}; }
  }
  return {html:'Sorry, I did not understand that. Try <i>"generate roster"</i>, <i>"who is off tomorrow"</i>, <i>"analyze roster"</i> or type <b>help</b>.'};
}

function chatRender() {
  const box = $('#chatBox'); if (!box) return;
  box.innerHTML = chat.map(m => '<div class="msg '+(m.who === 'me' ? 'me' : 'bot')+'">'+m.html+'</div>').join('');
  box.scrollTop = box.scrollHeight;
}
function chatSend(text) {
  text = String(text || '').trim(); if (!text) return;
  chat.push({who:'me', html:esc(text)});
  let res;
  try { res = aiReply(text); } catch (err) { res = {html:'Something went wrong: '+esc(err.message)}; }
  chat.push({who:'bot', html:res.html});
  if (page === 'ai') { chatRender(); analyzeRoster(); }
  if (res.after) res.after();
}
function ai() {
  const chips = ['Analyze roster','Who is off tomorrow?','Generate roster','How many employees?','Help'];
  $('#view').innerHTML =
    '<div class="card"><h3>💬 Ask the AI Assistant</h3><p class="sub">Type what you want in plain English and I will do it on the roster.</p>'+
    '<div class="chips">'+chips.map(c => '<button type="button" class="chip">'+c+'</button>').join('')+'</div>'+
    '<div id="chatBox" class="chatbox"></div>'+
    '<div class="chatrow"><input id="chatIn" placeholder="e.g. who works night on 15 Nov?" autocomplete="off"><button class="btn" id="chatSend">Send ➤</button></div></div>'+
    '<div class="bar" style="justify-content:flex-end"><button class="btn" id="an">✨ Analyze Roster</button></div>'+
    '<div class="ai-layout"><div class="card"><h3>Smart Analysis</h3><div id="out" class="chk"></div></div><div class="card"><h3>AI Checks</h3><div id="checks"></div></div></div>';
  const send = () => { const i = $('#chatIn'), v = i.value; i.value = ''; chatSend(v); i.focus(); };
  $('#chatSend').onclick = send;
  $('#chatIn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); send(); } };
  document.querySelectorAll('.chip').forEach(b => b.onclick = () => chatSend(b.textContent));
  $('#an').onclick = analyzeRoster; chatRender(); analyzeRoster();
}
function analyzeRoster() {
  const r=getRoster(), n=daysIn(month), s=S.settings, warnings=[];
  let dtot=0,ntot=0,off=0,covered=0,availOK=true,weeklyOK=true,consecOK=true,nightDayOK=true,ftOK=true,ftBad=0;
  for(let i=0;i<n;i++){
    const dc=S.emps.filter(e=>r[e.id]&&r[e.id][i]===dayL()).length,nc=S.emps.filter(e=>r[e.id]&&r[e.id][i]===nightL()).length;
    const date=month+'-'+String(i+1).padStart(2,'0'),d=new Date(+month.slice(0,4),+month.slice(5)-1,i+1),label=DAYS[d.getDay()]+' '+(i+1);
    const cc=(nm,lab)=>S.emps.filter(e=>rowOf(e)===nm&&r[e.id]&&r[e.id][i]===lab).length;
    if(!ftRatioOK(cc('FT1',dayL()),cc('FT2',dayL()))||!ftRatioOK(cc('FT1',nightL()),cc('FT2',nightL()))){ftOK=false;ftBad++;}
    dtot+=dc;ntot+=nc;off+=S.emps.filter(e=>r[e.id]&&r[e.id][i]===OFF).length;
    if(dc>=s.dayReq&&nc>=s.nightReq)covered++;
    if(dc<s.dayReq)warnings.push(label+': DAY coverage is '+dc+'/'+s.dayReq+'.');
    if(nc<s.nightReq)warnings.push(label+': NIGHT coverage is '+nc+'/'+s.nightReq+'.');
    S.avail.filter(a=>a.date===date&&['Leave','Sick'].includes(a.status)).forEach(a=>{if(r[a.emp]&&r[a.emp][i]!==OFF){availOK=false;warnings.push(label+': '+((S.emps.find(e=>e.id==a.emp)||{}).name||'Employee')+' is rostered during '+a.status+'.');}});
  }
  /* rule checks: max 5 work days, 2 OFF in every 7 days, no NIGHT -> DAY next day */
  const nd = S.cons.nightDay==='No';
  S.emps.forEach(e=>{
    const row=r[e.id]||[]; let run=0;
    const name=e.name;
    row.forEach((v,i)=>{
      run=v===OFF?0:run+1; if(run>S.cons.maxDays) consecOK=false;
      if(nd && i>0 && row[i-1]===nightL() && v===dayL()){
        nightDayOK=false;
        warnings.push(name+': NIGHT on day '+i+' followed by DAY on day '+(i+1)+' (no OFF in between).');
      }
      if(i>=6){
        const w=row.slice(i-6,i+1), offs=w.filter(x=>x===OFF).length;
        if(offs<S.cons.minOff || 7-offs>7-S.cons.minOff) weeklyOK=false;
      }
    });
  });
  const comp=n?Math.round(100*covered/n):0,balanced=Math.abs(dtot-ntot)<=Math.max(5,Math.round((dtot+ntot)*.2));
  const checks=[['DAY / NIGHT balance',balanced],['Employee availability',availOK],['Weekly OFF coverage',weeklyOK],['Consecutive work days',consecOK],['No NIGHT → DAY next day',nightDayOK],['FT1 : FT2 within 40:60 – 60:40 (DAY & NIGHT)',ftOK],['Understaffing warnings',warnings.length===0]];
  let action='No understaffing warnings. Review the checks and generate the roster when ready.';
  if(warnings.length && S.emps.length < s.dayReq+s.nightReq) {
    action='Current roster has '+S.emps.length+' employees, while the daily targets total '+(s.dayReq+s.nightReq)+' shifts ('+s.dayReq+' DAY + '+s.nightReq+' NIGHT). Add staff or lower the shift requirements in Shift Settings, then generate the roster again.';
  } else if(warnings.length) {
    action='Review DAY/NIGHT requirements and employee shift assignments. Correct the affected staffing data, then generate the roster again.';
  }
  const warningHTML=warnings.length
    ? '<p class="warn">⚠️ '+warnings.length+' coverage warnings found: '+warnings.filter(x=>x.includes('DAY coverage')).length+' DAY and '+warnings.filter(x=>x.includes('NIGHT coverage')).length+' NIGHT.</p><details><summary>Show all '+warnings.length+' warnings</summary>'+warnings.map(x=>'<div class="warn">⚠️ '+x+'</div>').join('')+'</details>'
    : '<p>✅ No coverage warnings.</p>';
  $('#out').innerHTML='<h3>🤖 AI Roster Assistant Analysis</h3><p class="sub">Updated '+new Date().toLocaleString()+'</p>'+
    '<div class="chk"><b>Overall Compliance: '+comp+'%</b><br>Employees: '+S.emps.length+' | Male: '+S.emps.filter(e=>e.gender==='Male').length+' | Female: '+S.emps.filter(e=>e.gender==='Female').length+' | FT1: '+S.emps.filter(e=>e.lc==='FT1').length+' | FT2: '+S.emps.filter(e=>e.lc==='FT2').length+'</div>'+
    '<div class="chk"><b>First '+n+' Days:</b><br>'+dayL()+': '+dtot+' | '+nightL()+': '+ntot+' | 🔴 OFF: '+off+'<br>⚖️ FT1/FT2: '+(ftOK?'within 40:60 – 60:40 on DAY and NIGHT':'Not balanced on '+ftBad+' day(s)')+'</div>'+
    '<div class="chk"><b>AI Checks</b>'+warningHTML+'</div>'+
    '<div class="chk"><b>Recommended action</b><br>'+action+'</div>';
  $('#checks').innerHTML=checks.map(x=>'<div class="chk">'+(x[1]?'✅':'⚠️')+' '+x[0]+'</div>').join('');
}
function notes() {
  $('#view').innerHTML='<div class="bar" style="justify-content:flex-end"><button class="btn" id="markAllRead">✓ Mark All Read</button></div>'+
    '<div class="card">'+(S.notes.map(noteHTML).join('')||'<p class="sub">No notifications.</p>')+'</div>';
  $('#markAllRead').onclick=()=>{
    S.notes=[];            /* messages disappear once marked as read */
    save(); buildNav(); notes();
  };
}
function users() {
  const accounts=S.users.filter(u=>u.u.toLowerCase()!=='admin');
  $('#view').innerHTML='<div class="card scroll"><table><tr><th>Username</th><th>Role</th><th>Action</th></tr>'+
    '<tr><td>admin</td><td><span class="tag Manager">Manager</span></td><td>Default Admin</td></tr>'+
    accounts.map(u=>'<tr><td>'+u.u+'</td><td><span class="tag '+u.r+'">'+u.r+'</span></td><td><button class="btn" data-delete-user="'+encodeURIComponent(u.u)+'">Delete</button></td></tr>').join('')+
    '</table></div>';
  document.querySelectorAll('[data-delete-user]').forEach(b=>b.onclick=()=>deleteUser(decodeURIComponent(b.dataset.deleteUser)));
}
function deleteUser(username) {
  if(!confirm('Delete user "'+username+'"?'))return;
  const deletingCurrent=user&&user.u===username;
  S.users=S.users.filter(u=>u.u!==username);save();
  if(deletingCurrent){location.reload();return;}
  users();
}

/* close month-year picker on outside click or Esc */
document.addEventListener('click', e => { const p=$('#mpp'); if(p && !e.target.closest('#mp')) p.classList.add('hide'); });
document.addEventListener('keydown', e => { if(e.key==='Escape'){ const p=$('#mpp'); if(p) p.classList.add('hide'); } });