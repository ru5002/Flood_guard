import json
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
PREDICT_SCRIPT = BASE_DIR / "ml" / "predict_rf.py"

payload = [
    {
        "date": f"2026-05-{day:02d}",
        "water_level": 3.0 + (day * 0.03),
        "rainfall": 2.5 if day % 3 else 8.0,
        "temperature": 27.5,
        "humidity": 88,
        "wind_speed": 12,
    }
    for day in range(1, 15)
]

result = subprocess.run(
    [sys.executable, str(PREDICT_SCRIPT)],
    input=json.dumps(payload),
    text=True,
    capture_output=True,
    cwd=str(BASE_DIR),
    timeout=60,
)

if result.returncode != 0:
    print("FAIL ML smoke test")
    print(result.stderr)
    sys.exit(result.returncode)

prediction = json.loads(result.stdout)
required_keys = {"location", "district", "modelVersion", "day1", "day2"}
missing = required_keys - set(prediction)

if missing:
    print(f"FAIL ML smoke test: missing keys {sorted(missing)}")
    sys.exit(1)

if "rf-" not in prediction["modelVersion"]:
    print(f"FAIL ML smoke test: expected Random Forest model, got {prediction['modelVersion']}")
    sys.exit(1)

print("PASS ML smoke test")
print(json.dumps({
    "modelVersion": prediction["modelVersion"],
    "day1Risk": prediction["day1"]["riskLevel"],
    "day2Risk": prediction["day2"]["riskLevel"],
}, indent=2))
