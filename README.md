# FloodGuard

FloodGuard is a flood-risk monitoring and alert web application focused on selected locations in Gampaha District, Sri Lanka. The system combines live weather data, official river/gauge context, a Random Forest machine learning model, user registration, admin management, Twilio SMS alerts, and email notifications to support early flood-risk communication.

## Features

- User registration and login with saved phone number and location.
- Password reset via email (token-based flow with nodemailer/SendGrid or SMTP fallback).
- In-app notification bell in the Navbar — shows current flood risk badge and recent alerts dropdown.
- User profile avatar (initials) in the Navbar for logged-in users.
- Admin login, protected admin routes, and admin logout.
- Flood-risk prediction dashboard with zone cards and map view.
- Live weather and rainfall-related data from OpenWeatherMap.
- Official gauge-based context for Gampaha-area river basins.
- Random Forest model for Aththanagalu Oya/Dunamale flood-risk support (77.7% accuracy, R² = 0.817).
- Admin-triggered SMS and/or email alert dispatch through Twilio and nodemailer.
- Separate SMS / email channel toggles in the admin alert dispatch panel.
- Alert history and SMS/email analytics for administrators.
- Donation page with flood relief imagery.
- FAQ assistant for common FloodGuard, SMS, flood-risk, and emergency questions.
- Emergency contact ribbon with key Sri Lankan emergency numbers.

## Technology Stack

**Frontend**

- React
- Vite
- React Router
- Leaflet / React Leaflet
- Axios
- Lucide React

**Backend**

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Twilio SMS API
- nodemailer (SendGrid or generic SMTP for email alerts and password reset)

**Machine Learning**

- Python
- scikit-learn
- Random Forest Classifier
- Random Forest Regressor
- pandas, NumPy, joblib

## Project Structure

```text
floodguard_final/
|-- backend/                 # Express API, MongoDB models, services, routes
|-- frontend/                # React frontend
|-- ml/                      # ML training, prediction scripts, datasets, results
|-- manual/                  # Report/manual material
|-- docker-compose.yml       # Docker setup
|-- TESTING.md               # Testing notes
`-- README.md
```

## Main Pages

- `/` - Home page
- `/map` - Flood map
- `/weather` - Weather dashboard
- `/predictions` - Flood-risk predictions
- `/login` - User login (includes Forgot Password / Reset Password flow)
- `/register` - User registration
- `/donate` - Donation page
- `/profile` - User profile
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/alerts` - SMS and email alert management

## Backend API Overview

The backend exposes REST endpoints for:

- User authentication and profile updates
- Password reset request and token verification (`/api/users/forgot-password`, `/api/users/reset-password`)
- Admin authentication, admin profile access, and admin logout
- User management
- Weather and river data pipeline
- Flood prediction retrieval
- Machine learning execution
- SMS alert dispatch, history, and statistics
- Email alert dispatch (admin-triggered, bulk or demo)

Important route groups:

```text
/api/users
/api/admin
/api/predictions
/api/pipeline
/api/ml
/api/alerts
```

## Machine Learning Scope

The deployed model uses a Random Forest approach, chosen because the available hydrological data is best represented as structured tabular features with short historical trend windows.

Two models are trained and saved together:

| Model | Description |
|---|---|
| Classifier (220 trees) | Predicts the risk category |
| Regressor (350 trees) | Predicts the exact water level in metres |

The model is trained on ~10 years (3,829 days) of real gauge, rainfall, and climate data. It engineers 46 features including 14-day lag values, rolling statistics, trend indicators, rainfall anomalies, and cyclical seasonal encodings.

**Model performance:**

| Metric | Value |
|---|---|
| Risk category accuracy | 77.7% |
| Weighted F1 | 0.763 |
| Water level MAE | 0.269 m |
| Water level R² | 0.817 |

The Random Forest model is strongest for the Aththanagalu Oya/Dunamale context. FloodGuard therefore avoids claiming that the model fully predicts every monitored town. Some locations are supported by the Random Forest model and official gauge context, while other mapped areas rely mainly on official gauge thresholds and river-basin mapping.

Risk categories:

```text
None       (water level < 1.0 m)
Low        (≥ 1.0 m)
Moderate   (≥ 1.5 m)
High       (≥ 2.0 m)
Critical   (≥ 2.5 m)
```

To train the model:

```bash
cd backend
npm run train:model
```

The main ML files are in:

```text
ml/train.py
ml/predict_rf.py
ml/models/
ml/results/
```

Note: `predict_rf.py` is the backend prediction entry point for the trained Random Forest model bundle. See `ML.md` in the project root for a plain-English explanation of the ML pipeline.

## Environment Variables

Create or update:

```text
backend/.env
```

A full example is in `backend/.env.example`. Key variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/floodguard
JWT_SECRET=replace_with_a_secure_secret

OPENWEATHER_API_KEY=your_openweather_api_key

# Twilio SMS — use either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
# TWILIO_FROM_NUMBER=+1234567890
TWILIO_TEST_TO_NUMBER=+94771234567

# Email (password reset + email alerts)
# Option A — SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
# Option B — Generic SMTP (e.g. Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="FloodGuard <no-reply@floodguard.local>"
EMAIL_FROM="FloodGuard <no-reply@floodguard.lk>"
```

If neither SendGrid nor SMTP credentials are provided, password reset codes and email alerts are printed to the backend console (demo/development fallback).

Do not commit real API keys, database passwords, or Twilio/SMTP credentials.

## Running Locally

### 1. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

If that port is busy, Vite will show another local URL.

## Testing SMS

FloodGuard includes a simple Twilio SMS test script.

From the project root:

```bash
npm run sms:test -- +94771234567 "FloodGuard test SMS"
```

Or from the backend folder:

```bash
cd backend
npm run sms:test -- +94771234567 "FloodGuard test SMS"
```

If the account is in Twilio trial mode, the receiver number must be verified in Twilio.

## Docker

The project also includes Docker support.

```bash
docker compose up --build
```

Docker exposes:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5001
```

## Admin Notes

The backend includes protected admin routes. Admin users can manage registered users, review alert history, dispatch SMS and/or email alerts, and inspect alert statistics. Admin sessions can be ended via the logout button in the admin dashboard.

The alert dispatch panel provides separate channel toggles — send SMS only, email only, or both simultaneously.

Admin route examples:

```text
/api/admin/auth/login
/api/admin/auth/logout
/api/admin/users
/api/alerts/history
/api/alerts/stats
/api/alerts/dispatch/email
```

## Academic Honesty Note

FloodGuard is a final-year/student prototype. It should be described as a flood-risk support and early-warning prototype, not as a fully certified disaster-management system. The system uses available hydrological, weather, and gauge data to estimate risk, but official disaster warnings and evacuation instructions should always come from responsible authorities such as the Disaster Management Centre and local emergency services.

## Emergency Contacts

```text
Disaster Management Centre: 117
Police Emergency: 119
Ambulance / Suwa Seriya: 1990
National Hospital Colombo: 011 2691111
```

## Useful Commands

```bash
# Frontend development
cd frontend
npm run dev

# Frontend build
cd frontend
npm run build

# Backend development
cd backend
npm run dev

# Backend tests
cd backend
npm test

# Train Random Forest model
cd backend
npm run train:model

# Test Twilio SMS
npm run sms:test -- +94771234567 "FloodGuard test SMS"
```

## Related Documentation

- `ML.md` — Plain-English explanation of the Random Forest pipeline, features, data sources, and model performance.
- `TESTING.md` — Manual and automated testing notes.
- `backend/.env.example` — Annotated environment variable reference.
