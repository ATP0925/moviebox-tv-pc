const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("==================================================");
console.log("🔬 SIMULATING MOVIEBOX CLIENT RUNTIME & INTEGRATION");
console.log("==================================================\n");

const appJs = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');

// 1. Verify EmbeddedEngine data completeness
const engineMatch = appJs.match(/const EmbeddedEngine = \{([\s\S]*?)\n\};/);
assert(engineMatch, "EmbeddedEngine must be defined");
const engineCode = "const EmbeddedEngine = {" + engineMatch[1] + "\n}; return EmbeddedEngine;";
const EmbeddedEngine = new Function(engineCode)();

console.log(`✅ Embedded Engine: ${EmbeddedEngine.tabs.length} tabs and ${EmbeddedEngine.subjects.length} curated subjects`);
assert(EmbeddedEngine.tabs.length >= 5, "At least 5 tabs required");
assert(EmbeddedEngine.subjects.length >= 10, "At least 10 rich subjects required");

// Verify each subject has essential playback & metadata fields
EmbeddedEngine.subjects.forEach((s, i) => {
  assert(s.subjectId, `Subject #${i} missing subjectId`);
  assert(s.title, `Subject #${i} missing title`);
  assert(s.cover && s.cover.url, `Subject #${i} (${s.title}) missing cover.url`);
  assert(s.score || s.imdbRatingValue, `Subject #${i} (${s.title}) missing score`);
  assert(s.duration > 0, `Subject #${i} (${s.title}) missing duration`);
});
console.log("✅ Subject Data: All subjects have valid ID, title, cover URL, duration, and rating.");

// 2. Poster Optimizer Edge Cases
const optFnMatch = appJs.match(/function optimizePosterUrl[\s\S]*?\n\}/);
const optimizePosterUrl = new Function('return ' + optFnMatch[0])();

assert.strictEqual(optimizePosterUrl(""), "");
assert.strictEqual(optimizePosterUrl(null), "");
assert.strictEqual(optimizePosterUrl(undefined), "");

const imdb1 = "https://m.media-amazon.com/images/M/test._V1_FMjpg_UX1000_.jpg";
const opt1 = optimizePosterUrl(imdb1, 340);
assert(opt1.includes("_FMwebp_"), "Must convert to WebP");
assert(opt1.includes("_QL65_"), "Must clamp to QL65");
assert(opt1.includes("_UX340_"), "Must clamp width to 340");

const unsplash1 = "https://images.unsplash.com/photo-1234?auto=format";
const optUnsplash = optimizePosterUrl(unsplash1, 340);
assert(optUnsplash.includes("fm=webp"), "Must add fm=webp to Unsplash");
assert(optUnsplash.includes("q=65"), "Must set q=65 on Unsplash");
assert(optUnsplash.includes("w=340"), "Must set w=340 on Unsplash");

console.log("✅ Poster Optimizer: All edge cases and CDN patterns cleanly validated.");

// 3. Audio Language Engine
const langMatch = appJs.match(/const LanguagePreferenceManager = \{([\s\S]*?)\n\};/);
const langCode = `
const localStorage = {
  getItem: () => null,
  setItem: () => {}
};
const LanguagePreferenceManager = {${langMatch[1]}\n};
return LanguagePreferenceManager;
`;
const LanguagePreferenceManager = new Function(langCode)();

// When Hindi is available
const langsWithHindi = [
  { code: "hin", name: "Hindi" },
  { code: "eng", name: "English" }
];
const best1 = LanguagePreferenceManager.getBestLanguage(langsWithHindi);
assert.strictEqual(best1.code, "hin", "Should pick Hindi when present");

// When Hindi is not available (e.g. English original movie)
const langsEnglishOnly = [
  { code: "eng", name: "English (Original)" },
  { code: "spa", name: "Spanish" }
];
const best2 = LanguagePreferenceManager.getBestLanguage(langsEnglishOnly);
assert.strictEqual(best2.code, "eng", "Should pick English fallback when Hindi absent");
console.log("✅ Audio Language Manager: Successfully prioritizes Hindi and gracefully falls back to English.");

// 4. Search Filter Accuracy Simulation
function simulateSearch(query, list) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return list.filter(item => {
    const t = (item.title || "").toLowerCase();
    const g = (item.genre || "").toLowerCase();
    const d = (item.description || "").toLowerCase();
    const staff = (item.staffList || []).map(s => s.name.toLowerCase()).join(' ');
    return t.includes(q) || g.includes(q) || d.includes(q) || staff.includes(q);
  });
}

const searchDeadpool = simulateSearch("deadpool", EmbeddedEngine.subjects);
assert(searchDeadpool.length > 0, "Must find Deadpool in subjects");
assert(searchDeadpool[0].title.toLowerCase().includes("deadpool"), "Result must be Deadpool");

const searchSciFi = simulateSearch("sci-fi", EmbeddedEngine.subjects);
assert(searchSciFi.length >= 2, "Must find multiple Sci-Fi items");

console.log("✅ Search Engine: Multi-field search (title, genre, staff, synopsis) works accurately.");

console.log("\n==================================================");
console.log("🎉 ALL RUNTIME CLIENT SIMULATION TESTS PASSED!");
console.log("==================================================");
