// generate-info.js
const fs = require("fs");
const path = require("path");

const songsFolder = path.join(__dirname, "songs");
const outputFile = path.join(songsFolder, "info.json");

// Make sure the songs folder exists
if (!fs.existsSync(songsFolder)) {
    fs.mkdirSync(songsFolder);
    console.log("Created songs folder.");
}

// Read all mp3 files in the songs folder
const songs = fs.readdirSync(songsFolder)
    .filter(file => file.toLowerCase().endsWith(".mp3"));

// Write info.json
fs.writeFileSync(outputFile, JSON.stringify({ songs }, null, 2));
console.log("✅ info.json generated with songs:", songs);
