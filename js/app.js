import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { Programs, MonthlyIntel, WeeklyGoals, getExerciseMeta } from './data.js';

// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyC8oSFSnuxESP5AwXO2-GWHD8A-_0CvLnE",
    authDomain: "gym-blueprint.firebaseapp.com",
    projectId: "gym-blueprint",
    storageBucket: "gym-blueprint.firebasestorage.app",
    messagingSenderId: "1088980958398",
    appId: "1:1088980958398:web:cc799f0a27afc196c532ef"
};

let app, auth, db, useFirebase = false;
try { app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); useFirebase = true; } catch(e) {}

// --- STATE MANAGEMENT ---
let State = {
    user: null, view: localStorage.getItem('h_v') || 'view-dash', unit: localStorage.getItem('h_u') || 'kg',
    program: localStorage.getItem('h_prog') || '5-Day OS',
    month: parseInt(localStorage.getItem('h_m')) || 1, week: parseInt(localStorage.getItem('h_w')) || 1,
    labBw: localStorage.getItem('h_labBw') || '', dashMusc: localStorage.getItem('h_dMusc') || 'All',
    dashMod: localStorage.getItem('h_dMod') || 'All', dashEx: localStorage.getItem('h_dEx') || '',
    logs: JSON.parse(localStorage.getItem('h_l') || '{}'),
    customDays: JSON.parse(localStorage.getItem('h_cDays') || '{}')
};

// Generates the active matrix layout based on Program and User Customizations
let Blueprint = {};
function loadActiveBlueprint() {
    Blueprint = Programs[State.program]();
    const progKey = State.program.replace(/\s/g, '');
    Object.keys(State.customDays).forEach(key => {
        if(key.startsWith(progKey)) {
            const match = key.match(/_w(\d+)_d(\d+)/);
            if (match && Blueprint[parseInt(match[1])]) {
                Blueprint[parseInt(match[1])][parseInt(match[2])].ex = State.customDays[key];
            }
        }
    });
}
loadActiveBlueprint();

// --- CLOUD SYNC & UTILS ---
let syncTimer;
const Toast = (msg) => { const el = document.getElementById('toast'); el.innerText = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); };

const syncToCloud = () => {
    if(!useFirebase || !State.user) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        try { await setDoc(doc(db, "users", State.user.uid), { 
            week: State.week, month: State.month, unit: State.unit, labBw: State.labBw, program: State.program,
            dashMusc: State.dashMusc, dashMod: State.dashMod, dashEx: State.dashEx, 
            logs: State.logs, customDays: State.customDays 
        }, { merge: true }); } catch(e) {}
    }, 2000);
};

window.addEventListener('beforeunload', () => {
    if(useFirebase && State.user && syncTimer) {
        clearTimeout(syncTimer);
        localStorage.setItem('h_l', JSON.stringify(State.logs));
        localStorage.setItem('h_cDays', JSON.stringify(State.customDays));
    }
});

// --- RENDERERS ---
let exListCache = [];
function buildFilters() {
    let rawList = new Set();
    const baseBP = Programs["5-Day OS"](); 
    for(let w=1; w<=24; w++){ baseBP[w].forEach(d => d.ex.forEach(e => rawList.add(e[0]))); }
    // Add custom exercises to the chart cache!
    Object.values(State.customDays).forEach(day => day.forEach(e => rawList.add(e[0])));
    
    exListCache = Array.from(rawList).map(e => ({ name: e, ...getExerciseMeta(e) })).sort((a,b) => a.name.localeCompare(b.name));
    document.getElementById('filter-muscle').value = State.dashMusc;
    window.HOS.updateModality(true); 
}

