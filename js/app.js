// js/app.js
import { Programs, getExerciseMeta, ExerciseDB } from './programs.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8oSFSnuxESP5AwXO2-GWHD8A-_0CvLnE",
    authDomain: "gym-blueprint.firebaseapp.com",
    projectId: "gym-blueprint"
};

let auth, db, useFirebase = false;
try { 
    const app = initializeApp(firebaseConfig); 
    auth = getAuth(app); db = getFirestore(app); useFirebase = true; 
} catch(e) { console.error("Firebase init failed, using LocalStorage"); }

const State = {
    user: null, view: localStorage.getItem('h_v') || 'view-dash', unit: localStorage.getItem('h_u') || 'kg',
    programId: localStorage.getItem('h_prog') || '', month: parseInt(localStorage.getItem('h_m')) || 1, week: parseInt(localStorage.getItem('h_w')) || 1,
    labBw: localStorage.getItem('h_labBw') || '', dashMusc: localStorage.getItem('h_dMusc') || 'All', dashMod: localStorage.getItem('h_dMod') || 'All', dashEx: localStorage.getItem('h_dEx') || '',
    logs: JSON.parse(localStorage.getItem('h_l') || '{}'), overloads: JSON.parse(localStorage.getItem('h_overloads') || '{}'), swaps: JSON.parse(localStorage.getItem('h_swaps') || '{}'),
    weightLogs: JSON.parse(localStorage.getItem('h_weight') || '[]')
};

let syncTimer;
const Toast = (msg) => { const el = document.getElementById('toast'); el.innerText = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); };

const saveState = () => {
    localStorage.setItem('h_l', JSON.stringify(State.logs)); localStorage.setItem('h_overloads', JSON.stringify(State.overloads));
    localStorage.setItem('h_swaps', JSON.stringify(State.swaps)); localStorage.setItem('h_weight', JSON.stringify(State.weightLogs));
    localStorage.setItem('h_prog', State.programId); localStorage.setItem('h_m', State.month); localStorage.setItem('h_w', State.week);
    if(useFirebase && State.user) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
            try { await setDoc(doc(db, "users", State.user.uid), { 
                programId: State.programId, week: State.week, month: State.month, unit: State.unit, labBw: State.labBw, 
                logs: State.logs, overloads: State.overloads, swaps: State.swaps, weightLogs: State.weightLogs
            }, { merge: true }); } catch(e) {}
        }, 1500);
    }
};

