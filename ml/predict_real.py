import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf

# ── Configuration ──────────────────────────────────────────────────
MODEL_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_lstm_model.keras"
SCALER_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_scaler.pkl"

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

def predict_next_day(last_7_days_levels):
    """
    Predict next-day water level using last 7 daily water-level values.

    last_7_days_levels:
        List of exactly 7 float values.
        Example: [2.4, 2.5, 2.3, 2.6, 3.1, 3.5, 4.2]
    """

    if len(last_7_days_levels) != 7:
        raise ValueError("Input must exactly be a list of 7 daily water levels.")

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}. Run train_real.py first.")

    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Scaler file not found at: {SCALER_PATH}. Run train_real.py first.")

    # Load trained model and scaler
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Convert input to numpy array
    data = np.array(last_7_days_levels, dtype=float).reshape(-1, 1)

    # Convert to DataFrame to match scaler feature name used during training
    data_df = pd.DataFrame(data, columns=["water_level"])

    # Normalize input values
    normalized_data = scaler.transform(data_df)

    # Reshape for LSTM: [samples, time_steps, features]
    input_seq = normalized_data.reshape(1, 7, 1)

    # Predict next-day normalized value
    prediction_normalized = model.predict(input_seq, verbose=0)

    # Convert prediction back to real water-level value
    predicted_level = scaler.inverse_transform(prediction_normalized)[0][0]

    # Get flood risk level
    risk = get_risk_level(predicted_level)

    return predicted_level, risk

if __name__ == "__main__":
    try:
        # Example 7-day input values
        sample_input = [2.4, 2.5, 2.3, 2.6, 3.1, 3.5, 4.2]

        level, risk = predict_next_day(sample_input)

        print("\n--- FloodGuard Prediction Result ---")
        print(f"Input Last 7 Days: {sample_input}")
        print(f"Predicted Next Day Water Level: {level:.2f} m")
        print(f"Calculated Risk Level: {risk}")
        print("------------------------------------\n")

    except Exception as e:
        print(f"Prediction Error: {e}")