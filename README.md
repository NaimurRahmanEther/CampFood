# CampFood

A campus food ordering platform that lets students browse vendor menus, place orders, and track them through to pickup or delivery — cutting out long canteen/mess lines.


## Table of contents

- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend setup](#backend-setup)
  - [Frontend setup](#frontend-setup)
- [Configuration](#configuration)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## How it works

- A student signs up and browses food items/menus available from campus vendors.
- Items are added to a cart and an order is placed.
- The order is sent to the vendor/kitchen, who updates its status as it's prepared.
- The student tracks the order status until it's ready for pickup or delivered.
- *(Edit this section to describe what CampFood actually does — e.g. is there a vendor/admin role, payment flow, delivery assignment, ratings?)*

## Tech stack

| Layer | Technology |
|---|---|
| Backend | `[e.g. Node.js / Express]` |
| Frontend | `[e.g. React]` |
| Database | `[e.g. MongoDB / PostgreSQL]` |
| Auth | `[e.g. JWT]` |

## Project structure

```
CampFood/
├── Backend/     # Server-side code: API routes, models, database logic
└── Frontend/    # Client-side application (UI)
```

## Getting started

### Prerequisites

- Node.js 16+ and npm
- `[Database name]` running locally or a connection string to a hosted instance
- Git

### Backend setup

```bash
cd Backend
npm install
cp .env.example .env    # create this file if it doesn't exist yet — see Configuration below
npm start
```

The API listens on `http://localhost:[PORT]` by default.

### Frontend setup

```bash
cd Frontend
npm install
npm start
```

The app runs on `http://localhost:3000` by default.

## Configuration

Backend configuration is environment-driven. Create a `Backend/.env` file with values such as:

| Variable | Purpose |
|---|---|
| `PORT` | API listen port |
| `DATABASE_URL` | Database connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |

*(Add any other variables your backend actually reads — payment keys, mail service, etc.)*

## Testing

```bash
# Backend
cd Backend && npm test

# Frontend
cd Frontend && npm test
```

*(Remove this section, or fill in the real test commands, if the project doesn't have tests yet.)*

## Contributing

Issues and pull requests are welcome.

1. Fork the repo and create a feature branch (`git checkout -b feature/YourFeature`)
2. Commit your changes (`git commit -m 'Add some feature'`)
3. Push to the branch (`git push origin feature/YourFeature`)
4. Open a pull request

## License

No license has been specified for this repository yet. All rights are reserved by the author until one is added.

## Author

**Naimur Rahman Ether**
GitHub: [@NaimurRahmanEther](https://github.com/NaimurRahmanEther)
