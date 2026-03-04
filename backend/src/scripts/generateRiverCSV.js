const fs = require("fs");

const locations = [
  "Minuwangoda",
  "Gampaha",
  "Ja-Ela",
  "Negombo"
];

const startDate = new Date("2024-01-01");
const endDate = new Date("2025-12-31");

function simulateRiverLevel(month) {
  if (month >= 5 && month <= 9) return 3 + Math.random() * 2; // high
  if ([3,4,10,11].includes(month)) return 2 + Math.random() * 1.5;
  return 1 + Math.random() * 1.2;
}

let csv = "location,level,normalThreshold,alertThreshold,criticalThreshold,recordedAt\n";

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const month = d.getMonth() + 1;

  locations.forEach(loc => {
    const level = simulateRiverLevel(month).toFixed(2);

    csv += `${loc},${level},2.0,3.0,3.8,${d.toISOString()}\n`;
  });
}

fs.writeFileSync("river_2years_attanagalu.csv", csv);

console.log("✅ River CSV generated: river_2years_attanagalu.csv");