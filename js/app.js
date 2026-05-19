// js/app.js
import { Programs, getMuscleGroup } from './programs.js';

const State = {
    view: localStorage.getItem('h_v') || 'view-dash',
    unit: localStorage.getItem('h_u') || 'kg',
    programId: localStorage.getItem('h_prog') || '',
    month: parseInt(localStorage.getItem('h_m')) || 1,
    week: parseInt(localStorage.getItem('h_w')) || 1,
    labBw: localStorage.getItem('h_labBw') || '',
    logs: JSON.parse(localStorage.getItem('h_l') || '{}'),
    overloads: JSON.parse(localStorage.getItem('h_overloads') || '{}'), // Auto-regulation flags
    weightLogs: JSON.parse(localStorage.getItem('h_weight') || '[]') // Format: [{date, weight}]
};

const Toast = (msg) => {
    const el = document.getElementById('toast'); el.innerText = msg;
    el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500);
};

const saveState = () => {
    localStorage.setItem('h_l', JSON.stringify(State.logs));
    localStorage.setItem('h_overloads', JSON.stringify(State.overloads));
    localStorage.setItem('h_weight', JSON.stringify(State.weightLogs));
    localStorage.setItem('h_prog', State.programId);
    localStorage.setItem('h_m', State.month);
    localStorage.setItem('h_w', State.week);
};

window.HOS = {
    logout: () => { localStorage.clear(); location.reload(); },
    
    toggleUnit: () => {
        State.unit = State.unit === 'kg' ? 'lbs' : 'kg';
        localStorage.setItem('h_u', State.unit);
        document.getElementById('unit-kg').classList.toggle('active', State.unit === 'kg');
        document.getElementById('unit-lbs').classList.toggle('active', State.unit === 'lbs');
        Toast(`Units converted to ${State.unit.toUpperCase()}`);
        if(State.view === 'view-matrix') renderMatrix();
    },

    switchView: (vId, btn) => {
        document.querySelectorAll('.view-section').forEach(e => e.classList.remove('active'));
        document.getElementById(vId).classList.add('active');
        if(btn) {
            document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
            btn.classList.add('active');
        }
        State.view = vId; localStorage.setItem('h_v', vId);
        if(vId === 'view-dash') renderDashboard();
        if(vId === 'view-matrix') renderMatrix();
    },

    // --- 1. DYNAMIC MODULARITY ---
    switchProgram: (newProg) => {
        if(State.programId && !confirm("Switching plans will archive your current cycle and generate a new matrix. Continue?")) return;
        State.programId = newProg; State.week = 1; State.month = 1;
        State.logs = {}; State.overloads = {}; saveState();
        Toast("New Blueprint Initialized.");
        window.HOS.switchView('view-matrix', document.querySelectorAll('.nav-item')[2]);
    },

    // --- 4. ONBOARDING WIZARD ---
    finishOnboarding: () => {
        const goal = document.getElementById('wizard-goal').value;
        const days = document.getElementById('wizard-days').value;
        const bw = document.getElementById('wizard-bw').value;
        
        State.labBw = bw; localStorage.setItem('h_labBw', bw);
        
        let prog = 'os'; // Default
        if(days === '3') prog = 'foundation';
        if(days === '4') prog = 'titan';
        
        State.programId = prog; saveState();
        document.getElementById('onboarding-wizard').style.display = 'none';
        document.getElementById('app-core').style.display = 'block';
        document.getElementById('app-nav').style.display = 'flex';
        renderDashboard();
    },

    save: (k, f, v) => {
        if(!State.logs[k]) State.logs[k] = {w:'', r:'', rir:'', done:false};
        State.logs[k][f] = v; saveState();
    },

    // --- 2. AUTO-REGULATION LOGIC ---
    check: (k, el, ev, targetReps, exName) => {
        ev.stopPropagation();
        if(!State.logs[k]) State.logs[k] = {w:'', r:'', rir:'1', done:false};
        const log = State.logs[k];
        log.done = !log.done;
        
        // The Engine: Check if user outperformed the blueprint parameters
        if (log.done) {
            const repsDone = parseInt(log.r) || parseInt(targetReps);
            const rir = parseInt(log.rir);
            
            // If they hit 0 RIR and beat the target reps, flag +2.5 overload for next week
            if (rir === 0 && repsDone >= parseInt(targetReps)) {
                // Parse current week to apply to next week
                const match = k.match(/w(\d+)_/);
                if (match) {
                    const nextWeek = parseInt(match[1]) + 1;
                    const cleanName = exName.replace(/\s/g,'');
                    State.overloads[`w${nextWeek}_${cleanName}`] = true;
                    Toast("⚡ Coach Engine: Overload detected. Increasing target weight for next week.");
                }
            }
        }

        saveState();
        if(log.done) el.closest('tr').classList.add('done-row');
        else el.closest('tr').classList.remove('done-row');
        renderMatrix();
        renderFatigue();
    },

    // --- 5. NUTRITION & LIFESTYLE INTEGRATION ---
    logDailyWeight: () => {
        const val = parseFloat(document.getElementById('dash-weight-input').value);
        if(!val) return;
        
        State.weightLogs.push({ date: new Date().toISOString(), weight: val });
        saveState();
        Toast("Weight logged successfully.");
        
        // Calculate Delta Coaching
        if(State.weightLogs.length > 7) {
            // Very simplified mock-delta for demonstration: Compare latest against 7 logs ago
            const current = val;
            const past = State.weightLogs[State.weightLogs.length - 8].weight;
            const deltaPct = ((current - past) / past) * 100;
            
            const alertBox = document.getElementById('weight-delta-alert');
            alertBox.style.display = 'block';
            if (deltaPct < -1.5) {
                alertBox.innerText = `⚠️ You lost ${Math.abs(deltaPct).toFixed(1)}% body weight this week. This is catabolic speed. Increase daily intake by 250 kcal to protect muscle mass.`;
            } else if (deltaPct > 1.5) {
                alertBox.innerText = `⚠️ You gained ${deltaPct.toFixed(1)}% body weight this week. Unless you're in a heavy Titan Block, reduce intake by 200 kcal to prevent fat spillover.`;
            } else {
                alertBox.innerText = `✅ Weight Delta stable at ${deltaPct.toFixed(1)}%. Nutrients partitioning optimally.`;
                alertBox.style.color = "var(--accent-green)";
            }
        }
    },

    startTimer: (sec) => {
        clearInterval(window.tInt); let r = sec; document.getElementById('rest-timer').classList.add('active');
        window.tInt = setInterval(() => {
            r--; document.getElementById('timer-val').innerText = `${Math.floor(r/60).toString().padStart(2,'0')}:${(r%60).toString().padStart(2,'0')}`;
            if(r<=0){ clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); Toast("Rest complete. Execute."); }
        }, 1000);
    },
    stopTimer: () => { clearInterval(window.tInt); document.getElementById('rest-timer').classList.remove('active'); }
};

