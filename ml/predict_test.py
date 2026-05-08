import numpy as np
import joblib
import os
import tensorflow as tf

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")

try:
    from tensorflow.keras.models import load_model
except Exception:
    from keras.models import load_model

model_path = os.path.join(MODEL_DIR, "floodguard_lstm_model.keras")
scaler_path = os.path.join(MODEL_DIR, "floodguard_scaler.pkl")

print("Loading model and scaler...")
model = load_model(model_path)
scaler = joblib.load(scaler_path)

# Simulated sequence of 24 readings for a single feature (e.g. water_level)
# In reality, this would be fetched from the database or the last 24 hours of data.
sample_data = np.array([
    [2.1], [2.2], [2.4], [2.8], [3.1], [3.5], [3.8], [4.1],
    [4.3], [4.5], [4.6], [4.7], [4.8], [4.9], [5.0], [5.1],
    [5.2], [5.2], [5.3], [5.4], [5.5], [5.6], [5.7], [5.8]
])

print("Predicting flood risk...")
sample_scaled = scaler.transform(sample_data)

# Shape must be (samples, TIME_STEPS, features)
sample_sequence = np.array(sample_scaled).reshape(1, 24, 1)

prediction = model.predict(sample_sequence)
risk_index = int(np.argmax(prediction))
confidence = float(np.max(prediction))

risk_labels = ["None", "Low", "Moderate", "High", "Critical"]

print("\n--- FloodGuard Prediction Result ---")
print("Risk Level:", risk_labels[risk_index])
print(f"Confidence: {confidence * 100:.2f}%")
print("Probabilities:", np.round(prediction[0], 4))