function renderChart() {
    const exName = document.getElementById('analytics-ex').value;
    const svg = document.getElementById('progression-chart'); svg.innerHTML = '';
    if(!exName) return;

    let dataPts =[];
    for(let w=1; w<=24; w++){
        let maxW = 0;
        Object.keys(State.logs).forEach(k => {
            if(k.startsWith(`w${w}_`) && k.includes(exName.replace(/\s/g,''))) {
                let wVal = parseFloat(State.logs[k].w) || 0; let rVal = parseInt(State.logs[k].r);
                if (rVal === 0) return; // Only skip if REPS are 0 (Fixes Bodyweight graph bug)
                if(wVal >= maxW) maxW = wVal;
            }
        });
        if(maxW > 0 || exName.includes('Pull') || exName.includes('Crunch')) dataPts.push({w, maxW});
    }

    if(dataPts.length === 0) { svg.innerHTML = `<text x="50%" y="50%" fill="#888" font-size="12" text-anchor="middle">No data logged yet.</text>`; return; }

    const w = svg.clientWidth || 300; const h = 200; const pad = 20;
    const maxVal = Math.max(...dataPts.map(d=>d.maxW)) * 1.2 || 10; 
    const wUnit = (w - pad*2) / Math.max(1, dataPts.length - 1);

    for(let i=0; i<=4; i++){
        const gridY = pad + (i * (h - pad*2) / 4);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pad); line.setAttribute("y1", gridY); line.setAttribute("x2", w - pad); line.setAttribute("y2", gridY);
        line.setAttribute("stroke", "rgba(255,255,255,0.05)"); svg.appendChild(line);
    }

    let pathD = `M ${pad} ${h - pad - (dataPts[0].maxW/maxVal)*(h - pad*2)}`;
    let fillD = `M ${pad} ${h-pad} L ${pad} ${h - pad - (dataPts[0].maxW/maxVal)*(h - pad*2)}`;

    dataPts.forEach((pt, i) => {
        const x = pad + (i * wUnit); const y = h - pad - ((pt.maxW/maxVal) * (h - pad*2));
        if(i > 0) {
            const prevX = pad + ((i-1)*wUnit); const prevY = h - pad - ((dataPts[i-1].maxW/maxVal)*(h - pad*2));
            const cpx = prevX + (x-prevX)/2;
            pathD += ` C ${cpx} ${prevY}, ${cpx} ${y}, ${x} ${y}`; fillD += ` C ${cpx} ${prevY}, ${cpx} ${y}, ${x} ${y}`;
        }
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x); circle.setAttribute("cy", y); circle.setAttribute("r", 4);
        circle.setAttribute("fill", "var(--accent-cyan)"); svg.appendChild(circle);

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", x); txt.setAttribute("y", y - 10);
        txt.setAttribute("fill", "white"); txt.setAttribute("font-size", "10");
        txt.setAttribute("text-anchor", "middle"); txt.textContent = pt.maxW; svg.appendChild(txt);
    });

    fillD += ` L ${pad + (dataPts.length-1)*wUnit} ${h-pad} Z`;
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", "chartGrad"); grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0"); grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
    grad.innerHTML = `<stop offset="0%" stop-color="var(--accent-cyan-glow)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/>`; svg.appendChild(grad);
    const fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    fillPath.setAttribute("d", fillD); fillPath.setAttribute("fill", "url(#chartGrad)"); svg.insertBefore(fillPath, svg.firstChild);
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", pathD); linePath.setAttribute("fill", "none"); linePath.setAttribute("stroke", "var(--accent-cyan)"); linePath.setAttribute("stroke-width", "2"); svg.insertBefore(linePath, svg.firstChild);
}