window.HOS = {
    logout: async () => { if(useFirebase) await signOut(auth); localStorage.clear(); location.reload(); },
    switchAtlas: (sectionId, btn) => {
        document.querySelectorAll('.atlas-section').forEach(e => e.classList.remove('active'));
        document.querySelectorAll('.atlas-tab').forEach(e => e.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active'); btn.classList.add('active');
    },
    toggleUnit: () => {
        State.unit = State.unit === 'kg' ? 'lbs' : 'kg'; localStorage.setItem('h_u', State.unit);
        document.getElementById('unit-kg').classList.toggle('active', State.unit === 'kg');
        document.getElementById('unit-lbs').classList.toggle('active', State.unit === 'lbs');
        Toast(`Units converted to ${State.unit.toUpperCase()}`);
        if(State.view === 'view-matrix') renderMatrix();
    },
    switchView: (vId, btn) => {
        document.querySelectorAll('.view-section').forEach(e => e.classList.remove('active'));
        document.getElementById(vId).classList.add('active');
        if(btn) { document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active')); btn.classList.add('active'); }
        State.view = vId; localStorage.setItem('h_v', vId);
        if(vId === 'view-dash') renderDashboard(); if(vId === 'view-matrix') renderMatrix();
    },

    // ONBOARDING & PROGRAMS
    switchProgram: (newProg) => {
        if(State.programId && !confirm("Switching plans will archive your current cycle and generate a new matrix. Continue?")) return;
        State.programId = newProg; State.week = 1; State.month = 1; saveState();
        Toast("New Blueprint Initialized."); window.HOS.switchView('view-matrix', document.querySelectorAll('.nav-item')[2]);
    },
    finishOnboarding: () => {
        const days = document.getElementById('wizard-days').value; State.labBw = document.getElementById('wizard-bw').value;
        let prog = 'os'; if(days === '3') prog = 'foundation'; if(days === '4') prog = 'titan';
        State.programId = prog; saveState();
        document.getElementById('onboarding-wizard').style.display = 'none'; document.getElementById('app-core').style.display = 'block'; document.getElementById('app-nav').style.display = 'flex';
        renderDashboard(); renderMatrix();
    },

    // EXERCISE SWAPPING BUG FIXED (Wipes old scoped data)
    swapExercise: (w, dIdx, eIdx, newEx, oldExKeyClean) => {
        const swapKey = `p_${State.programId}_w${w}_d${dIdx}_e${eIdx}`;
        State.swaps[swapKey] = newEx;
        // Wipe old logs to prevent ghost percentage data
        for(let s=1; s<=10; s++) delete State.logs[`p_${State.programId}_w${w}_d${dIdx}_${oldExKeyClean}_s${s}`];
        saveState(); renderMatrix(); Toast("Exercise Swapped.");
    },

    // LOGGING & AUTO-REGULATION
    save: (k, f, v) => { if(!State.logs[k]) State.logs[k] = {w:'', r:'', rir:'', done:false}; State.logs[k][f] = v; saveState(); updateDayProgress(k); },
    check: (k, el, ev, targetReps, exName) => {
        ev.stopPropagation();
        if(!State.logs[k]) State.logs[k] = {w:'', r:'', rir:'1', done:false};
        const log = State.logs[k]; log.done = !log.done;
        
        // Auto-Regulation Engine (The +2.5kg feature)
        if (log.done) {
            const rDone = parseInt(log.r) || parseInt(targetReps); const rir = parseInt(log.rir);
            if (rir === 0 && rDone >= parseInt(targetReps)) {
                const match = k.match(/_w(\d+)_/);
                if (match) {
                    const nextWk = parseInt(match[1]) + 1;
                    State.overloads[`p_${State.programId}_w${nextWk}_${exName.replace(/\s/g,'')}`] = true;
                    Toast("⚡ Overload detected. Load increased for next week.");
                }
            }
        }
        saveState(); updateDayProgress(k);
        if(log.done) el.closest('tr').classList.add('done-row'); else el.closest('tr').classList.remove('done-row');
        renderFatigue();
    },

    // RESTORED LAB SIMULATORS
    updateProteinSim: () => {
        const bw = parseFloat(document.getElementById('sim-bw').value); const pro = parseFloat(document.getElementById('sim-pro').value);
        if(!bw || !pro) return;
        const bwLbs = State.unit === 'kg' ? bw * 2.20462 : bw; const target = Math.round(bwLbs * 0.7);
        const resEl = document.getElementById('sim-pro-result');
        if(pro <= target) resEl.innerHTML = `<span style="color:var(--accent-green);font-weight:bold;">100% Utilized.</span> Every gram is fueling mTORC1. Room to increase up to ${target}g.`;
        else resEl.innerHTML = `<span style="color:var(--accent-orange);font-weight:bold;">Ceiling Reached at ${target}g.</span> Remaining ${Math.round(pro - target)}g provides 0% muscle growth.`;
    },
    updateSleepSim: () => {
        const val = parseFloat(document.getElementById('sim-sleep').value);
        document.getElementById('sim-sleep-val').innerText = val + " Hrs";
        let fPct = 80; let mPct = 20; let msg = "Optimal hormonal baseline."; let color = "var(--accent-cyan)";
        if(val >= 8) { fPct = 85; mPct = 15; msg = "Peak Anabolism."; color = "var(--accent-green)"; }
        else if(val <= 6 && val > 5) { fPct = 50; mPct = 50; msg = "Testosterone suppression begins."; color = "var(--accent-orange)"; }
        else if(val <= 5) { fPct = 25; mPct = 75; msg = "Catabolic Crisis. Severe muscle wasting."; color = "red"; }
        document.getElementById('bar-fat').style.width = fPct + "%"; document.getElementById('bar-fat').innerText = fPct + "%";
        document.getElementById('bar-muscle').style.width = mPct + "%"; document.getElementById('bar-muscle').innerText = mPct + "%";
        document.getElementById('sim-sleep-desc').innerText = `"${msg}"`; document.getElementById('sim-sleep-desc').style.color = color;
    },
    calcRecomp: () => {
        const bw = parseFloat(document.getElementById('calc-bw').value); if(!bw) return;
        if(State.unit === 'kg') {
            document.getElementById('res-fat').innerText = (bw * 0.005).toFixed(2) + " kg/wk";
            document.getElementById('res-cal').innerText = "-" + Math.round((bw * 0.005 * 7700) / 7) + " kcal/day";
            document.getElementById('res-pro').innerText = Math.round(bw * 1.6) + " g/day";
        } else {
            document.getElementById('res-fat').innerText = (bw * 0.005).toFixed(2) + " lbs/wk";
            document.getElementById('res-cal').innerText = "-" + Math.round((bw * 0.005 * 3500) / 7) + " kcal/day";
            document.getElementById('res-pro').innerText = Math.round(bw * 0.7) + " g/day";
        }
        document.getElementById('calc-results').style.display = 'block';
    },

    // CHART FILTERS & WEIGHT DELTA
    logDailyWeight: () => {
        const val = parseFloat(document.getElementById('dash-weight-input').value); if(!val) return;
        State.weightLogs.push({ date: new Date().toISOString(), weight: val }); saveState(); Toast("Weight logged.");
        if(State.weightLogs.length > 7) {
            const deltaPct = ((val - State.weightLogs[State.weightLogs.length - 8].weight) / State.weightLogs[State.weightLogs.length - 8].weight) * 100;
            const a = document.getElementById('weight-delta-alert'); a.style.display = 'block';
            if (deltaPct < -1.5) a.innerText = `⚠️ Lost ${Math.abs(deltaPct).toFixed(1)}%. Catabolic speed. Add 250 kcal.`;
            else if (deltaPct > 1.5) a.innerText = `⚠️ Gained ${deltaPct.toFixed(1)}%. Reduce 200 kcal to prevent fat spillover.`;
            else { a.innerText = `✅ Delta stable at ${deltaPct.toFixed(1)}%.`; a.style.color = "var(--accent-green)"; }
        }
    },
    updateModality: () => {
        const m = document.getElementById('filter-muscle').value; State.dashMusc = m;
        const modDrop = document.getElementById('filter-modality');
        let validMods = new Set(); ExerciseDB.forEach(e => { const meta = getExerciseMeta(e); if(m === 'All' || meta.muscle === m) validMods.add(meta.modality); });
        modDrop.innerHTML = '<option value="All">All Modalities</option>';
        Array.from(validMods).sort().forEach(mod => { modDrop.innerHTML += `<option value="${mod}">${mod}</option>`; });
        window.HOS.updateExerciseDrop();
    },
    updateExerciseDrop: () => {
        const m = document.getElementById('filter-muscle').value; const mod = document.getElementById('filter-modality').value;
        const exDrop = document.getElementById('analytics-ex'); exDrop.innerHTML = '<option value="">Select an exercise...</option>';
        ExerciseDB.forEach(e => { const meta = getExerciseMeta(e); if((m === 'All' || meta.muscle === m) && (mod === 'All' || meta.modality === mod)) exDrop.innerHTML += `<option value="${e}">${e}</option>`; });
        window.HOS.saveChartEx();
    },
    saveChartEx: () => { State.dashEx = document.getElementById('analytics-ex').value; renderChart(); },

    // TIMERS
    startTimer: (sec) => {
        clearInterval(window.tInt); let r = sec; document.getElementById('rest-timer').classList.add('active');
        window.tInt = setInterval(() => {
            r--; document.getElementById('timer-val').innerText = `${Math.floor(r/60).toString().padStart(2,'0')}:${(r%60).toString().padStart(2,'0')}`;
            if(r<=0){ clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); Toast("Rest complete. Execute."); }
        }, 1000);
    },
    stopTimer: () => { clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); }
};

