# FloodGuard ML - Random Forest Training & Prediction

This directory contains the machine learning components for predicting flood risk at the Dunamale station on Aththanagalu Oya.

The model is rebuilt from FloodGuard's own spreadsheet data and Sri Lanka rainfall records. The reference flood prediction project uses a Random Forest classifier over environmental readings; FloodGuard applies that idea to hydrological and rainfall time-series data by generating lag, rolling-average, trend, rainfall, and seasonal features.

## Project Setup
1. Ensure the real dataset **Aththanagalu Oya Hydrological Time-Series Dataset.xlsx** is placed in the project root.
2. Install required Python packages:
   ```bash
   pip install -r ml/requirements.txt
   ```

## Training the Model
To clean the data and train the Random Forest model from scratch, run:
```bash
python ml/train.py
```
**Outputs:**
- `ml/data/processed/cleaned_dataset.csv`: Final dataset used.
- `ml/data/processed/training_features.csv`: Feature rows used by the model.
- `ml/models/floodguard_rf_model.joblib`: The trained classifier/regressor bundle.
- `ml/results/rf_metrics.json`: Accuracy and water-level error metrics.
- `ml/results/rf_classification_report.txt`: Per-risk-level classification report.

## Running Predictions
The prediction script is used by the backend to forecast the next two days:
```bash
python ml/predict_lstm.py
```
It accepts the latest 14 water-level readings through standard input and returns Day 1 and Day 2 risk predictions as JSON.

## Risk Thresholds (Dunamale)
- **None**: < 1.0m
- **Low**: 1.0m - 1.5m
- **Moderate**: 1.5m - 2.0m
- **High**: 2.0m - 2.5m
- **Critical**: >= 2.5m
