# FloodGuard — ML Explained Simply

## What does the ML do?

It looks at the last **14 days** of river water levels and rainfall, then predicts:
1. **What the water level will be tomorrow** (in metres)
2. **How risky that is** — None / Low / Moderate / High / Critical

---

## The Model — Random Forest

Two models are trained and saved together:

| Model | What it does |
|---|---|
| **Classifier** (220 trees) | Predicts the risk category |
| **Regressor** (350 trees) | Predicts the exact water level in metres |

**Why Random Forest?**
Instead of one decision tree that can be wrong, you build 220 trees — each one votes, the majority answer wins. It is robust, works well with tabular data, and does not need a GPU.

---

## Data Sources (3 real datasets)

| Source | What it provides |
|---|---|
| Aththanagalu Oya gauge `.xlsx` | Daily river water level at Dunamale |
| CHIRPS/WFP rainfall CSV | Historical daily rainfall for Gampaha (LK12) |
| Sri Lanka Climate CSV | Daily temperature & precipitation near Gampaha |

**Total: 3,829 days (~10 years) of real data**

---

## Features fed into the model (46 total)

| Group | Features | Why |
|---|---|---|
| **Lag values** | `lag_1d` → `lag_14d` | The exact water level each day for the past 14 days |
| **Rolling averages** | `mean_3d`, `mean_7d`, `mean_14d` | Is the river high on average recently? |
| **Statistics** | `max_7d`, `min_7d`, `std_7d` | How volatile has the river been? |
| **Trend** | `trend_3d`, `trend_7d` | Is the river rising or falling? |
| **Rainfall** | `rain_3d`, `rain_7d`, `rain_14d`, `rain_anomaly` | How much rain fell recently vs normal? |
| **Interaction** | `level_rain_interaction` | High river + heavy rain = much higher risk |
| **Temperature** | `temp_max_c`, `temp_min_c`, `temp_mean_c` | Climate context |
| **Season** | `month_sin/cos`, `day_sin/cos` | Encodes the time of year as a circle so the model understands monsoon patterns |

---

## Risk Thresholds

```
Water level ≥ 2.5 m  →  Critical
Water level ≥ 2.0 m  →  High
Water level ≥ 1.5 m  →  Moderate
Water level ≥ 1.0 m  →  Low
Water level  < 1.0 m →  None
```

---

## Model Performance

| Metric | Value | Meaning |
|---|---|---|
| Risk Accuracy | **77.7%** | Correct risk category ~8 out of 10 times |
| Weighted F1 | **0.763** | Strong overall classification score |
| Water Level MAE | **0.269 m** | Predicted level is off by ~27 cm on average |
| Water Level R² | **0.817** | Model explains 81.7% of real water level variation |

---

## How live prediction works (step by step)

```
1. User opens Predictions page
2. Backend fetches last 14+ days of real gauge + rainfall data
3. Node.js calls → python ml/predict_rf.py (pipes data as JSON)
4. Python builds the same 46 features from live data
5. Classifier → outputs probability for each risk level
6. Regressor → outputs predicted water level in metres
7. Results returned for Day 1 and Day 2 ahead
8. Saved to MongoDB, displayed on dashboard
9. If risk is High/Critical → Twilio SMS sent to registered users
```

---

## What is NOT ML in FloodGuard

| Component | Approach |
|---|---|
| FAQ Chatbot | Rule-based keyword matching |
| SMS alert trigger | Hardcoded official gauge threshold rules |
| Admin dashboard stats | Database aggregation queries |

---

## One-line summary

> FloodGuard trains a Random Forest on 10 years of Gampaha river, rainfall, and climate data — engineering 46 features including lag values, rolling stats, trend indicators, and cyclical seasonal encodings — to predict the next two days' flood risk category (77.7% accuracy) and exact water level (R² = 0.817) in real time.