window.renderMuscleGraph = function() {
    const mg = document.getElementById('muscle-graph'); if(!mg) return;
    const counts = { Chest:0, Back:0, Shoulders:0, Arms:0, Legs:0, Core:0 }; let maxC = 1;
    Object.keys(State.logs).forEach(k => {
        const l = State.logs[k];
        if(l.done) {
            let rVal = parseInt(l.r);
            if (rVal === 0 || isNaN(rVal)) return;
            const parts = k.split('_');
            if(parts.length >= 3) {
                const exKey = parts[2];
                const ex = exListCache.find(e => e.name.replace(/\s/g,'') === exKey);
                if(ex && counts[ex.muscle] !== undefined) { counts[ex.muscle]++; if(counts[ex.muscle] > maxC) maxC = counts[ex.muscle]; }
            }
        }
    });

    mg.innerHTML = '';
    Object.keys(counts).forEach(m => {
        const pct = (counts[m] / maxC) * 100;
        mg.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:70px; font-size:0.75rem; color:var(--text-muted); font-weight:bold; text-transform:uppercase;">${m}</div>
                <div style="flex:1; background:rgba(255,255,255,0.05); height:12px; border-radius:6px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--accent-cyan); box-shadow:0 0 10px var(--accent-cyan-glow); transition:width 0.5s;"></div>
                </div>
                <div style="width:25px; font-size:0.8rem; color:white; font-family:var(--font-data); text-align:right;">${counts[m]}</div>
            </div>`;
    });
}

function renderDashboard() {
    let tSets=0; let dSets=0; let wDone=0;
    for(let w=1; w<=24; w++){
        Blueprint[w].forEach((day, dIdx) => {
            let dS=0; let dD=0;
            day.ex.forEach((e) => {
                let sets = parseInt(e[1].split('x')[0]) || 3; 
                for(let s=1; s<=sets; s++){
                    const l = State.logs[`w${w}_d${dIdx}_${e[0].replace(/\s/g,'')}_s${s}`];
                    let rVal = l ? parseInt(l.r) : 1;
                    if (l && rVal === 0) {  } 
                    else { dS++; if(l && l.done) { dSets++; dD++; } }
                }
            });
            if(dS > 0 && dS === dD) wDone++;
        });
    }
    document.getElementById('stat-workouts').innerText = wDone;
    document.getElementById('stat-sets').innerText = dSets;
    renderChart(); window.renderMuscleGraph();
}

function updateDayProgress(k) {
    const match = k.match(/w(\d+)_d(\d+)_/);
    if(!match) return;
    const w = parseInt(match[1]); const dIdx = parseInt(match[2]);
    if(w !== State.week) return;

    const day = Blueprint[w][dIdx];
    let ts=0; let ds=0;
    day.ex.forEach(e => {
        let st = parseInt(e[1].split('x')[0])||3; 
        for(let i=1; i<=st; i++){ 
            const l = State.logs[`w${w}_d${dIdx}_${e[0].replace(/\s/g,'')}_s${i}`];
            let rVal = l ? parseInt(l.r) : 1; 
            if (l && rVal === 0) {  } 
            else { ts++; if(l && l.done) ds++; }
        }
    });
    const pct = ts>0 ? Math.round((ds/ts)*100) : 0;
    const accordions = document.querySelectorAll('#days-container .day-accordion');
    if(accordions[dIdx]) { const prog = accordions[dIdx].querySelector('.day-prog'); if(prog) prog.innerText = `${pct}%`; }
    renderDashboard(); 
}

function updateUnitUI() {
    document.getElementById('unit-kg').classList.toggle('active', State.unit === 'kg');
    document.getElementById('unit-lbs').classList.toggle('active', State.unit === 'lbs');
    document.getElementById('calc-bw').placeholder = `Enter Bodyweight (${State.unit.toUpperCase()})`;
    if(State.labBw) { document.getElementById('calc-bw').value = State.labBw; window.HOS.calcRecomp(); }
    document.getElementById('program-selector').value = State.program;
}

function renderMatrix() {
    const mSld = document.getElementById('month-slider'); mSld.innerHTML = '';
    for(let i=1; i<=6; i++){
        const b = document.createElement('div'); b.className = `month-btn ${i===State.month ? 'active':''}`; b.innerText = `Month ${i}`;
        b.onclick = () => { State.month = i; State.week = ((i-1)*4)+1; localStorage.setItem('h_m', i); localStorage.setItem('h_w', State.week); syncToCloud(); renderMatrix(); }; mSld.appendChild(b);
    }

    const sld = document.getElementById('week-slider'); sld.innerHTML = '';
    const startWk = ((State.month - 1) * 4) + 1;
    for(let i=startWk; i<=startWk+3; i++){
        const b = document.createElement('div'); b.className = `week-btn ${i===State.week ? 'active':''}`; b.innerText = `Wk ${i}`;
        b.onclick = () => { State.week = i; localStorage.setItem('h_w', i); syncToCloud(); renderMatrix(); }; sld.appendChild(b);
    }
    
    document.getElementById('month-intel-combined').innerHTML = `
        <h4>📘 Month ${State.month} Overview</h4><p>${MonthlyIntel[State.month].top}</p>
        <h4 style="color: white; margin-top: 15px;">Month ${State.month} Protocol</h4><p>${MonthlyIntel[State.month].bot}</p>`;
    document.getElementById('weekly-goal').innerHTML = `<strong>🎯 Week ${State.week} Goal:</strong> ${WeeklyGoals[State.week] || "Progressive Overload"}`;

    const container = document.getElementById('days-container'); container.innerHTML = '';
    
    if(!Blueprint[State.week]) return; // Failsafe for missing weeks

    Blueprint[State.week].forEach((day, dIdx) => {
        let ts=0; let ds=0;
        day.ex.forEach(e => {
            let st = parseInt(e[1].split('x')[0])||3; 
            for(let i=1; i<=st; i++){ 
                const l = State.logs[`w${State.week}_d${dIdx}_${e[0].replace(/\s/g,'')}_s${i}`];
                let rVal = l ? parseInt(l.r) : 1;
                if (l && rVal === 0) {  } else { ts++; if(l && l.done) ds++; }
            }
        });
        const pct = ts>0 ? Math.round((ds/ts)*100) : 0;

        const card = document.createElement('div'); card.className = 'day-accordion';
        card.innerHTML = `<div class="day-header" onclick="this.nextElementSibling.classList.toggle('open')"><h3>${day.title}</h3><span class="day-prog">${pct}%</span></div><div class="day-body"></div>`;
        const body = card.querySelector('.day-body');
        const unitLabel = State.unit === 'kg' ? 'KG' : 'LBS';

        day.ex.forEach((e, eIdx) => {
            let sets = parseInt(e[1].split('x')[0])||3;
            let targetReps = e[1].split('x')[1] || "10";
            if (targetReps === "Max") targetReps = "20";
            let rows = ''; 

            const currentName = e[0];
            const exKeyClean = currentName.replace(/\s/g,'');
            const exMeta = getExerciseMeta(currentName); 
            const validOptions = exListCache.filter(item => item.muscle === exMeta.muscle); 

            let swapDropdown = `<select class="ex-swap-select" onchange="window.HOS.swapExercise(${State.week}, ${dIdx}, ${eIdx}, this.value, '${exKeyClean}')">`;
            validOptions.forEach(opt => { swapDropdown += `<option value="${opt.name}" ${opt.name === currentName ? 'selected' : ''}>${opt.name}</option>`; });
            swapDropdown += `</select>`;

            for(let s=1; s<=sets; s++){
                const k = `w${State.week}_d${dIdx}_${exKeyClean}_s${s}`;
                const l = State.logs[k] || {w:'',r:'', rir:'', done:false};
                
                let rVal = l.r !== '' ? parseInt(l.r) : parseInt(targetReps);
                if(isNaN(rVal)) rVal = 10;
                let rirVal = l.rir !== '' ? parseInt(l.rir) : 1; 
                
                let rSelect = `<select class="log-input" style="width:45px; padding:4px;" onchange="window.HOS.save('${k}','r',this.value)">`;
                for(let r=0; r<=50; r++){ rSelect += `<option value="${r}" ${r === rVal ? 'selected' : ''}>${r}</option>`; }
                rSelect += `</select>`;

                let rirSelect = `<select class="log-input" style="width:45px; padding:4px; color:var(--accent-orange); border-color:rgba(255,61,0,0.3);" onchange="window.HOS.save('${k}','rir',this.value)">`;
                for(let rir=0; rir<=5; rir++){ rirSelect += `<option value="${rir}" ${rir === rirVal ? 'selected' : ''}>${rir}</option>`; }
                rirSelect += `</select>`;

                rows += `<tr class="${l.done ? 'done-row':''}">
                    <td class="set-idx">${s}</td>
                    <td><input type="number" step="0.5" class="log-input" value="${l.w}" placeholder="${unitLabel}" onchange="window.HOS.save('${k}','w',this.value)"></td>
                    <td>${rSelect}</td>
                    <td>${rirSelect}</td>
                    <td><div class="check-btn ${l.done?'checked':''}" onclick="window.HOS.check('${k}',this,event)"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div></td>
                </tr>`;
            }

            body.innerHTML += `<div class="ex-card">
                <div class="ex-header">
                    <div class="ex-title" style="flex:1;">${swapDropdown}</div>
                    <button class="remove-btn" onclick="window.HOS.removeEx(${State.week}, ${dIdx}, ${eIdx}, '${currentName}')" title="Remove Exercise">-</button>
                </div>
                <div class="ex-meta"><span class="badge" style="color:var(--accent-orange); border:1px solid var(--accent-orange);">${e[1]}</span><span class="badge" style="color:var(--accent-cyan); border:1px solid var(--accent-cyan);">${e[2]}</span></div>
                <table class="log-table"><tr><th>Set</th><th>${unitLabel}</th><th>Reps</th><th>RIR</th><th>Log</th></tr>${rows}</table>
            </div>`;
        });
        
        let addExOpts = `<option value="" disabled selected hidden>+ Add Custom Exercise</option>`;
        exListCache.forEach(opt => { addExOpts += `<option value="${opt.name}">${opt.name}</option>`; });
        body.innerHTML += `<div class="add-ex-wrapper"><select class="add-ex-select" onchange="window.HOS.addEx(${State.week}, ${dIdx}, this)">${addExOpts}</select></div>`;
        container.appendChild(card);
    });

    const resetBtn = document.getElementById('reset-month-btn');
    if(resetBtn) resetBtn.innerText = `Reset Month ${State.month} Checkmarks`;
    renderDashboard();
}

// --- WINDOW HOS CONTROLLER ---
window.HOS = {
    _initCustomDay: (w, dIdx) => {
        const k = `${State.program.replace(/\s/g,'')}_w${w}_d${dIdx}`;
        if (!State.customDays[k]) State.customDays[k] = JSON.parse(JSON.stringify(Blueprint[w][dIdx].ex));
        return k;
    },
    changeProgram: (progName) => {
        if(!confirm(`Switch to ${progName}? Your customized days will reset to this new structure. Your old logs are safely preserved.`)) {
            document.getElementById('program-selector').value = State.program; return;
        }
        State.program = progName; localStorage.setItem('h_prog', progName);
        loadActiveBlueprint(); buildFilters(); renderMatrix(); syncToCloud(); Toast(`Program switched to ${progName}`);
    },
    switchAtlas: (sectionId, btn) => {
        document.querySelectorAll('.atlas-section').forEach(e => e.classList.remove('active'));
        document.querySelectorAll('.atlas-tab').forEach(e => e.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active'); btn.classList.add('active');
    },
    swapExercise: (w, dIdx, eIdx, newEx, oldExKeyClean) => {
        const k = window.HOS._initCustomDay(w, dIdx);
        State.customDays[k][eIdx][0] = newEx;
        Blueprint[w][dIdx].ex = State.customDays[k]; 
        
        localStorage.setItem('h_cDays', JSON.stringify(State.customDays));
        // Delete all old ghost logs dynamically
        Object.keys(State.logs).forEach(logKey => {
            if(logKey.startsWith(`w${w}_d${dIdx}_${oldExKeyClean}`)) delete State.logs[logKey];
        });
        localStorage.setItem('h_l', JSON.stringify(State.logs));
        syncToCloud(); renderMatrix(); Toast("Exercise Swapped.");
    },
    addEx: (w, dIdx, selectEl) => {
        if (!selectEl.value) return;
        const k = window.HOS._initCustomDay(w, dIdx);
        State.customDays[k].push([selectEl.value, "3x10", "Tempo: 3s ↓"]);
        Blueprint[w][dIdx].ex = State.customDays[k];
        
        localStorage.setItem('h_cDays', JSON.stringify(State.customDays));
        syncToCloud(); renderMatrix(); Toast("Exercise Added.");
    },
    removeEx: (w, dIdx, eIdx, exName) => {
        if (!confirm(`Remove ${exName}? Your logged data for it will be deleted.`)) return;
        const k = window.HOS._initCustomDay(w, dIdx);
        State.customDays[k].splice(eIdx, 1);
        Blueprint[w][dIdx].ex = State.customDays[k];
        
        localStorage.setItem('h_cDays', JSON.stringify(State.customDays));
        const cleanName = exName.replace(/\s/g,'');
        Object.keys(State.logs).forEach(logKey => {
            if(logKey.startsWith(`w${w}_d${dIdx}_${cleanName}`)) delete State.logs[logKey];
        });
        localStorage.setItem('h_l', JSON.stringify(State.logs));
        syncToCloud(); renderMatrix(); Toast("Exercise Removed.");
    },
    resetMonth: () => {
        if(!confirm(`WARNING: Resetting Month ${State.month}. Checkmarks clear, but Numbers (Weight/Reps) are safely preserved for charts!`)) return;
        const startWk = ((State.month - 1) * 4) + 1; const endWk = startWk + 3;
        for(let w = startWk; w <= endWk; w++) {
            Object.keys(State.logs).forEach(k => { if(k.startsWith(`w${w}_`)) State.logs[k].done = false; });
        }
        localStorage.setItem('h_l', JSON.stringify(State.logs)); syncToCloud(); renderMatrix(); Toast(`Month ${State.month} Reset!`);
    },
    updateProteinSim: () => {
        const bwInput = parseFloat(document.getElementById('sim-bw').value); const proInput = parseFloat(document.getElementById('sim-pro').value);
        const resEl = document.getElementById('sim-pro-result');
        if(!bwInput || !proInput) { resEl.innerHTML = "Enter your stats to compute synthesis limits."; return; }
        const bwLbs = State.unit === 'kg' ? bwInput * 2.20462 : bwInput; const targetPro = Math.round(bwLbs * 0.7);
        if(proInput <= targetPro) {
            resEl.innerHTML = `<span style="color:var(--accent-green); font-weight:bold;">100% Utilized.</span> Every gram is actively fueling mTORC1. Room to increase to ${targetPro}g.`;
        } else {
            const waste = Math.round(proInput - targetPro);
            resEl.innerHTML = `<span style="color:var(--accent-orange); font-weight:bold;">Ceiling Reached at ${targetPro}g.</span><br>Remaining <strong><span style="color:white;">${waste}g</span></strong> provides 0% muscle growth.`;
        }
    },
    updateSleepSim: () => {
        const val = parseFloat(document.getElementById('sim-sleep').value);
        document.getElementById('sim-sleep-val').innerText = val + " Hrs";
        let fPct = 80; let mPct = 20; let msg = ""; let color = "var(--accent-cyan)";
        if(val >= 8) { fPct = 85; mPct = 15; msg = "Peak Anabolism. Maximum fat oxidation active."; color = "var(--accent-green)"; }
        else if(val === 7.5) { fPct = 80; mPct = 20; msg = "Optimal hormonal baseline. Fat prioritized for fuel."; color = "var(--accent-cyan)"; }
        else if(val >= 6.5) { fPct = 65; mPct = 35; msg = "Slight cortisol elevation. Mild partition penalty."; color = "white"; }
        else if(val === 6) { fPct = 50; mPct = 50; msg = "Testosterone suppression begins. Significant muscle wasting."; color = "var(--accent-orange)"; }
        else if(val === 5.5) { fPct = 40; mPct = 60; msg = "Clinical Danger Zone: Body actively defends fat stores and metabolizes muscle."; color = "var(--accent-orange)"; }
        else { fPct = 25; mPct = 75; msg = "Catabolic Crisis: Extreme cortisol spike. Muscle heavily cannibalized."; color = "red"; }
        document.getElementById('bar-fat').style.width = fPct + "%"; document.getElementById('bar-fat').innerText = fPct + "%";
        document.getElementById('bar-muscle').style.width = mPct + "%"; document.getElementById('bar-muscle').innerText = mPct + "%";
        const desc = document.getElementById('sim-sleep-desc'); desc.innerText = `"${msg}"`; desc.style.color = color;
        document.getElementById('sim-sleep-val').style.color = color; document.getElementById('sim-sleep-val').style.textShadow = `0 0 10px ${color}`;
    },
    toggleUnit: () => {
        State.unit = State.unit === 'kg' ? 'lbs' : 'kg'; localStorage.setItem('h_u', State.unit);
        const ratio = State.unit === 'lbs' ? 2.20462 : (1 / 2.20462);
        Object.keys(State.logs).forEach(k => {
            if(State.logs[k].w) { let parsed = parseFloat(State.logs[k].w); if(!isNaN(parsed)) State.logs[k].w = (Math.round(parsed * ratio * 2) / 2).toString(); }
        });
        if(State.labBw) { let parsedBw = parseFloat(State.labBw); if(!isNaN(parsedBw)) { State.labBw = Math.round(parsedBw * ratio).toString(); localStorage.setItem('h_labBw', State.labBw); } }
        localStorage.setItem('h_l', JSON.stringify(State.logs)); syncToCloud(); updateUnitUI(); if(State.view === 'view-matrix') renderMatrix();
        Toast(`Converted to ${State.unit.toUpperCase()}`);
    },
    switchView: (vId, btn) => {
        document.querySelectorAll('.view-section').forEach(e => e.classList.remove('active'));
        document.getElementById(vId).classList.add('active');
        if(btn){ document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active')); btn.classList.add('active'); }
        State.view = vId; localStorage.setItem('h_v', vId); if(vId === 'view-dash') renderDashboard();
    },
    save: (k, f, v) => { if(!State.logs[k]) State.logs[k] = {w:'',r:'',rir:'',done:false}; State.logs[k][f] = v; localStorage.setItem('h_l', JSON.stringify(State.logs)); syncToCloud(); updateDayProgress(k); },
    check: (k, el, ev) => {
        ev.stopPropagation(); if(!State.logs[k]) State.logs[k] = {w:'',r:'',rir:'',done:false};
        State.logs[k].done = !State.logs[k].done; localStorage.setItem('h_l', JSON.stringify(State.logs)); syncToCloud();
        if(State.logs[k].done) { el.classList.add('checked'); el.closest('tr').classList.add('done-row'); } else { el.classList.remove('checked'); el.closest('tr').classList.remove('done-row'); }
        updateDayProgress(k);
    },
    saveBW: (val) => { State.labBw = val; localStorage.setItem('h_labBw', val); syncToCloud(); window.HOS.calcRecomp(); },
    calcRecomp: () => {
        const bw = parseFloat(State.labBw); if(!bw) return;
        if(State.unit === 'kg') {
            document.getElementById('res-fat').innerText = (bw * 0.005).toFixed(2) + " kg/wk"; document.getElementById('res-cal').innerText = "-" + Math.round((bw * 0.005 * 7700) / 7) + " kcal/day"; document.getElementById('res-pro').innerText = Math.round(bw * 1.6) + " g/day";
        } else {
            document.getElementById('res-fat').innerText = (bw * 0.005).toFixed(2) + " lbs/wk"; document.getElementById('res-cal').innerText = "-" + Math.round((bw * 0.005 * 3500) / 7) + " kcal/day"; document.getElementById('res-pro').innerText = Math.round(bw * 0.7) + " g/day";
        }
        document.getElementById('calc-results').style.display = 'block';
    },
    startTimer: (sec) => {
        clearInterval(window.tInt); let r = sec; document.getElementById('rest-timer').classList.add('active');
        window.tInt = setInterval(() => {
            r--; document.getElementById('timer-val').innerText = `${Math.floor(r/60).toString().padStart(2,'0')}:${(r%60).toString().padStart(2,'0')}`;
            if(r<=0){ clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); Toast("Rest complete."); }
        }, 1000);
    },
    stopTimer: () => { clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); },
    logout: async () => { if(useFirebase) await signOut(auth); localStorage.clear(); location.reload(); },
    
    updateModality: (isInit = false) => {
        const m = document.getElementById('filter-muscle').value; State.dashMusc = m; localStorage.setItem('h_dMusc', m);
        const modDrop = document.getElementById('filter-modality');
        let validMods = new Set(); exListCache.forEach(e => { if(m === 'All' || e.muscle === m) validMods.add(e.modality); });
        modDrop.innerHTML = '<option value="All">All Modalities</option>';
        Array.from(validMods).sort().forEach(mod => { modDrop.innerHTML += `<option value="${mod}">${mod}</option>`; });
        if(isInit) modDrop.value = State.dashMod; window.HOS.updateExerciseDrop(isInit);
    },
    updateExerciseDrop: (isInit = false) => {
        const m = document.getElementById('filter-muscle').value; const mod = document.getElementById('filter-modality').value;
        State.dashMod = mod; localStorage.setItem('h_dMod', mod);
        const exDrop = document.getElementById('analytics-ex'); exDrop.innerHTML = '<option value="">Select an exercise...</option>';
        exListCache.forEach(e => { if((m === 'All' || e.muscle === m) && (mod === 'All' || e.modality === mod)) exDrop.innerHTML += `<option value="${e.name}">${e.name}</option>`; });
        if(isInit && State.dashEx) exDrop.value = State.dashEx; window.HOS.saveChartEx(); 
    },
    saveChartEx: () => { const val = document.getElementById('analytics-ex').value; State.dashEx = val; localStorage.setItem('h_dEx', val); syncToCloud(); renderChart(); }
};

const boot = () => {
    document.getElementById('auth-gate').style.opacity = '0'; setTimeout(() => document.getElementById('auth-gate').style.display = 'none', 400);
    document.getElementById('app-core').style.display = 'block'; document.getElementById('app-nav').style.display = 'flex';
    updateUnitUI(); buildFilters(); window.HOS.switchView(State.view, document.querySelector(`.nav-item[onclick*="${State.view}"]`)); renderMatrix();
};

let isLogin = true;
document.getElementById('auth-toggle').onclick = () => {
    isLogin = !isLogin; document.getElementById('auth-btn').innerText = isLogin ? "Initialize Connection" : "Create Profile";
    document.getElementById('auth-toggle').innerText = isLogin ? "New user? Create profile." : "Existing user? Authenticate.";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault(); if(!useFirebase) { Toast("Offline Mode Active."); return boot(); }
    const em = document.getElementById('auth-email').value; const ps = document.getElementById('auth-pass').value;
    document.getElementById('auth-btn').innerText = "Authenticating...";
    try { if(isLogin) await signInWithEmailAndPassword(auth, em, ps); else await createUserWithEmailAndPassword(auth, em, ps);
    } catch(err) { Toast(err.message.split(': ')[1] || err.message); document.getElementById('auth-btn').innerText = "Retry"; }
};

if(useFirebase) {
    onAuthStateChanged(auth, async (u) => {
        if(u) {
            State.user = u;
            try {
                const d = await getDoc(doc(db, "users", u.uid));
                if(d.exists()) {
                    const data = d.data();
                    State.program = data.program || State.program; State.month = data.month || State.month; State.week = data.week || State.week; 
                    State.unit = data.unit || State.unit; State.labBw = data.labBw || State.labBw;
                    State.dashMusc = data.dashMusc || State.dashMusc; State.dashMod = data.dashMod || State.dashMod;
                    State.dashEx = data.dashEx || State.dashEx; State.logs = data.logs || State.logs; State.customDays = data.customDays || State.customDays;
                    
                    localStorage.setItem('h_prog', State.program); localStorage.setItem('h_m', State.month); localStorage.setItem('h_w', State.week); localStorage.setItem('h_u', State.unit);
                    localStorage.setItem('h_labBw', State.labBw); localStorage.setItem('h_dMusc', State.dashMusc); localStorage.setItem('h_dMod', State.dashMod);
                    localStorage.setItem('h_dEx', State.dashEx); localStorage.setItem('h_l', JSON.stringify(State.logs)); localStorage.setItem('h_cDays', JSON.stringify(State.customDays));
                    loadActiveBlueprint();
                }
            } catch(e) {}
            boot();
        } else { document.getElementById('auth-gate').style.display = 'flex'; document.getElementById('app-core').style.display = 'none'; }
    });
}
