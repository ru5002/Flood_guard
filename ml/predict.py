"""
FloodGuard – LSTM Inference Script
====================================
Loads the trained model, reads the last 7 days of CSV data per location,
runs inference, and prints a JSON array of predictions to stdout.

Called by mlController.js:
    python predict.py --weather-csv <path> --river-csv <path> --model-dir <path>

Output (stdout):
    { "predictions": [ { location, riskLevel, floodProbability, ... }, ... ] }
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import joblib
from datetime import datetime, timedelta

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import tensorflow as tf

# ── Constants ──────────────────────────────────────────────────────
SEQUENCE_LENGTH = 7
FEATURES = ['rainfall', 'temperature', 'humidity', 'pressure', 'river_level', 'month']
LOCATIONS = ['Ja-Ela', 'Gampaha', 'Minuwangoda', 'Negombo']
MODEL_VERSION = 'v1.0-lstm'

RISK_MAP = [
    (0.80, 'Critical'),
    (0.60, 'High'),
    (0.40, 'Moderate'),
    (0.20, 'Low'),
    (0.00, 'None'),
]

PREDICTION_TEXT = {
    'Critical': 'Critical flood risk – immediate action advised',
    'High':     'High flood risk – prepare for possible flooding',
    'Moderate': 'Moderate risk – monitor river levels closely',
    'Low':      'Low flood risk – light showers expected',
    'None':     'No significant flood risk at this time',
}


def get_risk_level(prob):
    for threshold, level in RISK_MAP:
        if prob >= threshold:
            return level
    return 'None'


def load_data(weather_csv, river_csv):
    weather = pd.read_csv(weather_csv)
    river   = pd.read_csv(river_csv)

    weather['date'] = pd.to_datetime(weather['recordedAt']).dt.date
    river['date']   = pd.to_datetime(river['recordedAt']).dt.date
    river = river.rename(columns={'level': 'river_level'})

    merged = pd.merge(
        weather[['location', 'temperature', 'humidity', 'pressure', 'rainfall', 'date']],
        river[['location', 'river_level', 'date']],
        on=['location', 'date'],
        how='inner'
    )
    merged['month'] = pd.to_datetime(merged['date']).dt.month
    return merged


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--weather-csv', required=True)
    parser.add_argument('--river-csv',   required=True)
    parser.add_argument('--model-dir',
                        default=os.path.join(os.path.dirname(__file__), 'models'))
    args = parser.parse_args()

    model_path  = os.path.join(args.model_dir, 'lstm_flood_model.keras')
    scaler_path = os.path.join(args.model_dir, 'scaler.pkl')

    # Check model exists
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print(json.dumps({
            'error': 'Model not trained yet. Run: python ml/train.py'
        }))
        sys.exit(1)

    # Load model + scaler
    model  = tf.keras.models.load_model(model_path)
    scaler = joblib.load(scaler_path)

    # Load CSV data
    df = load_data(args.weather_csv, args.river_csv)

    now       = datetime.utcnow()
    valid_til = (now + timedelta(hours=24)).isoformat() + 'Z'

    predictions = []

    for location in LOCATIONS:
        loc_df = (
            df[df['location'] == location]
            .sort_values('date')
            .tail(SEQUENCE_LENGTH)
            .reset_index(drop=True)
        )

        if len(loc_df) < SEQUENCE_LENGTH:
            continue

        # Scale and reshape
        features_scaled = scaler.transform(loc_df[FEATURES].values)
        X = features_scaled.reshape(1, SEQUENCE_LENGTH, len(FEATURES))

        # Predict
        prob      = float(model.predict(X, verbose=0)[0][0])
        prob_pct  = round(prob * 100, 2)
        risk      = get_risk_level(prob)
        confidence = round(max(prob, 1.0 - prob) * 100, 1)

        latest = loc_df.iloc[-1]

        predictions.append({
            'location':        location,
            'district':        'Gampaha',
            'prediction':      PREDICTION_TEXT[risk],
            'riskLevel':       risk,
            'riverRisk':       risk,
            'floodProbability': prob_pct,
            'confidence':      confidence,
            'rainfallMm':      round(float(latest['rainfall']), 2),
            'modelVersion':    MODEL_VERSION,
            'source':          'ml_model',
            'generatedAt':     now.isoformat() + 'Z',
            'validUntil':      valid_til,
        })

    print(json.dumps({'predictions': predictions}))


if __name__ == '__main__':
    main()
