# FloodGuard ML - Real Dataset Training & Prediction

This directory contains the machine learning components for predicting water levels at the Dunamale station (Aththanagalu Oya).

## Project Setup
1. Ensure the real dataset **Aththanagalu Oya Hydrological Time-Series Dataset.xlsx** is placed in the project root.
2. Install required Python packages:
   ```bash
   pip install pandas numpy matplotlib scikit-learn tensorflow openpyxl joblib
   ```

## Training the Model
To clean the data, normalize it, and train the LSTM model, run:
```bash
python ml/train_real.py
```
**Outputs:**
- `ml/data/processed/cleaned_dataset.csv`: Final dataset used.
- `ml/models/floodguard_lstm_model.keras`: The trained model.
- `ml/models/floodguard_scaler.pkl`: The fitted Min-Max scaler.
- `ml/results/prediction_plot.png`: Actual vs Predicted graph.
- `ml/results/metrics.txt`: MAE, RMSE, and R2 scores.

## Running Predictions
The prediction script is used by the backend to forecast future levels:
```bash
python ml/predict_real.py
```
It uses the last 7 days of water level data to predict the next day and assigns a risk category (None, Low, Moderate, High, Critical).

## Risk Thresholds (Dunamale)
- **None**: < 3.0m
- **Low**: 3.0m - 4.0m
- **Moderate**: 4.0m - 5.0m
- **High**: 5.0m - 6.0m
- **Critical**: > 6.0m
