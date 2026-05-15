import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
import json
import argparse

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
tf.get_logger().setLevel('ERROR')

# ── Configuration ──────────────────────────────────────────────────
MODEL_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_lstm_model.keras"
SCALER_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_scaler.pkl"
DATA_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\data\processed\cleaned_dataset.csv"

# ── Risk Thresholds ────────────────────────────────────────────────
# Provisional risk levels for FloodGuard demonstration.
# These can be updated later using official Dunamale/Attanagalu Oya flood-warning levels.
THRESHOLDS = {
    "Low": 1.0,
    "Moderate": 1.5,
    "High": 2.5,
    "Critical": 3.5
}

def get_risk_level(level):
    """
    Convert predicted water level into flood risk category.
    """
    if level >= THRESHOLDS["Critical"]:
        return "Critical"
    elif level >= THRESHOLDS["High"]:
        return "High"
    elif level >= THRESHOLDS["Moderate"]:
        return "Moderate"
    elif level >= THRESHOLDS["Low"]:
        return "Low"
    else:
        return "None"

def predict_next_day(last_14_days_levels):
    """
    Predict next-day water level using last 14 daily water-level values.

    last_14_days_levels:
        List of exactly 14 float values.
        Example: [2.1, 2.2, 2.0, 2.4, 2.5, 2.3, 2.6, 2.8, 2.9, 3.0, 3.1, 3.5, 3.8, 4.2]
    """

    if len(last_14_days_levels) != 14:
        raise ValueError("Input must exactly be a list of 14 daily water levels.")

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}. Run train_real.py first.")

    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Scaler file not found at: {SCALER_PATH}. Run train_real.py first.")

    # Load trained model and scaler
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Convert input to numpy array
    data = np.array(last_14_days_levels, dtype=float).reshape(-1, 1)

    # Convert to DataFrame to match scaler feature name used during training
    data_df = pd.DataFrame(data, columns=["water_level"])

    # Normalize input values
    normalized_data = scaler.transform(data_df)

    # Reshape for LSTM: [samples, time_steps, features]
    input_seq = normalized_data.reshape(1, 14, 1)

    # Predict next-day normalized value
    prediction_normalized = model.predict(input_seq, verbose=0)

    # Convert prediction back to real water-level value
    predicted_level = scaler.inverse_transform(prediction_normalized)[0][0]

    # Get flood risk level
    risk = get_risk_level(predicted_level)

    return predicted_level, risk

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--weather-csv', required=False, help="Path for weather data (for future compatibility)")
    parser.add_argument('--river-csv',   required=False, help="Path for river data")
    parser.add_argument('--model-dir',   required=False, help="Directory containing models")
    args = parser.parse_args()

    try:
        # If run by backend, we fetch the real last 14 days from our cleaned dataset
        if os.path.exists(DATA_PATH):
            df = pd.read_csv(DATA_PATH)
            # Ensure it's sorted by date
            df = df.sort_values(by="date")
            last_14_days = df["water_level"].tail(14).values.tolist()
        else:
            # Fallback sample
            last_14_days = [2.1, 2.2, 2.0, 2.4, 2.5, 2.3, 2.6, 2.8, 2.9, 3.0, 3.1, 3.5, 3.8, 4.2]
            
        if len(last_14_days) < 14:
            raise ValueError("Cleaned dataset does not have enough records (14 required).")

        level, risk = predict_next_day(last_14_days)
        
        # Prepare probability proxy based on risk level for the backend schema
        prob_map = {"Critical": 0.9, "High": 0.7, "Moderate": 0.5, "Low": 0.3, "None": 0.1}
        probability = prob_map.get(risk, 0.1)

        # Output strictly as JSON so Node.js can parse it easily
        result_json = {
            "predictions": [
                {
                    "location": "Gampaha",
                    "riskLevel": risk,
                    "waterLevel": float(level),
                    "floodProbability": probability,
                    "predictionText": f"{risk} flood risk - Predicted Level: {level:.2f} m"
                }
            ],
            "modelVersion": "v2.0-lstm-14d"
        }
        
        print(json.dumps(result_json))

    except Exception as e:
        print(json.dumps({"error": str(e)}))