// PERCENTAGE BUG FIXED
function updateDayProgress(k) {
    const match = k.match(/_d(\d+)_/);
    if(!match) return;
    const dIdx = parseInt(match[1]);
    const accordions = document.querySelectorAll('#days-container .day-accordion');
    if(accordions[dIdx]) {
        const day = Programs[State.programId].generate(State.week)[dIdx];
        let ts=0; let ds=0;
        day.ex.forEach((e, eIdx) => {
            let sets = parseInt(e[1].split('x')[0])||3;
            const swapKey = `p_${State.programId}_w${State.week}_d${dIdx}_e${eIdx}`;
            const exName = State.swaps[swapKey] || e[0];
            for(let i=1; i<=sets; i++){ 
                ts++; if(State.logs[`p_${State.programId}_w${State.week}_d${dIdx}_${exName.replace(/\s/g,'')}_s${i}`]?.done) ds++;
            }
        });
        const pct = ts>0 ? Math.round((ds/ts)*100) : 0;
        accordions[dIdx].querySelector('.day-prog').innerText = `${pct}%`;
    }
}

// RESTORED CHART LOGIC (Scoped to current program)
function renderChart() {
    if(!State.dashEx || !State.programId) return;
    const svg = document.getElementById('progression-chart'); svg.innerHTML = '';
    let dataPts =[];
    for(let w=1; w<=24; w++){
        let maxW = 0;
        Object.keys(State.logs).forEach(k => {
            if(k.startsWith(`p_${State.programId}_w${w}_`) && k.includes(State.dashEx.replace(/\s/g,''))) {
                let wVal = parseFloat(State.logs[k].w);
                if(wVal > maxW && State.logs[k].done) maxW = wVal;
            }
        });
        if(maxW > 0) dataPts.push({w, maxW});
    }
    if(dataPts.length === 0) { svg.innerHTML = `<text x="50%" y="50%" fill="#888" font-size="12" text-anchor="middle">No logs yet.</text>`; return; }

    const w = svg.clientWidth || 300; const h = 200; const pad = 20;
    const maxVal = Math.max(...dataPts.map(d=>d.maxW)) * 1.2; 
    const wUnit = (w - pad*2) / Math.max(1, dataPts.length - 1);

    let pathD = `M ${pad} ${h - pad - (dataPts[0].maxW/maxVal)*(h - pad*2)}`;
    dataPts.forEach((pt, i) => {
        const x = pad + (i * wUnit); const y = h - pad - ((pt.maxW/maxVal) * (h - pad*2));
        if(i > 0) pathD += ` L ${x} ${y}`;
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x); circle.setAttribute("cy", y); circle.setAttribute("r", 4);
        circle.setAttribute("fill", "var(--accent-cyan)"); svg.appendChild(circle);
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", x); txt.setAttribute("y", y - 10); txt.setAttribute("fill", "white");
        txt.setAttribute("font-size", "10"); txt.setAttribute("text-anchor", "middle"); txt.textContent = pt.maxW; svg.appendChild(txt);
    });
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", pathD); linePath.setAttribute("fill", "none"); linePath.setAttribute("stroke", "var(--accent-cyan)"); linePath.setAttribute("stroke-width", "2"); svg.insertBefore(linePath, svg.firstChild);
}

