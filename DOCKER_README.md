# FloodGuard Docker Setup

## Run The Full App

Install Docker Desktop, open a terminal in `floodguard_final`, then run:

```bash
docker compose up --build
```

On Windows, Docker Desktop must be running. If Docker says access is denied for `docker_engine`, open the terminal as Administrator or fix Docker Desktop permissions, then run the same command again.

Docker will build and run:

- MongoDB on `localhost:27017`
- Backend API on `localhost:5000`
- Frontend on `http://localhost:5173`
- Python ML runtime inside the backend image

The backend image trains the Random Forest model during build from:

`Aththanagalu Oya Hydrological Time-Series Dataset.xlsx`

## Useful Commands

Stop the app:

```bash
docker compose down
```

Stop and remove MongoDB data:

```bash
docker compose down -v
```

Rebuild after code or model changes:

```bash
docker compose up --build
```

View logs:

```bash
docker compose logs -f backend
```

## Notes

The frontend uses Nginx to proxy `/api` requests to the backend container, so the browser should use `http://localhost:5173`.

If you have an OpenWeather key, create a local `.env` file in the project root:

```env
OPENWEATHER_API_KEY=your_key_here
```
