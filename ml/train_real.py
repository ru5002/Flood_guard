import pandas as pd
import numpy as np
import os
import joblib
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
    from tensorflow.keras.callbacks import EarlyStopping
    from tensorflow.keras.utils import to_categorical
except Exception:
    from keras.models import Sequential
    from keras.layers import LSTM, Dense, Dropout, Input
    from keras.callbacks import EarlyStopping
    from keras.utils import to_categorical

# ── Configuration & Paths ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_PATH = os.path.join(BASE_DIR, "Aththanagalu Oya Hydrological Time-Series Dataset.xlsx")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "ml", "data", "processed")
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")
RESULTS_DIR = os.path.join(BASE_DIR, "ml", "results")

for d in [PROCESSED_DATA_DIR, MODEL_DIR, RESULTS_DIR]:
    os.makedirs(d, exist_ok=True)

# ── 1. Data Loading & Cleaning ─────────────────────────────────────
def assign_risk(row):
    river = row["water_level"]
    if river > 5.0: return 4   # Critical
    elif river > 4.0: return 3 # High
    elif river > 3.0: return 2 # Moderate
    elif river > 2.0: return 1 # Low
    else: return 0             # None

def load_and_preprocess():
    print("Step 1: Loading and Cleaning Data...")
    if not os.path.exists(RAW_DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at: {RAW_DATA_PATH}")

    df = pd.read_excel(RAW_DATA_PATH, header=5)
    df = df.dropna(axis=1, how="all")
    df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(" ", "_").str.replace(".", "", regex=False).str.replace("(", "", regex=False).str.replace(")", "", regex=False)

    level_col = next((col for col in df.columns if "water" in col and "level" in col), None)
    if level_col is None:
        raise ValueError(f"Could not identify water level column. Found: {df.columns}")

    if "year" in df.columns and "month" in df.columns and "date" in df.columns:
        df = df.rename(columns={"date": "day"})
        df["date"] = pd.to_datetime(df[["year", "month", "day"]], errors="coerce")
        
    df[level_col] = pd.to_numeric(df[level_col], errors="coerce")
    df = df.dropna(subset=["date", level_col])
    df = df.drop_duplicates(subset=["date"]).sort_values("date")
    
    df = df[["date", level_col]]
    df.columns = ["date", "water_level"]
    df = df[df["water_level"] >= 0]
    
    # Cap outliers
    Q3 = df["water_level"].quantile(0.75)
    Q1 = df["water_level"].quantile(0.25)
    upper_bound = Q3 + 1.5 * (Q3 - Q1)
    df["water_level"] = np.clip(df["water_level"], a_min=None, a_max=upper_bound)

    # Apply Risk Levels
    df["RiskLevel"] = df.apply(assign_risk, axis=1)

    df.to_csv(os.path.join(PROCESSED_DATA_DIR, "cleaned_dataset.csv"), index=False)
    return df

# ── 2. Scaler & Normalization ──────────────────────────────────────
def normalize_data(df):
    print("Step 2: Normalizing Data...")
    scaler = MinMaxScaler(feature_range=(0, 1))
    # We only scale features, not the target risk level
    df["scaled_level"] = scaler.fit_transform(df[["water_level"]])
    joblib.dump(scaler, os.path.join(MODEL_DIR, "floodguard_scaler.pkl"))
    return df, scaler

# ── 3. Time-Series Sequences ───────────────────────────────────────
def create_sequences(df, time_steps=24):
    Xs, ys = [], []
    features = df["scaled_level"].values
    targets = df["RiskLevel"].values
    
    for i in range(len(df) - time_steps):
        Xs.append(features[i:i + time_steps])
        ys.append(targets[i + time_steps])
        
    return np.array(Xs), np.array(ys)

# ── 4. Main Training Pipeline ──────────────────────────────────────
def train_pipeline():
    df = load_and_preprocess()
    df, scaler = normalize_data(df)

    TIME_STEPS = 24
    X_seq, y_seq = create_sequences(df, time_steps=TIME_STEPS)

    if len(X_seq) == 0:
        raise ValueError("Not enough records to create LSTM sequences.")

    X_seq = X_seq.reshape((X_seq.shape[0], X_seq.shape[1], 1))
    
    split_index = int(len(X_seq) * 0.8)
    X_train, X_test = X_seq[:split_index], X_seq[split_index:]
    y_train, y_test = y_seq[:split_index], y_seq[split_index:]

    num_classes = 5
    y_train_cat = to_categorical(y_train, num_classes=num_classes)
    y_test_cat = to_categorical(y_test, num_classes=num_classes)

    print(f"Dataset split: Train={len(X_train)}, Test={len(X_test)}")
    print("Step 3: Building Classification LSTM Model...")

    model = Sequential([
        Input(shape=(TIME_STEPS, X_train.shape[2])),
        LSTM(64, return_sequences=True),
        Dropout(0.2),
        LSTM(32, return_sequences=False),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(num_classes, activation="softmax")
    ])

    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    model.summary()

    print("Step 4: Training...")
    early_stop = EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True)

    history = model.fit(
        X_train, y_train_cat,
        epochs=50,
        batch_size=32,
        validation_data=(X_test, y_test_cat),
        callbacks=[early_stop],
        verbose=1
    )

    print("Step 5: Evaluating...")
    y_pred_prob = model.predict(X_test)
    y_pred = np.argmax(y_pred_prob, axis=1)

    report = classification_report(y_test, y_pred, zero_division=0)
    matrix = confusion_matrix(y_test, y_pred)
    
    with open(os.path.join(RESULTS_DIR, "classification_report.txt"), "w") as f:
        f.write(report)
        f.write("\nConfusion Matrix:\n")
        f.write(np.array2string(matrix))

    print(report)
    
    model.save(os.path.join(MODEL_DIR, "floodguard_lstm_model.keras"))
    print("Model saved successfully.")

if __name__ == "__main__":
    try:
        train_pipeline()
    except Exception as e:
        print(f"\nFATAL ERROR during training: {e}")