function renderFatigue() {
    if(!State.programId) return;
    const blueprintData = Programs[State.programId].generate(State.week);
    const volumes = { Chest:0, Back:0, Shoulders:0, Arms:0, Legs:0, Core:0 };
    
    blueprintData.forEach((day, dIdx) => {
        day.ex.forEach((e, eIdx) => {
            let sets = parseInt(e[1].split('x')[0]) || 3;
            const swapKey = `p_${State.programId}_w${State.week}_d${dIdx}_e${eIdx}`;
            const exName = State.swaps[swapKey] || e[0];
            let musc = getExerciseMeta(exName).muscle;
            
            for(let s=1; s<=sets; s++) {
                if (State.logs[`p_${State.programId}_w${State.week}_d${dIdx}_${exName.replace(/\s/g,'')}_s${s}`]?.done) volumes[musc]++;
            }
        });
    });

    const cont = document.getElementById('fatigue-meter-container'); if(!cont) return;
    cont.innerHTML = ''; let overMRV = false;
    Object.keys(volumes).forEach(m => {
        const sets = volumes[m]; let color = "var(--text-muted)", status = "Under-dosed"; let pct = Math.min((sets / 25) * 100, 100);
        if(sets >= 6 && sets <= 11) { color = "var(--accent-green)"; status = "MEV - Growing"; }
        if(sets >= 12 && sets <= 18) { color = "var(--accent-purple)"; status = "MAV - Peak Growth"; }
        if(sets >= 19) { color = "var(--accent-orange)"; status = "MRV - Overload"; overMRV = true; }
        
        cont.innerHTML += `<div style="font-size:0.8rem; font-weight:bold; display:flex; justify-content:space-between;"><span>${m}</span> <span style="color:${color}">${sets} Sets (${status})</span></div><div class="fatigue-bar-bg"><div class="fatigue-bar-fill" style="width:${pct}%; background:${color}; box-shadow: 0 0 10px ${color}"></div></div>`;
    });
    document.getElementById('deload-warning').style.display = overMRV ? "block" : "none";
}

