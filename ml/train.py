"""
FloodGuard – LSTM Training Script
=================================
Processes the provided Excel/CSV dataset, scales features, 
trains an LSTM model, and saves it to models/ folder.

Usage:
    python train.py --dataset path/to/dataset.xlsx
"""

import os
import argparse
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# ── Constants ──────────────────────────────────────────────────────
SEQUENCE_LENGTH = 7
FEATURES = ['rainfall', 'temperature', 'humidity', 'pressure', 'river_level', 'month']
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def prepare_sequences(data, seq_length):
    X, y = [], []
    # Simplified approach: treating the whole dataset as a single time series for demo
    # In production, this should be grouped by location
    for i in range(len(data) - seq_length):
        X.append(data[i:(i + seq_length)])
        # Target: rainfall/river_level in next step (or a binary flood flag if exists)
        # Here we predict river_level for the 'next' day as a proxy for flood risk
        y.append(data[i + seq_length, 4]) # 4 is index of river_level
    return np.array(X), np.array(y)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', default='ml/data/raw/new_dataset.xlsx', help='Path to Excel/CSV dataset')
    parser.add_argument('--epochs', type=int, default=50)
    args = parser.parse_args()

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    # 1. Load Data
    print(f"Loading dataset from {args.dataset}...")
    if args.dataset.endswith('.xlsx'):
        df = pd.read_excel(args.dataset)
    else:
        df = pd.read_csv(args.dataset)

    # Minimal Preprocessing
    # Assuming columns: temperature, humidity, pressure, rainfall, river_level, recordedAt
    df['recordedAt'] = pd.to_datetime(df['recordedAt'])
    df['month'] = df['recordedAt'].dt.month
    
    # Sort and filter features
    df = df.sort_values('recordedAt')
    data_values = df[FEATURES].values

    # 2. Scale Data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data_values)

    # 3. Create Sequences
    X, y = prepare_sequences(scaled_data, SEQUENCE_LENGTH)
    
    # Split training/test
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # 4. Build LSTM Model
    print("Building model...")
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, len(FEATURES))),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dense(1) # Predict normalized river level
    ])

    model.compile(optimizer='adam', loss='mse')

    # 5. Train
    print(f"Training for {args.epochs} epochs...")
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    model.fit(
        X_train, y_train,
        epochs=args.epochs,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        batch_size=16,
        verbose=1
    )

    # 6. Save Model and Scaler
    model_path = os.path.join(MODEL_DIR, 'lstm_flood_model.keras')
    scaler_path = os.path.join(MODEL_DIR, 'scaler.pkl')

    model.save(model_path)
    joblib.dump(scaler, scaler_path)

    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

if __name__ == "__main__":
    main()
