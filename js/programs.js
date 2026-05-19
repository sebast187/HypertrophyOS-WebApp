// js/programs.js

const wA = (days) => days.map(d => ({ title: d[0], ex: d[1] }));

// Meta tagging for Fatigue Meter and Swap Dropdowns
export function getExerciseMeta(name) {
    let n = name.toLowerCase(); 
    let mus = "Core", mod = "Machine";
    
    if(n.includes("cable") || n.includes("pulldown") || n.includes("pushdown") || n.includes("face pull")) mod = "Cable";
    if(n.includes("db ") || n.includes("barbell") || n.includes("arnold")) mod = "Free Weight";

    if(n.includes("press") || n.includes("fly") || n.includes("pec") || n.includes("dip")) mus = "Chest";
    if(n.includes("shoulder") || n.includes("lateral") || n.includes("raise")) mus = "Shoulders";
    if(n.includes("lat ") || n.includes("row") || n.includes("pull") || n.includes("back")) mus = "Back";
    if(n.includes("curl") || n.includes("ext") || n.includes("pushdown") || n.includes("skullcrusher")) mus = "Arms";
    if(n.includes("leg") || n.includes("squat") || n.includes("calf") || n.includes("glute") || n.includes("deadlift")) mus = "Legs";
    
    return { muscle: mus, modality: mod };
}

// Master Exercise Database for Swap Dropdowns
export const ExerciseDB = [
    "Barbell Squat", "Hack Squat", "Leg Press", "Lying Leg Curls", "Seated Leg Curls", "Standing Calf Raises", "Romanian Deadlift",
    "Machine Chest Press", "Incline Machine Press", "Barbell Bench Press", "Incline DB Press", "Cable Chest Flys",
    "Machine Shoulder Press", "Overhead Press", "Cable Lateral Raises", "DB Lateral Raises",
    "Wide Lat Pulldowns", "Underhand Lat Pulldown", "Seated Cable Rows", "Chest Supported Row", "Barbell Row",
    "Bicep Curls", "Machine Preacher Curls", "Preacher Curls", "Tricep Rope Pushdowns", "Skullcrushers", "Overhead Cable Ext",
    "Cable Crunches", "Face Pulls"
];

export const Programs = {
    foundation: {
        id: 'foundation',
        generate: (week) => wA([
            ["Day 1: Full Body A", [
                ["Barbell Squat", "3x8", "Tempo: 3s ↓"], ["Machine Chest Press", "3x10", "Tempo: 3s ↓"],
                ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"], ["Cable Lateral Raises", "2x12", "Tempo: 3s ↓"]
            ]],
            ["Day 2: Full Body B", [
                ["Romanian Deadlift", "3x8", "Tempo: 3s ↓"], ["Overhead Press", "3x10", "Tempo: 3s ↓"],
                ["Seated Cable Rows", "3x10", "Tempo: 3s ↓"], ["Tricep Rope Pushdowns", "2x12", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Full Body C", [
                ["Leg Press", "3x10", "Tempo: 3s ↓"], ["Incline Machine Press", "3x10", "Tempo: 3s ↓"],
                ["Chest Supported Row", "3x10", "Tempo: 3s ↓"], ["Bicep Curls", "2x12", "Tempo: 3s ↓"]
            ]]
        ])
    },
    titan: {
        id: 'titan',
        generate: (week) => wA([
            ["Day 1: Heavy Lower", [
                ["Barbell Squat", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"], ["Leg Press", "3x10", "Tempo: 2s ↓"],
                ["Lying Leg Curls", "3x12", "Tempo: 3s ↓"], ["Standing Calf Raises", "3x15", "Explosive"]
            ]],
            ["Day 2: Heavy Upper", [
                ["Barbell Bench Press", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"], ["Barbell Row", "3x8", "RPE 8"],
                ["Machine Shoulder Press", "3x10", "Tempo: 2s ↓"], ["Skullcrushers", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Volume Lower", [
                ["Romanian Deadlift", week % 4 === 0 ? "1x1" : "3x5", "RPE 8"], ["Hack Squat", "3x10", "Tempo: 3s ↓"],
                ["Seated Leg Curls", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 4: Volume Upper", [
                ["Incline DB Press", "3x10", "Tempo: 3s ↓"], ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"],
                ["Cable Lateral Raises", "4x12", "Tempo: 3s ↓"], ["Preacher Curls", "3x12", "Tempo: 3s ↓"]
            ]]
        ])
    },
    os: {
        id: 'os',
        generate: (week) => wA([
            ["Day 1: Push Matrix", [
                ["Machine Chest Press", "3x10", "Tempo: 3s ↓"], ["Machine Shoulder Press", "3x10", "Tempo: 3s ↓"],
                ["Cable Lateral Raises", "3x12", "Tempo: 3s ↓"], ["Tricep Rope Pushdowns", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 2: Pull Matrix", [
                ["Wide Lat Pulldowns", "3x10", "Tempo: 3s ↓"], ["Seated Cable Rows", "3x10", "Tempo: 3s ↓"],
                ["Machine Preacher Curls", "3x12", "Tempo: 3s ↓"], ["Cable Crunches", "3x15", "Tempo: 3s ↓"]
            ]],
            ["Day 3: Leg Matrix", [
                ["Hack Squat", "3x10", "Tempo: 3s ↓"], ["Leg Press", "3x10", "Tempo: 3s ↓"],
                ["Lying Leg Curls", "3x12", "Tempo: 3s ↓"], ["Standing Calf Raises", "3x15", "Tempo: 3s ↓"]
            ]],
            ["Day 4: Push Matrix II", [
                ["Incline Machine Press", "3x10", "Tempo: 3s ↓"], ["Cable Chest Flys", "3x12", "Tempo: 3s ↓"],
                ["Overhead Cable Ext", "3x12", "Tempo: 3s ↓"]
            ]],
            ["Day 5: Pull Matrix II", [
                ["Underhand Lat Pulldown", "3x10", "Tempo: 3s ↓"], ["Chest Supported Row", "3x10", "Tempo: 3s ↓"],
                ["Face Pulls", "3x15", "Tempo: 3s ↓"]
            ]]
        ])
    }
};
