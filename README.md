# Cloud File Storage System

A web platform for cloud file storage, featuring user authentication, file upload/download, folder management, and more.

## Tech Stack
- **Frontend**: React (Vite)
- **Backend**: Spring Boot
- **Database**: MySQL
- **Object Storage**: MinIO

## Prerequisites
- Docker & Docker Compose

## Getting Started

1. **Clone the repository** (if applicable)

2. **Start the services**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:8080](http://localhost:8080)
   - MinIO Console: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)

## Project Structure
- `backend/`: Spring Boot application
- `frontend/`: React application
- `docker-compose.yml`: Orchestration

## Development
To run services individually, check the `README.md` inside each service folder (to be added).
