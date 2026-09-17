# CampusFood

CampusFood is a campus food ordering platform with a Go backend and a Next.js frontend. It supports student accounts, food and product management, campus kitchens, orders, student points, hall festivals, notifications, and an AI food assistant.

## Project Structure

```text
CampusFood/
├── Backend/     Go REST API, PostgreSQL access, and database migrations
└── Frontend/    Next.js web application
```

## Technology Stack

- **Backend:** Go 1.22+, PostgreSQL
- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Package managers:** Go modules and pnpm

## Prerequisites

Install the following before running the project:

- Go 1.22 or newer
- Node.js 20 or newer
- pnpm
- PostgreSQL

## Backend Setup

1. Create a PostgreSQL database for CampusFood.
2. Create `Backend/.env` with the required configuration:

```env
VERSION=1.0.0
SERVICE_NAME=campusfood
HTTP_PORT=8000
JWT_SECRET=replace-with-a-long-random-secret
Admin_Email=admin@example.com
Admin_Password=replace-with-a-secure-password
Admin_Login_ID=0000000000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=replace-with-your-database-password
DB_NAME=campusfood
SSL_MODE=false

# Optional: required only for the AI assistant
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

3. Start the backend from its directory:

```bash
cd Backend
go mod download
go run .
```

The backend applies database migrations from `Backend/migration` when it starts and listens on `http://localhost:8000` when `HTTP_PORT=8000`.

## Frontend Setup

Install dependencies and start the development server:

```bash
cd Frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

The frontend expects the backend at `http://localhost:8000`. See [Frontend/BACKEND_ENDPOINTS.md](Frontend/BACKEND_ENDPOINTS.md) for the endpoint contract and request examples.

## Useful Commands

### Backend

```bash
cd Backend
go test ./...
go run .
```

### Frontend

```bash
cd Frontend
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## API Overview

The backend provides REST endpoints for:

- Student registration and login
- Student kitchens, hall kitchens, and camp kitchens
- Food catalog and product management
- Food orders and delivery forwarding
- Student points and expiry tracking
- Hall festivals
- Food reviews
- Notifications
- Admin operations
- AI-assisted food and order interactions

For the detailed frontend-facing API contract, see [Frontend/BACKEND_ENDPOINTS.md](Frontend/BACKEND_ENDPOINTS.md).

## Security Notes

- Do not commit `Backend/.env` or any passwords, JWT secrets, database credentials, or API keys.
- Use strong, unique values for `JWT_SECRET`, `Admin_Password`, and `DB_PASSWORD`.
- Keep `OPENAI_API_KEY` server-side and never expose it through frontend code.

## License

No license has been added to this repository yet.