// --- MATRIX RENDERER ---
function renderMatrix() {
    if(!State.programId) return;
    const blueprintData = Programs[State.programId].generate(State.week);
    
    // Sliders
    document.getElementById('month-slider').innerHTML = [1,2,3,4].map(i => `<div class="month-btn ${i===State.month?'active':''}" onclick="State.month=${i};State.week=${(i-1)*4+1};window.HOS.switchView('view-matrix')">Month ${i}</div>`).join('');
    
    const startWk = ((State.month - 1) * 4) + 1;
    document.getElementById('week-slider').innerHTML = [0,1,2,3].map(i => `<div class="week-btn ${startWk+i===State.week?'active':''}" onclick="State.week=${startWk+i};window.HOS.switchView('view-matrix')">Wk ${startWk+i}</div>`).join('');
    
    document.getElementById('weekly-goal').innerHTML = `<strong>🎯 Architecture:</strong> ${Programs[State.programId].id.toUpperCase()}`;

    const container = document.getElementById('days-container'); container.innerHTML = '';
    
    blueprintData.forEach((day, dIdx) => {
        const card = document.createElement('div'); card.className = 'day-accordion';
        card.innerHTML = `<div class="day-header" onclick="this.nextElementSibling.classList.toggle('open')"><h3>${day.title}</h3></div><div class="day-body"></div>`;
        const body = card.querySelector('.day-body');

        day.ex.forEach((e, eIdx) => {
            let sets = parseInt(e[1].split('x')[0]) || 3;
            let targetReps = e[1].split('x')[1] || "10";
            let rows = ''; 
            const exKeyClean = e[0].replace(/\s/g,'');
            
            // Check Auto-Regulation Engine for overloaded weight placeholder
            const isOverloaded = State.overloads[`w${State.week}_${exKeyClean}`];
            const overloadBadge = isOverloaded ? `<span class="badge overload">+2.5 OVERLOAD</span>` : '';

            for(let s=1; s<=sets; s++){
                const k = `w${State.week}_d${dIdx}_${exKeyClean}_s${s}`;
                const l = State.logs[k] || {w:'',r:'', rir:'', done:false};
                
                let rVal = l.r !== '' ? parseInt(l.r) : parseInt(targetReps);
                let rirVal = l.rir !== '' ? parseInt(l.rir) : 1; 

                // Pre-fill weight with +2.5 if engine triggered it (and user hasn't typed anything yet)
                let displayWeight = l.w;
                if(displayWeight === '' && isOverloaded) displayWeight = "+2.5";
                
                rows += `<tr class="${l.done ? 'done-row':''}">
                    <td class="set-idx">${s}</td>
                    <td><input type="number" step="0.5" class="log-input" style="padding:4px;width:60px;" value="${displayWeight}" placeholder="${State.unit}" onchange="window.HOS.save('${k}','w',this.value)"></td>
                    <td><input type="number" class="log-input" style="padding:4px;width:45px;" value="${rVal}" onchange="window.HOS.save('${k}','r',this.value)"></td>
                    <td><input type="number" class="log-input" style="padding:4px;width:45px;color:var(--accent-orange);" value="${rirVal}" onchange="window.HOS.save('${k}','rir',this.value)"></td>
                    <td><div class="check-btn ${l.done?'checked':''}" onclick="window.HOS.check('${k}',this,event, '${targetReps}', '${e[0]}')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div></td>
                </tr>`;
            }

            body.innerHTML += `<div class="ex-card">
                <div class="ex-title">${e[0]}</div>
                <div class="ex-meta"><span class="badge">${e[1]}</span><span class="badge">${e[2]}</span>${overloadBadge}</div>
                <table class="log-table"><tr><th>Set</th><th>Load</th><th>Reps</th><th>RIR</th><th>Log</th></tr>${rows}</table>
            </div>`;
        });
        container.appendChild(card);
    });
}