function renderMatrix() {
    if(!State.programId) return;
    const blueprintData = Programs[State.programId].generate(State.week);
    document.getElementById('month-slider').innerHTML = [1,2,3,4].map(i => `<div class="month-btn ${i===State.month?'active':''}" onclick="State.month=${i};State.week=${(i-1)*4+1};window.HOS.switchView('view-matrix');window.renderMatrix()">Month ${i}</div>`).join('');
    const startWk = ((State.month - 1) * 4) + 1;
    document.getElementById('week-slider').innerHTML = [0,1,2,3].map(i => `<div class="week-btn ${startWk+i===State.week?'active':''}" onclick="State.week=${startWk+i};window.HOS.switchView('view-matrix');window.renderMatrix()">Wk ${startWk+i}</div>`).join('');
    
    document.getElementById('weekly-goal').innerHTML = `<strong>🎯 Architecture:</strong> ${Programs[State.programId].id.toUpperCase()}`;
    const container = document.getElementById('days-container'); container.innerHTML = '';
    
    blueprintData.forEach((day, dIdx) => {
        const card = document.createElement('div'); card.className = 'day-accordion';
        card.innerHTML = `<div class="day-header" onclick="this.nextElementSibling.classList.toggle('open')"><h3>${day.title}</h3><span class="day-prog">0%</span></div><div class="day-body"></div>`;
        const body = card.querySelector('.day-body');

        day.ex.forEach((e, eIdx) => {
            let sets = parseInt(e[1].split('x')[0]) || 3; let targetReps = e[1].split('x')[1] || "10";
            
            // Swap Dropdown Logic
            const swapKey = `p_${State.programId}_w${State.week}_d${dIdx}_e${eIdx}`;
            const currentName = State.swaps[swapKey] || e[0];
            const exMeta = getExerciseMeta(e[0]); 
            const validOptions = ExerciseDB.filter(x => getExerciseMeta(x).muscle === exMeta.muscle);
            let swapDropdown = `<select class="ex-swap-select" onchange="window.HOS.swapExercise(${State.week}, ${dIdx}, ${eIdx}, this.value, '${currentName.replace(/\s/g,'')}')">`;
            validOptions.forEach(opt => swapDropdown += `<option value="${opt}" ${opt === currentName ? 'selected' : ''}>${opt}</option>`);
            swapDropdown += `</select>`;

            const exKeyClean = currentName.replace(/\s/g,'');
            const isOverloaded = State.overloads[`p_${State.programId}_w${State.week}_${exKeyClean}`];
            const overloadBadge = isOverloaded ? `<span class="badge overload">+2.5 OVERLOAD</span>` : '';

            let rows = ''; 
            for(let s=1; s<=sets; s++){
                const k = `p_${State.programId}_w${State.week}_d${dIdx}_${exKeyClean}_s${s}`;
                const l = State.logs[k] || {w:'',r:'', rir:'', done:false};
                
                let rVal = l.r !== '' ? parseInt(l.r) : parseInt(targetReps);
                let rirVal = l.rir !== '' ? parseInt(l.rir) : 1; 
                let displayWeight = l.w; if(displayWeight === '' && isOverloaded) displayWeight = "+2.5";
                
                rows += `<tr class="${l.done ? 'done-row':''}">
                    <td class="set-idx">${s}</td>
                    <td><input type="number" step="0.5" class="log-input" style="padding:4px;width:60px;" value="${displayWeight}" placeholder="${State.unit}" onchange="window.HOS.save('${k}','w',this.value)"></td>
                    <td><input type="number" class="log-input" style="padding:4px;width:45px;" value="${rVal}" onchange="window.HOS.save('${k}','r',this.value)"></td>
                    <td><input type="number" class="log-input" style="padding:4px;width:45px;color:var(--accent-orange);" value="${rirVal}" onchange="window.HOS.save('${k}','rir',this.value)"></td>
                    <td><div class="check-btn ${l.done?'checked':''}" onclick="window.HOS.check('${k}',this,event, '${targetReps}', '${currentName}')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div></td>
                </tr>`;
            }

            body.innerHTML += `<div class="ex-card">
                <div class="ex-title">${swapDropdown}</div>
                <div class="ex-meta"><span class="badge">${e[1]}</span><span class="badge">${e[2]}</span>${overloadBadge}</div>
                <table class="log-table"><tr><th>Set</th><th>Load</th><th>Reps</th><th>RIR</th><th>Log</th></tr>${rows}</table>
            </div>`;
        });
        container.appendChild(card);
        updateDayProgress(`_d${dIdx}_`); // Force percentage calculate on render
    });
}

