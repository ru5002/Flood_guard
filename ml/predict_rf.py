"""
FloodGuard Random Forest live prediction entrypoint.

Loads the trained Random Forest model bundle from ml/models and predicts
flood-risk categories for the next two days using recent water-level and
rainfall history supplied by the Node.js backend.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "floodguard_rf_model.joblib"
RISK_TEXT = {
    "None": "No significant flood risk at Dunamale.",
    "Low": "Low flood risk; continue routine monitoring.",
    "Moderate": "Moderate flood risk; monitor river levels closely.",
    "High": "High flood risk; prepare for possible flooding.",
    "Critical": "Critical flood risk; immediate action is advised.",
}


def parse_date(value: str | None) -> pd.Timestamp:
    if not value:
        return pd.Timestamp(datetime.now())
    return pd.Timestamp(datetime.fromisoformat(value.replace("Z", "+00:00"))).tz_localize(None)


def risk_from_level(level_m: float) -> str:
    if level_m >= 2.5:
        return "Critical"
    if level_m >= 2.0:
        return "High"
    if level_m >= 1.5:
        return "Moderate"
    if level_m >= 1.0:
        return "Low"
    return "None"


def features_from_history(
    levels: list[float],
    rainfall: list[float],
    target_date: pd.Timestamp,
    feature_names: list[str],
) -> pd.DataFrame:
    recent = np.array(levels[-14:], dtype=float)
    recent_rain = np.array(rainfall[-14:], dtype=float)
    current_level = float(recent[-1])
    current_rain = float(recent_rain[-1])
    current_temp = 28.0
    row: dict[str, float] = {
        "current_level": current_level,
        "mean_3d": float(np.mean(recent[-3:])),
        "mean_7d": float(np.mean(recent[-7:])),
        "mean_14d": float(np.mean(recent)),
        "max_7d": float(np.max(recent[-7:])),
        "min_7d": float(np.min(recent[-7:])),
        "std_7d": float(np.std(recent[-7:])),
        "trend_3d": current_level - float(recent[-3]),
        "trend_7d": current_level - float(recent[-7]),
        "rain_current": current_rain,
        "rain_3d": float(np.sum(recent_rain[-3:])),
        "rain_7d": float(np.sum(recent_rain[-7:])),
        "rain_14d": float(np.sum(recent_rain)),
        "rain_mean_7d": float(np.mean(recent_rain[-7:])),
        "rain_max_7d": float(np.max(recent_rain[-7:])),
        "rain_anomaly": 0.0,
        "rain_1month": float(np.sum(recent_rain)),
        "rain_3month": float(np.sum(recent_rain)),
        "rainfall_percentile": 50.0,
        "level_rain_interaction": current_level * float(np.sum(recent_rain[-7:])),
        "climate_available": 0.0,
        "climate_precip_current": current_rain,
        "climate_precip_3d": float(np.sum(recent_rain[-3:])),
        "climate_precip_7d": float(np.sum(recent_rain[-7:])),
        "climate_precip_14d": float(np.sum(recent_rain)),
        "temp_max_c": current_temp,
        "temp_min_c": current_temp,
        "temp_mean_c": current_temp,
        "temp_range_c": 0.0,
        "month_sin": float(np.sin(2 * np.pi * target_date.month / 12)),
        "month_cos": float(np.cos(2 * np.pi * target_date.month / 12)),
        "day_sin": float(np.sin(2 * np.pi * target_date.dayofyear / 366)),
        "day_cos": float(np.cos(2 * np.pi * target_date.dayofyear / 366)),
    }

    for offset, value in enumerate(recent, start=1):
        row[f"lag_{14 - offset + 1}d"] = float(value)

    return pd.DataFrame([{name: row.get(name, 0.0) for name in feature_names}])


def predict_next_days(records: list[dict], days: int = 2) -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Trained Random Forest model not found. Run: python ml/train.py")

    bundle = joblib.load(MODEL_PATH)
    feature_names = bundle["featureNames"]
    labels = bundle["riskLabels"]
    classifier = bundle["classifier"]
    regressor = bundle["regressor"]

    ordered = sorted(records, key=lambda item: parse_date(item.get("date") or item.get("recordedAt")))
    levels = [
        float(item.get("water_level", item.get("levelMeters", item.get("level", 0))))
        for item in ordered
    ]
    rainfall = [
        float(item.get("rainfall", item.get("rainfall_mm_day", item.get("rainfallMm", 0))))
        for item in ordered
    ]
    levels = [level for level in levels if level >= 0]
    if len(levels) < bundle["lookbackDays"]:
        raise ValueError(f"At least {bundle['lookbackDays']} recent water-level records are required.")
    if len(rainfall) < len(levels):
        rainfall = ([0.0] * (len(levels) - len(rainfall))) + rainfall

    last_date = parse_date(ordered[-1].get("date") or ordered[-1].get("recordedAt"))
    result = {
        "location": "Dunamale",
        "district": "Gampaha",
        "predictionWindow": f"Next {days} days",
        "modelVersion": bundle["modelVersion"],
        "source": "ml_model",
    }

    for day in range(1, days + 1):
        target_date = last_date + timedelta(days=day)
        x_live = features_from_history(levels, rainfall, target_date, feature_names)
        class_probs = classifier.predict_proba(x_live)[0]
        class_index = int(np.argmax(class_probs))
        predicted_level = max(0.0, float(regressor.predict(x_live)[0]))
        risk_level = labels[class_index] if class_index < len(labels) else risk_from_level(predicted_level)
        confidence = round(float(class_probs[class_index]) * 100, 1)

        result[f"day{day}"] = {
            "date": target_date.strftime("%Y-%m-%d"),
            "predictedWaterLevel": round(predicted_level, 3),
            "riskLevel": risk_level,
            "confidence": confidence,
            "prediction": RISK_TEXT[risk_level],
            "probabilities": {
                labels[i]: round(float(prob) * 100, 1)
                for i, prob in enumerate(class_probs)
            },
        }
        levels.append(predicted_level)
        rainfall.append(float(rainfall[-1]) if rainfall else 0.0)

    return result


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "[]")
        if not isinstance(payload, list):
            raise ValueError("Input must be a JSON array of recent readings.")
        print(json.dumps(predict_next_days(payload)))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