// --- 3. SYSTEMIC FATIGUE METER (MRV Analytics) ---
function renderFatigue() {
    if(!State.programId) return;
    const blueprintData = Programs[State.programId].generate(State.week);
    const volumes = { Chest:0, Back:0, Shoulders:0, Arms:0, Legs:0, Core:0 };
    
    // Tally sets done THIS WEEK
    blueprintData.forEach((day, dIdx) => {
        day.ex.forEach((e) => {
            let sets = parseInt(e[1].split('x')[0]) || 3;
            let musc = getMuscleGroup(e[0]);
            const exKeyClean = e[0].replace(/\s/g,'');
            
            for(let s=1; s<=sets; s++){
                const k = `w${State.week}_d${dIdx}_${exKeyClean}_s${s}`;
                if (State.logs[k] && State.logs[k].done) {
                    volumes[musc]++;
                }
            }
        });
    });

    const cont = document.getElementById('fatigue-meter-container');
    if(!cont) return;
    cont.innerHTML = '';
    
    let overMRV = false;

    Object.keys(volumes).forEach(m => {
        const sets = volumes[m];
        // Dr. Mike Israetel thresholds roughly applied:
        // MEV (Green): ~6-11
        // MAV (Yellow): ~12-18
        // MRV (Red): ~19+
        let color = "var(--text-muted)";
        let status = "Under-dosed";
        let pct = (sets / 25) * 100; if(pct > 100) pct = 100;
        
        if(sets >= 6 && sets <= 11) { color = "var(--accent-green)"; status = "MEV - Growing"; }
        if(sets >= 12 && sets <= 18) { color = "var(--accent-purple)"; status = "MAV - Peak Growth"; }
        if(sets >= 19) { color = "var(--accent-orange)"; status = "MRV - Overload"; overMRV = true; }
        
        cont.innerHTML += `
            <div style="font-size:0.8rem; font-weight:bold; display:flex; justify-content:space-between;">
                <span>${m}</span> <span style="color:${color}">${sets} Sets (${status})</span>
            </div>
            <div class="fatigue-bar-bg">
                <div class="fatigue-bar-fill" style="width:${pct}%; background:${color}; box-shadow: 0 0 10px ${color}"></div>
            </div>
        `;
    });

    // Deload Bubble Engine Integration
    const deloadAlert = document.getElementById('deload-warning');
    if(overMRV) {
        deloadAlert.style.display = "block";
    } else {
        deloadAlert.style.display = "none";
    }
}

function renderDashboard() {
    renderFatigue();
    // Re-bind toggle logic
    document.getElementById('unit-kg').classList.toggle('active', State.unit === 'kg');
    document.getElementById('unit-lbs').classList.toggle('active', State.unit === 'lbs');
}

// --- BOOT SEQUENCE ---
document.getElementById('auth-form').onsubmit = (e) => {
    e.preventDefault();
    document.getElementById('auth-gate').style.display = 'none';
    
    if(!State.programId) {
        // Launch Onboarding Wizard if no program exists
        document.getElementById('onboarding-wizard').style.display = 'flex';
    } else {
        document.getElementById('app-core').style.display = 'block';
        document.getElementById('app-nav').style.display = 'flex';
        renderDashboard();
    }
};

document.getElementById('auth-toggle').onclick = () => {
    const btn = document.getElementById('auth-btn');
    btn.innerText = btn.innerText === "Initialize Connection" ? "Create Profile" : "Initialize Connection";
};
