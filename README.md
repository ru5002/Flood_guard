# FloodGuard

FloodGuard is a flood-risk monitoring and alert web application focused on selected locations in Gampaha District, Sri Lanka. The system combines live weather data, official river/gauge context, a Random Forest machine learning model, user registration, admin management, and Twilio SMS alerts to support early flood-risk communication.

## Features

- User registration and login with saved phone number and location.
- Admin login and protected admin routes.
- Flood-risk prediction dashboard with zone cards and map view.
- Live weather and rainfall-related data from OpenWeatherMap.
- Official gauge-based context for Gampaha-area river basins.
- Random Forest model for Aththanagalu Oya/Dunamale flood-risk support.
- SMS alert dispatch through Twilio.
- Alert history and SMS analytics for administrators.
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
- `/login` - User login
- `/register` - User registration
- `/profile` - User profile
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/alerts` - SMS alert management

## Backend API Overview

The backend exposes REST endpoints for:

- User authentication and profile updates
- Admin authentication and admin profile access
- User management
- Weather and river data pipeline
- Flood prediction retrieval
- Machine learning execution
- SMS alert dispatch, history, and statistics

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

The final deployed model uses a Random Forest approach. The original LSTM approach was explored, but the final prototype uses Random Forest because the available hydrological data is strongest for structured tabular features and short historical trend features.

The Random Forest model is strongest for the Aththanagalu Oya/Dunamale context. FloodGuard therefore avoids claiming that the model fully predicts every monitored town. Some locations are supported by the Random Forest model and official gauge context, while other mapped areas rely mainly on official gauge thresholds and river-basin mapping.

Risk categories:

```text
None
Low
Moderate
High
Critical
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

Note: `predict_rf.py` is the backend prediction entry point for the trained Random Forest model bundle.

## Environment Variables

Create or update:

```text
backend/.env
```

Example:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/floodguard
JWT_SECRET=replace_with_a_secure_secret

OPENWEATHER_API_KEY=your_openweather_api_key

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid
# Or use a Twilio sender number instead:
# TWILIO_FROM_NUMBER=+1234567890

TWILIO_TEST_TO_NUMBER=+94771234567
```

Do not commit real API keys, database passwords, or Twilio credentials.

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

See `DOCKER_README.md` for more Docker-specific notes.

## Admin Notes

The backend includes protected admin routes. Admin users can manage registered users, review alert history, dispatch SMS alerts, and inspect alert statistics.

Admin route examples:

```text
/api/admin/auth/login
/api/admin/users
/api/alerts/history
/api/alerts/stats
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
