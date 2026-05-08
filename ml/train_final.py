import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import tensorflow as tf
from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import LSTM, Dense, Dropout # type: ignore
from tensorflow.keras.callbacks import EarlyStopping # type: ignore

# Ensure directories exist
os.makedirs('ml/models', exist_ok=True)
os.makedirs('ml/results', exist_ok=True)

# 1. Load Data
print("Loading dataset...")
df = pd.read_csv('c:/Users/hirus/Downloads/floodguard_cleaned_features_with_flood_height.csv')

# Parse Date if needed and sort
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values('Date').reset_index(drop=True)

# Define Features
features = [
    'Gampaha Rainfall (mm/day)', 'Relative Humidity (%)', 'Wind Speed (km/h)', 'Dunamale Water Level (m)',
    'Flood_Water_Excess_Above_Alert_m', 'Month_sin', 'Month_cos', 'Day_sin', 'Day_cos'
]

# Ensure features are present in dataset
available_features = [col for col in features if col in df.columns]

# 2. Target Variable
# Using the existing Flood_Risk_Encoded as the target.
# It seems 0 is 'None' (though not explicitly named in the categorical column, it has 2979 entries)
df['Risk_Level'] = df['Flood_Risk_Encoded']

# 3. Create Sequential Data (Past 7 days to predict Day 8)
print("Generating sequences...")
SEQ_LENGTH = 7
X_seq = []
y_seq = []

data_values = df[available_features].values
target_values = df['Risk_Level'].values

for i in range(len(df) - SEQ_LENGTH):
    X_seq.append(data_values[i:i+SEQ_LENGTH])
    # Target is the risk level on day 8
    y_seq.append(target_values[i+SEQ_LENGTH])

X_seq = np.array(X_seq)
y_seq = np.array(y_seq)

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X_seq, y_seq, test_size=0.2, shuffle=False)

# Normalize Data (Flatten for Scaler, then reshape for LSTM)
scaler = StandardScaler()
X_train_flat = X_train.reshape(-1, len(available_features))
X_test_flat = X_test.reshape(-1, len(available_features))

X_train_scaled_flat = scaler.fit_transform(X_train_flat)
X_test_scaled_flat = scaler.transform(X_test_flat)

X_train_scaled = X_train_scaled_flat.reshape(X_train.shape[0], SEQ_LENGTH, len(available_features))
X_test_scaled = X_test_scaled_flat.reshape(X_test.shape[0], SEQ_LENGTH, len(available_features))

joblib.dump(scaler, 'ml/models/feature_scaler.pkl')

print(f"Data prepared. Train shape: {X_train_scaled.shape}, Test shape: {X_test_scaled.shape}")

# -------------------------------------------------------------
# Phase 2: Baseline ML Model (Random Forest Classifier)
# -------------------------------------------------------------
print("\n--- Training Random Forest Baseline ---")
# RF requires 2D input (samples x features)
X_train_rf = X_train_scaled.reshape(X_train_scaled.shape[0], -1)
X_test_rf = X_test_scaled.reshape(X_test_scaled.shape[0], -1)

rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train_rf, y_train)

rf_preds = rf_model.predict(X_test_rf)
rf_acc = accuracy_score(y_test, rf_preds)
print(f"Random Forest Accuracy: {rf_acc:.4f}")
print("Classification Report (Random Forest):")
rf_report = classification_report(y_test, rf_preds)
print(rf_report)

joblib.dump(rf_model, 'ml/models/random_forest_baseline.pkl')

# -------------------------------------------------------------
# Phase 3: Final Deep Learning Model (LSTM Neural Network)
# -------------------------------------------------------------
print("\n--- Training Final LSTM Architecture ---")

# Convert labels to categorical for softmax output
y_train_cat = tf.keras.utils.to_categorical(y_train, num_classes=5)
y_test_cat = tf.keras.utils.to_categorical(y_test, num_classes=5)

lstm_model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(SEQ_LENGTH, len(available_features))),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(5, activation='softmax')
])

lstm_model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Early stopping to prevent overfitting
early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

history = lstm_model.fit(
    X_train_scaled, y_train_cat,
    epochs=50,
    batch_size=32,
    validation_data=(X_test_scaled, y_test_cat),
    callbacks=[early_stop],
    verbose=1
)

# Evaluate LSTM
lstm_loss, lstm_acc = lstm_model.evaluate(X_test_scaled, y_test_cat, verbose=0)
print(f"\nLSTM Final Accuracy: {lstm_acc:.4f}")

lstm_preds_probs = lstm_model.predict(X_test_scaled)
lstm_preds = np.argmax(lstm_preds_probs, axis=1)

print("Classification Report (LSTM):")
lstm_report = classification_report(y_test, lstm_preds)
print(lstm_report)

# Save LSTM Model
lstm_model.save('ml/models/floodguard_lstm_final.keras')

# Save Results to txt
with open('ml/results/final_metrics.txt', 'w') as f:
    f.write("=== FloodGuard Performance Metrics ===\n\n")
    f.write(f"Dataset Size: {len(df)}\n")
    f.write(f"Sequence Length: {SEQ_LENGTH} days\n\n")
    
    f.write("--- Random Forest (Baseline) ---\n")
    f.write(f"Accuracy: {rf_acc:.4f}\n")
    f.write(rf_report + "\n\n")
    
    f.write("--- LSTM (Final Model) ---\n")
    f.write(f"Accuracy: {lstm_acc:.4f}\n")
    f.write(lstm_report + "\n")

print("\nAll models trained and saved to ml/models/. Metrics saved to ml/results/.")
