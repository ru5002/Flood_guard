import os
import joblib
import numpy as np
import tensorflow as tf
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────
MODEL_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_lstm_model.keras"
SCALER_PATH = r"c:\Users\hirus\Downloads\floodguard_final\ml\models\floodguard_scaler.pkl"

# THRESHOLDS (Based on Dunamale station typical values - adjust as needed)
# Example: 0-3 Normal, 3-4 Alert, 4-5 Minor Flood, 5-6 Major Flood, 6+ Critical
THRESHOLDS = {
    'Critical': 6.0,
    'High': 5.0,
    'Moderate': 4.0,
    'Low': 3.0
}

def get_risk_level(level):
    if level >= THRESHOLDS['Critical']: return "Critical"
    if level >= THRESHOLDS['High']: return "High"
    if level >= THRESHOLDS['Moderate']: return "Moderate"
    if level >= THRESHOLDS['Low']: return "Low"
    return "None"

def predict_next_day(last_7_days_levels):
    """
    last_7_days_levels: List of 7 floats representing water levels for the last 7 days.
    """
    if len(last_7_days_levels) != 7:
        raise ValueError("Input must exactly be a list of 7 daily water levels.")

    # 1. Load Model and Scaler
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise FileNotFoundError("Model or Scaler files not found. Run train_real.py first.")

    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    # 2. Preprocess
    # Reshape and normalize
    data = np.array(last_7_days_levels).reshape(-1, 1)
    normalized_data = scaler.transform(data)
    
    # Shape for LSTM: (1, 7, 1) -> (samples, time_steps, features)
    input_seq = normalized_data.reshape(1, 7, 1)

    # 3. Predict
    prediction_normalized = model.predict(input_seq, verbose=0)
    
    # 4. Inverse Scale
    predicted_level = scaler.inverse_transform(prediction_normalized)[0][0]
    
    # 5. Categorize Risk
    risk = get_risk_level(predicted_level)
    
    return predicted_level, risk

if __name__ == "__main__":
    # Example usage with sample data (replace with real data from DB/CSV)
    try:
        sample_input = [2.4, 2.5, 2.3, 2.6, 3.1, 3.5, 4.2] # 7 days of data
        level, risk = predict_next_day(sample_input)
        
        print("\n--- FloodGuard Prediction Result ---")
        print(f"Predicted Next Day Water Level: {level:.2f} m")
        print(f"Calculated Risk Level: {risk}")
        print("------------------------------------\n")
    except Exception as e:
        print(f"Prediction Error: {e}")
