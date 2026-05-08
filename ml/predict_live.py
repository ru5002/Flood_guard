import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import tensorflow as tf

# Suppress TensorFlow logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

def get_cyclical_features(date_obj):
    """Generate sin/cos features for month and day."""
    month = date_obj.month
    day = date_obj.day
    
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)
    
    day_sin = np.sin(2 * np.pi * day / 31)
    day_cos = np.cos(2 * np.pi * day / 31)
    
    return month_sin, month_cos, day_sin, day_cos

def predict_live():
    try:
        # 1. Load Model and Scaler
        model_path = os.path.join('ml', 'models', 'floodguard_lstm_final.keras')
        scaler_path = os.path.join('ml', 'models', 'feature_scaler.pkl')
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(json.dumps({"error": "Model or Scaler files not found"}))
            return

        model = tf.keras.models.load_model(model_path)
        scaler = joblib.load(scaler_path)

        # 2. Read input data from stdin (JSON from Node.js)
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data received"}))
            return
            
        data = json.loads(input_data)
        # Expecting a list of 7 dictionaries representing daily readings
        if len(data) != 7:
            print(json.dumps({"error": f"Sequence length must be 7, got {len(data)}"}))
            return

        # 3. Feature Engineering & Preparation
        # Feature order MUST match training:
        # ['Gampaha Rainfall (mm/day)', 'Relative Humidity (%)', 'Wind Speed (km/h)', 
        #  'Dunamale Water Level (m)', 'Flood_Water_Excess_Above_Alert_m', 
        #  'Month_sin', 'Month_cos', 'Day_sin', 'Day_cos']
        
        sequence_data = []
        for entry in data:
            rainfall = float(entry.get('rainfall', 0))
            humidity = float(entry.get('humidity', 0))
            wind_speed = float(entry.get('wind_speed', 0))
            water_level = float(entry.get('water_level', 0))
            
            # Flood Excess Logic: max(0, water_level - 1.5)
            excess = max(0.0, water_level - 1.5)
            
            # Cyclical Date Features
            dt = datetime.fromisoformat(entry.get('date').replace('Z', '+00:00'))
            m_sin, m_cos, d_sin, d_cos = get_cyclical_features(dt)
            
            row = [
                rainfall, humidity, wind_speed, water_level,
                excess, m_sin, m_cos, d_sin, d_cos
            ]
            sequence_data.append(row)

        # 4. Normalize and Reshape
        sequence_array = np.array(sequence_data) # (7, 9)
        scaled_data = scaler.transform(sequence_array) # (7, 9)
        input_tensor = scaled_data.reshape(1, 7, 9) # (1, 7, 9)

        # 5. Inference
        predictions = model.predict(input_tensor, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        
        risk_labels = {0: "None", 1: "Low", 2: "Moderate", 3: "High", 4: "Critical"}
        
        # 6. Return Result
        result = {
            "prediction": risk_labels[predicted_class],
            "class_index": int(predicted_class),
            "confidence": round(confidence, 4),
            "probabilities": {risk_labels[i]: round(float(predictions[0][i]), 4) for i in range(5)}
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    predict_live()
