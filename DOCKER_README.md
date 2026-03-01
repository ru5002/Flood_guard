# Docker Configuration

## Instructions to Run with Docker

1.  **Install Docker Desktop**: Ensure Docker is installed and running.
2.  **Build and Start**: Open a terminal in the project root (`floodguard_final`) and run:
    ```bash
    docker-compose up --build
    ```
3.  **Access App**:
    -   Frontend: [http://localhost](http://localhost)
    -   Backend API: [http://localhost:5000](http://localhost:5000)
    -   MongoDB: `mongodb://localhost:27017` (Connect via Compass)

## Configuration Details

-   **Frontend**: Served via Nginx on port 80. Proxies `/api` requests to the backend.
-   **Backend**: Node.js server on port 5000. Connected to MongoDB container.
-   **MongoDB**: Persistent database storage in `floodguard_data` volume. exposed on port 27017.

## Notes
-If you change code, rebuild with `docker-compose up --build`.
-Data persists even if containers are stopped. ensure unique `floodguard_data` volume name if running multiple instances.
