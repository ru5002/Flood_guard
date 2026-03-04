const fs = require("fs");

const locations = [
  "Minuwangoda",
  "Gampaha",
  "Ja-Ela",
  "Negombo"
];

const startDate = new Date("2024-01-01");
const endDate = new Date("2025-12-31");

function getMonsoonRainfall(month) {
  // Southwest monsoon: May–September
  if (month >= 5 && month <= 9) {
    return Math.random() * 80; // heavy
  }
  // Inter-monsoon: March–April, Oct–Nov
  if ([3,4,10,11].includes(month)) {
    return Math.random() * 50;
  }
  // Dry season
  return Math.random() * 20;
}

let csv = "location,temperature,humidity,pressure,rainfall,recordedAt,source\n";

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const month = d.getMonth() + 1;

  locations.forEach(loc => {
    const rainfall = getMonsoonRainfall(month).toFixed(2);

    const temperature = (26 + Math.random() * 6).toFixed(1);
    const humidity = (65 + Math.random() * 30).toFixed(0);
    const pressure = (1000 + Math.random() * 10).toFixed(0);

    csv += `${loc},${temperature},${humidity},${pressure},${rainfall},${d.toISOString()},Simulated\n`;
  });
}

fs.writeFileSync("weather_2years_attanagalu.csv", csv);

console.log("✅ Weather CSV generated: weather_2years_attanagalu.csv");