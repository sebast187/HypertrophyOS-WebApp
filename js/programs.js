// js/programs.js

const wA = (days) => days.map(d => ({ title: d[0], ex: d[1] }));

// Meta tagging for the Fatigue Meter tracking
export function getMuscleGroup(name) {
    let n = name.toLowerCase();
    if(n.includes("press") || n.includes("fly") || n.includes("pec") || n.includes("dip")) return "Chest";
    if(n.includes("shoulder") || n.includes("lateral") || n.includes("raise")) return "Shoulders";
    if(n.includes("lat ") || n.includes("row") || n.includes("pull") || n.includes("back")) return "Back";
    if(n.includes("curl") || n.includes("ext") || n.includes("pushdown") || n.includes("skullcrusher")) return "Arms";
    if(n.includes("leg") || n.includes("squat") || n.includes("calf") || n.includes("glute") || n.includes("deadlift")) return "Legs";
    return "Core";
}

export const Programs = {
    // 3-Day Full Body: Focus on Systemic MRV
    foundation: {
        id: 'foundation',
        weeks: 12,
        generate: (week) => wA([
            ["Day 1: Full Body A", [
                ["Barbell Squat", "3x8", "Tempo: 3s ↓"],
                ["Machine Chest Press", "3x10", "Tempo: 3s ↓"],
                ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"],
                ["Cable Lateral Raises", "2x12", "Tempo: 3s ↓"]
            ]],
            ["Day 2: Full Body B", [
                ["Romanian Deadlift", "3x8", "Tempo: 3s ↓"],
                ["Overhead Press", "3x10", "Tempo: 3s ↓"],
                ["Seated Cable Rows", "3x10", "Tempo: 3s ↓"],
                ["Tricep Rope Pushdowns", "2x12", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Full Body C", [
                ["Leg Press", "3x10", "Tempo: 3s ↓"],
                ["Incline Machine Press", "3x10", "Tempo: 3s ↓"],
                ["Chest Supported Row", "3x10", "Tempo: 3s ↓"],
                ["Bicep Curls", "2x12", "Tempo: 3s ↓"]
            ]]
        ])
    },
    // 4-Day SBD Focus: Auto-Regulated RPE/Singles
    titan: {
        id: 'titan',
        weeks: 16,
        generate: (week) => wA([
            ["Day 1: Heavy Lower", [
                ["Barbell Squat", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"],
                ["Leg Press", "3x10", "Tempo: 2s ↓"],
                ["Lying Leg Curls", "3x12", "Tempo: 3s ↓"],
                ["Standing Calf Raises", "3x15", "Explosive"]
            ]],
            ["Day 2: Heavy Upper", [
                ["Barbell Bench Press", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"],
                ["Barbell Row", "3x8", "RPE 8"],
                ["Machine Shoulder Press", "3x10", "Tempo: 2s ↓"],
                ["Skullcrushers", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Volume Lower", [
                ["Deadlift", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"],
                ["Hack Squat", "3x10", "Tempo: 3s ↓"],
                ["Seated Leg Curls", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 4: Volume Upper", [
                ["Incline DB Press", "3x10", "Tempo: 3s ↓"],
                ["Lat Pulldowns", "3x10", "Tempo: 3s ↓"],
                ["Cable Lateral Raises", "4x12", "Tempo: 3s ↓"],
                ["Preacher Curls", "3x12", "Tempo: 3s ↓"]
            ]]
        ])
    },
    // The Original 5-Day Split
    os: {
        id: 'os',
        weeks: 24,
        generate: (week) => wA([
            ["Day 1: Push Matrix", [
                ["Converging Machine Press", "3x10", "Tempo: 3s ↓"],
                ["Machine Shoulder Press", "3x10", "Tempo: 3s ↓"],
                ["Cable Lateral Raises", "3x12", "Tempo: 3s ↓"],
                ["Tricep Rope Pushdowns", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 2: Pull Matrix", [
                ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"],
                ["Seated Cable Rows", "3x10", "Tempo: 3s ↓"],
                ["Machine Preacher Curls", "3x12", "Tempo: 3s ↓"],
                ["Cable Crunches", "3x15", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Leg Matrix", [
                ["Hack Squat", "3x10", "Tempo: 3s ↓"],
                ["Leg Press", "3x10", "Tempo: 3s ↓"],
                ["Lying Leg Curls", "3x12", "Tempo: 3s ↓"],
                ["Standing Calf Raises", "3x15", "Tempo: 3s ↓"]
            ]],
            ["Day 4: Push Matrix II", [
                ["Incline Machine Press", "3x10", "Tempo: 3s ↓"],
                ["Cable Chest Flys", "3x12", "Tempo: 3s ↓"],
                ["Overhead Cable Ext", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 5: Pull Matrix II", [
                ["Underhand Lat Pulldown", "3x10", "Tempo: 3s ↓"],
                ["Chest Supported DB Row", "3x10", "Tempo: 3s ↓"],
                ["Face Pulls", "3x15", "Tempo: 3s ↓"]
            ]]
        ])
    }
};
