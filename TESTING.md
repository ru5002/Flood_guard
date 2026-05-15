# FloodGuard Testing Evidence

## Unit Testing

Command:

```powershell
cd backend
npm test
```

Covered:

- Sri Lankan phone number normalization for Dialog/Twilio SMS.
- Official river-gauge threshold classification.
- Forecast zone alias mapping.

## Integration Testing

Command:

```powershell
cd backend
npm test
```

Covered:

- Official Irrigation Department ArcGIS zone mapping.
- OpenWeather forecast alert shape.
- Twilio configuration check.

## Machine Learning Smoke Testing

Command:

```powershell
.\.venv\Scripts\python.exe ml\predict_test.py
```

Covered:

- Random Forest prediction script accepts recent rainfall/water-level payload.
- Output contains `day1`, `day2`, risk levels, and Random Forest model version.

## Manual Testing

Checklist:

- Register user with a Dialog number.
- Update profile zone and enable SMS alerts.
- Open Predictions page and verify relevant areas are listed.
- Click `Use My Location` and confirm distance appears in km on each card.
- Confirm each prediction card shows either `RF + Gauge` or `Gauge Only`.
- Open Weather page and verify only relevant flood-monitoring areas are shown.
- Click `Refresh Live` and confirm weather cards update without layout breakage.

## Browser Testing

Checklist:

- Desktop: verify navbar order is `Home`, `Predictions`, `Weather`, `Donate`.
- Desktop: verify Predictions map and cards fit side by side.
- Mobile: verify cards stack vertically and text does not overflow.
- Mobile: verify navbar menu opens and links work.
- Hard refresh browser with `Ctrl + Shift + R` after frontend changes.

## Security Testing

Checklist:

- Visit `/api/admin/users` without token and confirm `401 Unauthorized`.
- Visit `/api/alerts/history` without token and confirm `401 Unauthorized`.
- Confirm Twilio Auth Token is stored only in `backend/.env`.
- Confirm `.env` is not committed to Git.
- Use `.env.example` for safe documentation.
- Rotate Twilio Auth Token after screenshots or accidental exposure.
