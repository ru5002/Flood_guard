import pandas as pd
import numpy as np
import os
import joblib
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# ── Configuration & Paths ──────────────────────────────────────────
RAW_DATA_PATH = r"c:\Users\hirus\Downloads\floodguard_final\Aththanagalu Oya Hydrological Time-Series Dataset.xlsx"
PROCESSED_DATA_DIR = r"c:\Users\hirus\Downloads\floodguard_final\ml\data\processed"
MODEL_DIR = r"c:\Users\hirus\Downloads\floodguard_final\ml\models"
RESULTS_DIR = r"c:\Users\hirus\Downloads\floodguard_final\ml\results"

# Ensure directories exist
for d in [PROCESSED_DATA_DIR, MODEL_DIR, RESULTS_DIR]:
    os.makedirs(d, exist_ok=True)

# ── 1. Data Loading & Cleaning ─────────────────────────────────────
def load_and_preprocess():
    print("Step 1: Loading and Cleaning Data...")
    
    if not os.path.exists(RAW_DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at: {RAW_DATA_PATH}. Please ensure you've uploaded it to the correct path.")

    # Load Excel
    df = pd.read_excel(RAW_DATA_PATH)
    
    # 2. Inspect & Rename Columns
    # We expect something like Date/Year/Month components or a single Date and Water Level
    # Standardize names: 'date', 'water_level'
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
    
    # Attempt to find water level column (e.g., 'water_level', 'level', 'dunamale')
    level_col = None
    for col in df.columns:
        if 'level' in col or 'value' in col or 'water' in col:
            level_col = col
            break
    
    if not level_col:
        raise ValueError(f"Could not identify water level column. Found: {df.columns}")
    
    # Handle Date components if split
    if 'year' in df.columns and 'month' in df.columns and 'day' in df.columns:
        df['date'] = pd.to_datetime(df[['year', 'month', 'day']])
    elif 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'])
    else:
        # If no date column, we assume it's daily data starting from a point, 
        # but let's hope one of the above works.
        raise ValueError("Could not identify Date column.")

    # 3. Clean Data
    df = df.dropna(subset=[level_col, 'date'])
    df = df.drop_duplicates(subset=['date'])
    df = df.sort_values('date')
    
    # Keep only necessary columns
    df = df[['date', level_col]]
    df.columns = ['date', 'water_level']
    
    # Handle outliers/invalid (e.g., level < 0)
    df = df[df['water_level'] >= 0]
    
    print(f"Cleaned data: {len(df)} records.")
    df.to_csv(os.path.join(PROCESSED_DATA_DIR, "cleaned_dataset.csv"), index=False)
    return df

# ── 2. Scaler & Normalization ──────────────────────────────────────
def normalize_data(df):
    print("Step 2: Normalizing Data...")
    scaler = MinMaxScaler(feature_range=(0, 1))
    df['normalized_level'] = scaler.fit_transform(df[['water_level']])
    
    # Save Scaler
    joblib.dump(scaler, os.path.join(MODEL_DIR, "floodguard_scaler.pkl"))
    df.to_csv(os.path.join(PROCESSED_DATA_DIR, "normalized_dataset.csv"), index=False)
    return df, scaler

# ── 3. Time-Series Sequences ───────────────────────────────────────
def create_sequences(data, seq_length=7):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:(i + seq_length)])
        y.append(data[i + seq_length])
    return np.array(X), np.array(y)

# ── 4. Main Training Pipeline ──────────────────────────────────────
def train_pipeline():
    # Load and Clean
    df = load_and_preprocess()
    
    # Normalize
    df, scaler = normalize_data(df)
    
    # Sequence creation (7 days)
    level_data = df['normalized_level'].values
    X, y = create_sequences(level_data, seq_length=7)
    
    # Reshape X for LSTM [samples, time_steps, features]
    X = X.reshape((X.shape[0], X.shape[1], 1))
    
    # 5. Split Data (No Shuffling)
    train_size = int(len(X) * 0.8)
    val_size = int(len(X) * 0.1)
    
    X_train, y_train = X[:train_size], y[:train_size]
    X_val, y_val = X[train_size:train_size+val_size], y[train_size:train_size+val_size]
    X_test, y_test = X[train_size+val_size:], y[train_size+val_size:]
    
    print(f"Dataset split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    # 6. Build model
    print("Step 3: Building LSTM Model...")
    model = Sequential([
        LSTM(units=50, return_sequences=True, input_shape=(X.shape[1], 1)),
        Dropout(0.2),
        LSTM(units=50, return_sequences=False),
        Dropout(0.2),
        Dense(units=25),
        Dense(units=1)
    ])
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    # 7. Train
    print("Step 4: Training...")
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    history = model.fit(
        X_train, y_train,
        epochs=50,
        batch_size=32,
        validation_data=(X_val, y_val),
        callbacks=[early_stop],
        verbose=1
    )
    
    # 8. Evaluation
    print("Step 5: Evaluating...")
    predictions = model.predict(X_test)
    
    # Invert scaling
    y_test_actual = scaler.inverse_transform(y_test.reshape(-1, 1))
    predictions_actual = scaler.inverse_transform(predictions)
    
    mae = mean_absolute_error(y_test_actual, predictions_actual)
    mse = mean_squared_error(y_test_actual, predictions_actual)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test_actual, predictions_actual)
    
    with open(os.path.join(RESULTS_DIR, "metrics.txt"), "w") as f:
        f.write(f"MAE: {mae}\nMSE: {mse}\nRMSE: {rmse}\nR2 Score: {r2}\n")
    
    print(f"Results saved. RMSE: {rmse}, R2: {r2}")
    
    # 9. Plot Results
    plt.figure(figsize=(12,6))
    plt.plot(y_test_actual, color='blue', label='Actual Water Level')
    plt.plot(predictions_actual, color='red', linestyle='--', label='Predicted Water Level')
    plt.title('FloodGuard: Actual vs Predicted Water Levels (Dunamale)')
    plt.xlabel('Time Steps (Days)')
    plt.ylabel('Water Level')
    plt.legend()
    plt.savefig(os.path.join(RESULTS_DIR, "prediction_plot.png"))
    print(f"Plot saved to {RESULTS_DIR}")

    # 10. Save Model
    model.save(os.path.join(MODEL_DIR, "floodguard_lstm_model.keras"))
    print("Model saved successfully.")

if __name__ == "__main__":
    try:
        train_pipeline()
    except Exception as e:
        print(f"\nFATAL ERROR during training: {e}")
        print("Please check if the Excel file is correctly placed in the root directory.")
