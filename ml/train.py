"""
FloodGuard Random Forest training pipeline.

The reference project uses a Random Forest classifier over flood-related
environment readings. FloodGuard's available source data is the Aththanagalu
Oya Dunamale daily water-level spreadsheet plus CHIRPS/WFP Sri Lanka rainfall
data and daily gridded climate data, so this pipeline builds hydrological,
rainfall, temperature, and seasonal features and trains fresh models from scratch.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parents[1]
ML_DIR = BASE_DIR / "ml"
RAW_DATA_PATH = BASE_DIR / "Aththanagalu Oya Hydrological Time-Series Dataset.xlsx"
RAINFALL_DATA_PATH = ML_DIR / "data" / "raw" / "lka-rainfall-subnat-full.csv"
CLIMATE_DATA_PATH = ML_DIR / "data" / "raw" / "Sri_Lanka_Climate_Data.csv"
MODEL_DIR = ML_DIR / "models"
RESULTS_DIR = ML_DIR / "results"

MODEL_PATH = MODEL_DIR / "floodguard_rf_model.joblib"
METRICS_PATH = RESULTS_DIR / "rf_metrics.json"
REPORT_PATH = RESULTS_DIR / "rf_classification_report.txt"

LOOKBACK_DAYS = 14
GAMPAHA_PCODE = "LK12"
GAMPAHA_LAT = 7.091
GAMPAHA_LON = 79.993
RISK_LABELS = ["None", "Low", "Moderate", "High", "Critical"]


def risk_index(level_m: float) -> int:
    if level_m >= 2.5:
        return 4
    if level_m >= 2.0:
        return 3
    if level_m >= 1.5:
        return 2
    if level_m >= 1.0:
        return 1
    return 0


def load_water_levels() -> pd.DataFrame:
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {RAW_DATA_PATH}")

    raw = pd.read_excel(RAW_DATA_PATH, sheet_name="DUNAMALE", header=None)
    header_row = raw.index[raw.apply(lambda row: row.astype(str).str.contains("YEAR", case=False).any(), axis=1)][0]
    df = pd.read_excel(RAW_DATA_PATH, sheet_name="DUNAMALE", header=header_row)
    df = df.dropna(axis=1, how="all")
    df.columns = [
        str(col).strip().lower().replace(" ", "_").replace(".", "").replace("(", "").replace(")", "")
        for col in df.columns
    ]

    level_col = next((col for col in df.columns if "water_level" in col), None)
    if not level_col:
        raise ValueError(f"Could not find water level column. Columns: {list(df.columns)}")

    df = df.rename(columns={"date": "day", level_col: "water_level"})
    df["date"] = pd.to_datetime(df[["year", "month", "day"]], errors="coerce")
    df["water_level"] = pd.to_numeric(df["water_level"], errors="coerce")
    df = df.dropna(subset=["date", "water_level"])
    df = df[df["water_level"] >= 0]
    df = df.drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)
    return df[["date", "water_level"]]


def load_daily_rainfall(date_index: pd.Series) -> pd.DataFrame:
    if not RAINFALL_DATA_PATH.exists():
        raise FileNotFoundError(f"Rainfall dataset not found: {RAINFALL_DATA_PATH}")

    rainfall = pd.read_csv(RAINFALL_DATA_PATH)
    rainfall.columns = rainfall.columns.str.strip()
    rainfall = rainfall[(rainfall["adm_level"] == 2) & (rainfall["PCODE"].astype(str).str.upper() == GAMPAHA_PCODE)]
    if rainfall.empty:
        raise ValueError(f"No rainfall rows found for Gampaha PCODE {GAMPAHA_PCODE}.")

    rainfall["date"] = pd.to_datetime(rainfall["date"], errors="coerce")
    rainfall = rainfall.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    rainfall["rfh"] = pd.to_numeric(rainfall["rfh"], errors="coerce").fillna(0)
    rainfall["rfh_avg"] = pd.to_numeric(rainfall["rfh_avg"], errors="coerce")
    rainfall["r1h"] = pd.to_numeric(rainfall["r1h"], errors="coerce")
    rainfall["r3h"] = pd.to_numeric(rainfall["r3h"], errors="coerce")
    rainfall["rfq"] = pd.to_numeric(rainfall["rfq"], errors="coerce")

    next_date = rainfall["date"].shift(-1)
    period_days = (next_date - rainfall["date"]).dt.days.fillna(10).clip(lower=1, upper=15)
    rainfall["rainfall_mm_day"] = rainfall["rfh"] / period_days
    rainfall["rainfall_anomaly_mm"] = rainfall["rfh"] - rainfall["rfh_avg"].fillna(rainfall["rfh"])

    start = pd.Timestamp(date_index.min())
    end = pd.Timestamp(date_index.max())
    daily = pd.DataFrame({"date": pd.date_range(start, end, freq="D")})
    daily = pd.merge_asof(
        daily.sort_values("date"),
        rainfall[
            [
                "date",
                "rainfall_mm_day",
                "rainfall_anomaly_mm",
                "r1h",
                "r3h",
                "rfq",
            ]
        ].sort_values("date"),
        on="date",
        direction="backward",
    )
    daily = daily.fillna(0)
    return daily


def load_daily_climate(date_index: pd.Series) -> pd.DataFrame:
    start = pd.Timestamp(date_index.min())
    end = pd.Timestamp(date_index.max())
    daily = pd.DataFrame({"date": pd.date_range(start, end, freq="D")})

    if not CLIMATE_DATA_PATH.exists():
        daily["climate_available"] = 0
        daily["climate_precip_mm"] = 0.0
        daily["temp_max_c"] = 0.0
        daily["temp_min_c"] = 0.0
        daily["temp_mean_c"] = 0.0
        return daily

    climate = pd.read_csv(CLIMATE_DATA_PATH)
    climate["date"] = pd.to_datetime(climate["date"], errors="coerce", utc=True).dt.tz_convert(None).dt.normalize()
    climate = climate.dropna(subset=["date", "latitude", "longitude"])

    coords = climate[["latitude", "longitude"]].drop_duplicates().copy()
    coords["distance"] = (coords["latitude"] - GAMPAHA_LAT) ** 2 + (coords["longitude"] - GAMPAHA_LON) ** 2
    nearest = coords.sort_values("distance").iloc[0]
    climate = climate[
        (climate["latitude"] == nearest["latitude"]) &
        (climate["longitude"] == nearest["longitude"])
    ].copy()

    for column in ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"]:
        climate[column] = pd.to_numeric(climate[column], errors="coerce")

    climate = climate.rename(
        columns={
            "temperature_2m_max": "temp_max_c",
            "temperature_2m_min": "temp_min_c",
            "precipitation_sum": "climate_precip_mm",
        }
    )
    climate["temp_mean_c"] = (climate["temp_max_c"] + climate["temp_min_c"]) / 2
    climate["climate_available"] = 1

    daily = daily.merge(
        climate[["date", "climate_available", "climate_precip_mm", "temp_max_c", "temp_min_c", "temp_mean_c"]],
        on="date",
        how="left",
    )
    daily["climate_available"] = daily["climate_available"].fillna(0)
    for column in ["climate_precip_mm", "temp_max_c", "temp_min_c", "temp_mean_c"]:
        daily[column] = daily[column].ffill().bfill().fillna(0)

    return daily


def merge_hydro_rainfall(water_levels: pd.DataFrame) -> pd.DataFrame:
    rainfall = load_daily_rainfall(water_levels["date"])
    climate = load_daily_climate(water_levels["date"])
    df = water_levels.merge(rainfall, on="date", how="left").merge(climate, on="date", how="left").fillna(0)
    df["rain_3d"] = df["rainfall_mm_day"].rolling(3, min_periods=1).sum()
    df["rain_7d"] = df["rainfall_mm_day"].rolling(7, min_periods=1).sum()
    df["rain_14d"] = df["rainfall_mm_day"].rolling(14, min_periods=1).sum()
    df["climate_precip_3d"] = df["climate_precip_mm"].rolling(3, min_periods=1).sum()
    df["climate_precip_7d"] = df["climate_precip_mm"].rolling(7, min_periods=1).sum()
    return df


def build_feature_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    rows: list[dict[str, float | str]] = []

    for idx in range(LOOKBACK_DAYS, len(df) - 1):
        window = df.iloc[idx - LOOKBACK_DAYS:idx]
        current = df.iloc[idx]
        target = df.iloc[idx + 1]
        levels = window["water_level"].to_numpy(dtype=float)
        rain = window["rainfall_mm_day"].to_numpy(dtype=float)
        current_level = float(current["water_level"])
        target_level = float(target["water_level"])
        target_date = pd.Timestamp(target["date"])

        row: dict[str, float | str] = {
            "date": target_date.strftime("%Y-%m-%d"),
            "current_level": current_level,
            "mean_3d": float(np.mean(levels[-3:])),
            "mean_7d": float(np.mean(levels[-7:])),
            "mean_14d": float(np.mean(levels)),
            "max_7d": float(np.max(levels[-7:])),
            "min_7d": float(np.min(levels[-7:])),
            "std_7d": float(np.std(levels[-7:])),
            "trend_3d": current_level - float(levels[-3]),
            "trend_7d": current_level - float(levels[-7]),
            "rain_current": float(current["rainfall_mm_day"]),
            "rain_3d": float(window["rainfall_mm_day"].tail(3).sum()),
            "rain_7d": float(window["rainfall_mm_day"].tail(7).sum()),
            "rain_14d": float(window["rainfall_mm_day"].sum()),
            "rain_mean_7d": float(np.mean(rain[-7:])),
            "rain_max_7d": float(np.max(rain[-7:])),
            "rain_anomaly": float(current["rainfall_anomaly_mm"]),
            "rain_1month": float(current["r1h"]),
            "rain_3month": float(current["r3h"]),
            "rainfall_percentile": float(current["rfq"]),
            "level_rain_interaction": current_level * float(window["rainfall_mm_day"].tail(7).sum()),
            "climate_available": float(current["climate_available"]),
            "climate_precip_current": float(current["climate_precip_mm"]),
            "climate_precip_3d": float(window["climate_precip_mm"].tail(3).sum()),
            "climate_precip_7d": float(window["climate_precip_mm"].tail(7).sum()),
            "climate_precip_14d": float(window["climate_precip_mm"].sum()),
            "temp_max_c": float(current["temp_max_c"]),
            "temp_min_c": float(current["temp_min_c"]),
            "temp_mean_c": float(current["temp_mean_c"]),
            "temp_range_c": float(current["temp_max_c"] - current["temp_min_c"]),
            "month_sin": float(np.sin(2 * np.pi * target_date.month / 12)),
            "month_cos": float(np.cos(2 * np.pi * target_date.month / 12)),
            "day_sin": float(np.sin(2 * np.pi * target_date.dayofyear / 366)),
            "day_cos": float(np.cos(2 * np.pi * target_date.dayofyear / 366)),
            "target_level": target_level,
            "target_risk": risk_index(target_level),
        }

        for offset, value in enumerate(levels, start=1):
            row[f"lag_{LOOKBACK_DAYS - offset + 1}d"] = float(value)

        rows.append(row)

    feature_df = pd.DataFrame(rows)
    feature_names = [col for col in feature_df.columns if col not in {"date", "target_level", "target_risk"}]
    return feature_df, feature_names


def train() -> dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    water_levels = merge_hydro_rainfall(load_water_levels())
    feature_df, feature_names = build_feature_frame(water_levels)

    x = feature_df[feature_names]
    y_risk = feature_df["target_risk"].astype(int)
    y_level = feature_df["target_level"].astype(float)

    x_train, x_test, risk_train, risk_test, level_train, level_test = train_test_split(
        x,
        y_risk,
        y_level,
        test_size=0.2,
        random_state=42,
        stratify=y_risk,
    )

    classifier = RandomForestClassifier(
        n_estimators=220,
        max_depth=16,
        min_samples_leaf=3,
        criterion="entropy",
        random_state=42,
    )
    regressor = RandomForestRegressor(
        n_estimators=350,
        max_depth=16,
        min_samples_leaf=2,
        random_state=42,
    )

    classifier.fit(x_train, risk_train)
    regressor.fit(x_train, level_train)

    risk_pred = classifier.predict(x_test)
    level_pred = regressor.predict(x_test)

    metrics = {
        "modelVersion": "rf-aththanagalu-climate-v4",
        "datasetRows": int(len(water_levels)),
        "trainingRows": int(len(feature_df)),
        "lookbackDays": LOOKBACK_DAYS,
        "rainfallSource": str(RAINFALL_DATA_PATH.relative_to(BASE_DIR)),
        "rainfallPcode": GAMPAHA_PCODE,
        "climateSource": str(CLIMATE_DATA_PATH.relative_to(BASE_DIR)) if CLIMATE_DATA_PATH.exists() else None,
        "riskAccuracy": round(float(accuracy_score(risk_test, risk_pred)), 4),
        "riskBalancedAccuracy": round(float(balanced_accuracy_score(risk_test, risk_pred)), 4),
        "riskMacroF1": round(float(f1_score(risk_test, risk_pred, average="macro")), 4),
        "riskWeightedF1": round(float(f1_score(risk_test, risk_pred, average="weighted")), 4),
        "waterLevelMae": round(float(mean_absolute_error(level_test, level_pred)), 4),
        "waterLevelR2": round(float(r2_score(level_test, level_pred)), 4),
        "riskLabels": RISK_LABELS,
        "featureNames": feature_names,
    }

    bundle = {
        "classifier": classifier,
        "regressor": regressor,
        "featureNames": feature_names,
        "riskLabels": RISK_LABELS,
        "lookbackDays": LOOKBACK_DAYS,
        "modelVersion": metrics["modelVersion"],
    }
    joblib.dump(bundle, MODEL_PATH)

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    REPORT_PATH.write_text(
        classification_report(risk_test, risk_pred, target_names=RISK_LABELS, zero_division=0),
        encoding="utf-8",
    )

    return metrics


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
