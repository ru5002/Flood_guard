import os
import sys
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout
from keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import json

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'processed', 'cleaned_dataset.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
RESULTS_DIR = os.path.join(BASE_DIR, 'results')

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, 'floodguard_lstm_v2.keras')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler_v2.pkl')
METRICS_PATH = os.path.join(RESULTS_DIR, 'metrics_lstm_v2.txt')

import pickle

def load_and_preprocess_data():
    if not os.path.exists(DATA_FILE):
        print(f"Error: Data file not found at {DATA_FILE}")
        sys.exit(1)
        
    df = pd.read_csv(DATA_FILE)
    print(f"Loaded dataset with columns: {list(df.columns)}")
    
    # 1. Parse date and sort
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
    elif 'recordedAt' in df.columns:
        df['recordedAt'] = pd.to_datetime(df['recordedAt'])
        df = df.sort_values('recordedAt')
        df.rename(columns={'recordedAt': 'date'}, inplace=True)
    else:
        print("Warning: date column not found. Assuming chronological order.")
    
    # Rename commonly used columns if needed
    col_mapping = {
        'windSpeed': 'wind_speed',
        'waterLevel': 'water_level'
    }
    df.rename(columns=col_mapping, inplace=True)

    required_cols = ['rainfall', 'water_level', 'humidity', 'temperature']
    
    # Check what columns are missing and try to adapt or use placeholders
    for col in required_cols:
        if col not in df.columns:
            print(f"Warning: {col} not found in the dataset. Using default 0s.")
            df[col] = 0.0

    # Clean missing values
    df[required_cols] = df[required_cols].apply(pd.to_numeric, errors='coerce')
    df[required_cols] = df[required_cols].interpolate(method='linear').fillna(method='bfill').fillna(method='ffill')

    # Remove impossible values
    df.loc[df['rainfall'] < 0, 'rainfall'] = 0
    df.loc[df['water_level'] < 0, 'water_level'] = 0
    df.loc[(df['humidity'] < 0) | (df['humidity'] > 100), 'humidity'] = 50
    
    return df[required_cols].values

def create_sequences(data, input_steps=14, output_steps=2):
    X, y = [], []
    for i in range(len(data) - input_steps - output_steps + 1):
        X.append(data[i:(i + input_steps)])
        # Target is water_level for the next 2 days (index 1 is water_level)
        y.append(data[(i + input_steps):(i + input_steps + output_steps), 1]) 
    return np.array(X), np.array(y)

def main():
    print("Starting FloodGuard LSTM Model Training...")
    data = load_and_preprocess_data()
    
    if len(data) < 50:
        print("Dataset too small to train LSTM. Need at least 50 records.")
        sys.exit(1)
        
    print(f"Processed data shape: {data.shape}")
    
    # Normalize features
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data)
    
    # Save the scaler for inference
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
        
    # Create sequences: 14 days input, 2 days output
    input_steps = 14
    output_steps = 2
    X, y = create_sequences(scaled_data, input_steps, output_steps)
    print(f"Sequences created. X shape: {X.shape}, y shape: {y.shape}")
    
    # Chronological Split: 70% Train, 15% Val, 15% Test
    train_size = int(len(X) * 0.70)
    val_size = int(len(X) * 0.15)
    
    X_train, y_train = X[:train_size], y[:train_size]
    X_val, y_val = X[train_size:train_size+val_size], y[train_size:train_size+val_size]
    X_test, y_test = X[train_size+val_size:], y[train_size+val_size:]
    
    print(f"Train samples: {len(X_train)}, Val samples: {len(X_val)}, Test samples: {len(X_test)}")
    
    # Define Model
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(X_train.shape[1], X_train.shape[2])),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(output_steps) # Predict 2 days of water level
    ])
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    # Callbacks
    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    checkpoint = ModelCheckpoint(filepath=MODEL_PATH, monitor='val_loss', save_best_only=True)
    
    # Train
    print("Training model...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=100,
        batch_size=32,
        callbacks=[early_stop, checkpoint],
        verbose=1
    )
    
    print("Training complete. Evaluating on test set...")
    
    # Predict on test set
    y_pred_scaled = model.predict(X_test)
    
    # Inverse transform
    # To inverse transform the prediction, we need to pad the predictions to match the 4 features
    dummy_input = np.zeros((y_pred_scaled.shape[0], 4))
    
    # Day 1
    dummy_input[:, 1] = y_pred_scaled[:, 0]
    y_pred_day1 = scaler.inverse_transform(dummy_input)[:, 1]
    
    # Day 2
    dummy_input[:, 1] = y_pred_scaled[:, 1]
    y_pred_day2 = scaler.inverse_transform(dummy_input)[:, 1]
    
    # True values
    dummy_input[:, 1] = y_test[:, 0]
    y_test_day1 = scaler.inverse_transform(dummy_input)[:, 1]
    
    dummy_input[:, 1] = y_test[:, 1]
    y_test_day2 = scaler.inverse_transform(dummy_input)[:, 1]
    
    # Calculate Metrics
    mae_d1 = mean_absolute_error(y_test_day1, y_pred_day1)
    rmse_d1 = np.sqrt(mean_squared_error(y_test_day1, y_pred_day1))
    r2_d1 = r2_score(y_test_day1, y_pred_day1)
    
    mae_d2 = mean_absolute_error(y_test_day2, y_pred_day2)
    rmse_d2 = np.sqrt(mean_squared_error(y_test_day2, y_pred_day2))
    r2_d2 = r2_score(y_test_day2, y_pred_day2)
    
    metrics = f"""LSTM FloodGuard V2 Metrics
==========================
Train size: {len(X_train)} | Val size: {len(X_val)} | Test size: {len(X_test)}

Metrics (Day 1 - Tomorrow):
MAE:  {mae_d1:.4f}
RMSE: {rmse_d1:.4f}
R2:   {r2_d1:.4f}

Metrics (Day 2):
MAE:  {mae_d2:.4f}
RMSE: {rmse_d2:.4f}
R2:   {r2_d2:.4f}
"""

    with open(METRICS_PATH, 'w') as f:
        f.write(metrics)
        
    print(metrics)
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")

if __name__ == "__main__":
    main()