export const MonthlyIntel = {
    1: { top: "Welcome to Hypertrophy OS. This month is about laying the foundation using rigid machine paths to master tension.", bot: "Coach's Note: Don't chase weight yet, chase tension. Focus entirely on the strict 3-second eccentric." },
    2: { top: "Frequency Shift. We transition to a 5-day split hitting legs twice to balance upper/lower volume and stability.", bot: "Coach's Note: You will be sorer this month due to frequency. Feed the machine with adequate protein and sleep." },
    3: { top: "Volume Accumulation. Sets increase for compound lifts. We are pushing the total tonnage up significantly with Supersets.", bot: "Coach's Note: Monitor your sleep carefully. High volume demands extreme recovery. No junk sets." },
    4: { top: "Heavy Tension & Isometrics. Reps drop, weight goes up. We are maximizing mechanical tension and using 4-second negatives.", bot: "Coach's Note: Take longer rests (90-120s) between heavy sets. Let your ATP completely replenish." },
    5: { top: "Pre-Exhaust Phase. Isolate the muscle first, then hit the compound. Make 50kg feel like 100kg.", bot: "Coach's Note: Your ego will take a hit on the compound lifts because you are pre-fatigued. Let it." },
    6: { top: "The Drop Zone. We push past failure on the final sets using Drop Sets and Rest-Pause. Peak metabolic stress.", bot: "Coach's Note: Leave absolutely nothing in the tank this month. You will deload after Week 24." }
};

export const WeeklyGoals = {
    1: "Foundation: 3-Second Eccentrics on every rep to trigger mTORC1.",
    2: "Stability Check: Maintain perfect tension throughout cable movements.",
    3: "Volume Accumulation: 4 sets per compound. Push closer to failure.",
    4: "Heavy Loads: Decrease reps, increase weight. Maximize mechanical tension.",
    5: "Cable Mastery: Perfect tension on the cables. Control the eccentric.",
    6: "Mind-Muscle Sync: Do not drop the weight. Hold the stretch.",
    7: "Unilateral Focus: Isolate each limb to fix strength imbalances.",
    8: "Burnout Week: High reps to close out the stability block.",
    9: "Supersets: Zero rest between exercises. Push through the lactic acid.",
    10: "The Pump: Maximize blood flow with opposing supersets.",
    11: "Density: Complete the workload in 15% less time than week 9.",
    12: "Giant Sets: 3 exercises back to back. Total muscle fatigue.",
    13: "Time Under Tension: 4 seconds down on every single rep.",
    14: "Statue Hold: 2 second isometric hold at the bottom of the stretch.",
    15: "1.5 Rep Method: A full rep, then a half rep. Doubles the tension.",
    16: "Tempo Integration: Combine the 4s down with the 2s hold.",
    17: "Pre-Exhaust: Isolate first, then compound. Make light weight feel heavy.",
    18: "Mechanical Drop Sets: Move from harder to easier variations.",
    19: "Pause-Go: Stop all momentum at the bottom. Pure concentric power.",
    20: "Peak Volume: Highest total sets of the entire cycle. Survive.",
    21: "The Drop Zone: Triple drop sets on the final set.",
    22: "Rest-Pause: Hit failure, wait 15s, hit failure again.",
    23: "Centurion: 100 total reps on the final movement of the day.",
    24: "Victory Lap: Heaviest week. Test your 6-month strength gains."
};

const wA = (d1, d2, d3, d4, d5) => ([
    { title: "Day 1: Push Matrix", ex: d1 }, { title: "Day 2: Pull Matrix", ex: d2 }, 
    { title: "Day 3: Leg Matrix", ex: d3 }, { title: "Day 4: Push Matrix II", ex: d4 }, 
    { title: "Day 5: Pull Matrix II", ex: d5 }
]);

const wB = (d1, d2, d3, d4, d5) => ([
    { title: "Day 1: Push Matrix", ex: d1 }, { title: "Day 2: Pull Matrix", ex: d2 }, 
    { title: "Day 3: Lower Matrix", ex: d3 }, { title: "Day 4: Upper Matrix", ex: d4 }, 
    { title: "Day 5: Full Body Integration", ex: d5 }
]);