function renderDashboard() { renderFatigue(); window.HOS.updateModality(); }

// FIREBASE BOOT SEQUENCE
if(useFirebase) {
    onAuthStateChanged(auth, async (u) => {
        if(u) {
            State.user = u;
            try {
                const d = await getDoc(doc(db, "users", u.uid));
                if(d.exists()) {
                    const data = d.data();
                    State.programId = data.programId || State.programId; State.month = data.month || State.month; 
                    State.week = data.week || State.week; State.logs = data.logs || State.logs;
                    State.overloads = data.overloads || State.overloads; State.swaps = data.swaps || State.swaps;
                    State.weightLogs = data.weightLogs || State.weightLogs; saveState();
                }
            } catch(e) {}
            boot();
        } else { document.getElementById('auth-gate').style.display = 'flex'; }
    });
} else { boot(); }

function boot() {
    document.getElementById('auth-gate').style.display = 'none';
    if(!State.programId) document.getElementById('onboarding-wizard').style.display = 'flex';
    else { document.getElementById('app-core').style.display = 'block'; document.getElementById('app-nav').style.display = 'flex'; renderDashboard(); renderMatrix(); }
}

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault(); if(!useFirebase) { boot(); return; }
    const em = document.getElementById('auth-email').value; const ps = document.getElementById('auth-pass').value;
    document.getElementById('auth-btn').innerText = "Authenticating...";
    try { if(document.getElementById('auth-btn').innerText === "Create Profile") await createUserWithEmailAndPassword(auth, em, ps); else await signInWithEmailAndPassword(auth, em, ps);
    } catch(err) { Toast(err.message); document.getElementById('auth-btn').innerText = "Retry"; }
};

document.getElementById('auth-toggle').onclick = () => {
    const btn = document.getElementById('auth-btn');
    btn.innerText = btn.innerText === "Initialize Connection" ? "Create Profile" : "Initialize Connection";
};

// Make renderMatrix globally available for HTML inline callbacks
window.renderMatrix = renderMatrix;