export const Programs = {
    "5-Day OS": function() {
        const bp = {};
        for(let i=1; i<=24; i++) {
            let t = "Tempo: 3s ↓"; let cSets = "3x10"; let iSets = "3x12"; let hSets = "3x15";
            if (i >= 9 && i <= 12) { t = "Superset (No Rest)"; cSets = "4x10"; iSets = "4x12"; hSets = "3x15"; } 
            if (i >= 13 && i <= 16) { t = "Tempo: 4s ↓, 2s Hold"; cSets = "3x8"; iSets = "3x10"; hSets = "3x12"; } 
            if (i >= 17 && i <= 20) { t = "Pre-Exhaust"; cSets = "4x12"; iSets = "4x15"; hSets = "4x15"; } 
            if (i >= 21 && i <= 24) { t = "Drop-Set to Failure"; cSets = "3x8"; iSets = "3x10"; hSets = "1xMax"; } 

            if (Math.ceil(i/4) % 2 !== 0) {
                bp[i] = wA(
                    [["Converging Machine Press", cSets, t], ["Machine Shoulder Press", cSets, t], ["Cable Lateral Raises", iSets, t], ["Tricep Rope Pushdowns", iSets, t]],
                    [["Wide Lat Pulldowns", cSets, t], ["Seated Cable Rows", cSets, t], ["Machine Preacher Curls", iSets, t], ["Cable Crunches", hSets, t]],
                    [["Hack Squat", cSets, t], ["Leg Press", cSets, t], ["Lying Leg Curls", iSets, t], ["Machine Glute Drive", iSets, t], ["Standing Calf Raises", hSets, t]],
                    [["Incline Machine Press", cSets, t], ["Cable Chest Flys", iSets, t], ["Overhead Cable Ext", iSets, t], ["Seated Dip Machine", cSets, t]],
                    [["Underhand Lat Pulldown", cSets, t], ["Chest Supported DB Row", cSets, t], ["Face Pulls", hSets, t], ["Cable Hammer Curls", iSets, t]]
                );
            } else {
                bp[i] = wB(
                    [["Machine Chest Press", cSets, t], ["Arnold Press", cSets, t], ["Cable Lateral Raises", iSets, t], ["Single-Arm Pushdowns", iSets, t]],
                    [["Neutral Grip Pulldown", cSets, t], ["Seated Cable Rows", cSets, t], ["Reverse Pec Deck", iSets, t], ["Bayesian Cable Curls", iSets, t]],
                    [["Hack Squat", cSets, t], ["Single-Leg Press", cSets, t], ["Seated Leg Curls", iSets, t], ["Seated Calf Raises", hSets, t]],
                    [["Incline Machine Press", cSets, t], ["Cable Chest Flys", iSets, t], ["Wide Lat Pulldowns", cSets, t], ["Tricep Rope Pushdowns", iSets, t]],
                    [["Leg Press", cSets, t], ["Lying Leg Curls", iSets, t], ["Chest Supported DB Row", cSets, t], ["DB Bicep Curls", iSets, t]]
                );
            }
        }
        return bp;
    },
    "Titan 4-Day": function() {
        const bp = {};
        for(let i=1; i<=24; i++) {
            bp[i] = [
                { title: "Day 1: Heavy Squat & Legs", ex: [["Barbell Squat", "4x5", "RPE 8"], ["Leg Press", "3x10", "Tempo: 3s ↓"], ["Lying Leg Curls", "3x12", "Tempo: 3s ↓"], ["Seated Calf Raises", "4x15", "Pause"]] },
                { title: "Day 2: Heavy Bench & Push", ex: [["Barbell Bench Press", "4x5", "RPE 8"], ["Incline DB Press", "3x10", "Tempo: 3s ↓"], ["Machine Shoulder Press", "3x10", "Tempo: 3s ↓"], ["Tricep Rope Pushdowns", "3x12", "Squeeze"]] },
                { title: "Day 3: Heavy Deadlift & Pull", ex: [["Barbell Deadlift", "3x5", "RPE 8.5"], ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"], ["Chest Supported Row", "3x10", "Tempo: 3s ↓"], ["Machine Preacher Curls", "3x12", "Squeeze"]] },
                { title: "Day 4: Hypertrophy Accessories", ex: [["Hack Squat", "3x12", "Tempo: 4s ↓"], ["Converging Machine Press", "3x12", "Tempo: 4s ↓"], ["Cable Lateral Raises", "4x15", "Burnout"], ["Cable Crunches", "3x15", "Squeeze"]] }
            ];
        }
        return bp;
    },
    "Foundation 3-Day": function() {
        const bp = {};
        for(let i=1; i<=24; i++) {
            bp[i] = [
                { title: "Day 1: Full Body A", ex: [["Hack Squat", "3x10", "Tempo: 3s ↓"], ["Converging Machine Press", "3x10", "Tempo: 3s ↓"], ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"], ["Cable Lateral Raises", "3x12", "Squeeze"]] },
                { title: "Day 2: Full Body B", ex: [["Leg Press", "3x10", "Tempo: 3s ↓"], ["Machine Shoulder Press", "3x10", "Tempo: 3s ↓"], ["Seated Cable Rows", "3x10", "Tempo: 3s ↓"], ["Tricep Rope Pushdowns", "3x12", "Squeeze"]] },
                { title: "Day 3: Full Body C", ex: [["Lying Leg Curls", "4x12", "Tempo: 3s ↓"], ["Incline Machine Press", "3x10", "Tempo: 3s ↓"], ["Underhand Lat Pulldown", "3x10", "Tempo: 3s ↓"], ["Machine Preacher Curls", "3x12", "Squeeze"]] }
            ];
        }
        return bp;
    }
};

export function getExerciseMeta(name) {
    let n = name.toLowerCase(); let mod = "Machine"; let mus = "Core";
    if(n.includes("cable") || n.includes("pulldown") || n.includes("pushdown") || n.includes("face pull") || n.includes("rope")) mod = "Cable";
    if(n.includes("db ") || n.includes("dumbbell") || n.includes("barbell")) mod = "Free Weight";
    if(n.includes("press") || n.includes("fly") || n.includes("pec") || n.includes("dip")) mus = "Chest";
    if(n.includes("shoulder") || n.includes("lateral") || n.includes("front raise") || n.includes("arnold") || n.includes("face pull")) mus = "Shoulders";
    if(n.includes("lat ") || n.includes("row") || n.includes("pull") || n.includes("back") || n.includes("deadlift")) mus = "Back";
    if(n.includes("curl") || n.includes("ext") || n.includes("pushdown") || n.includes("skullcrusher")) mus = "Arms";
    if(n.includes("leg") || n.includes("squat") || n.includes("calf") || n.includes("glute")) mus = "Legs";
    return { muscle: mus, modality: mod };
}
