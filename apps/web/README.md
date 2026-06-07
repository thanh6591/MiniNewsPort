# Mini News Portal

A modern, full-stack news portal built with Nuxt 3, Vue 3, Pinia, Drizzle ORM, and TypeScript.

## Features

### Public Site (`/`)
- Browse news articles by category
- View article details with view count tracking
- Most viewed articles daily ranking
- Infinite scroll pagination
- Responsive design with Tailwind CSS
- Architecture diagrams at `/erd`, including Bulk Import and Messaging with a beginner-focused "Backend Deep Dive" tab

### Admin Panel (`/admin`)
- Secure JWT-based authentication
- Manage categories (CRUD)
- Manage news articles (CRUD)
- Draft and publish workflow
- Dashboard with statistics

### API
- RESTful endpoints with OpenAPI documentation
- Input validation with Zod schemas
- Error handling with typed responses
- View tracking per article per day
- Public and protected endpoints

## Tech Stack

### Frontend
- **Nuxt 3** - Vue 3 framework with SSR
- **Vue 3** - Progressive UI framework
- **Pinia** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety

### Backend
- **Nitro** - Server framework (Nuxt server)
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Production database
- **SQLite** - Development database
- **Jose** - JWT token handling
- **Zod** - Schema validation

### Development
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing framework
- **ESLint** - Code quality
- **TypeScript** - Type checking

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 14+ (for production)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env.local`:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mini_news_portal

# JWT
JWT_SECRET=your-secret-key-min-32-characters

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

3. Generate database migrations:
```bash
pnpm --dir apps/web run db:generate
```

4. Run migrations:
```bash
pnpm --dir apps/web run db:migrate
```

5. Seed initial data:
```bash
pnpm --dir apps/web run db:seed
```

6. Start development server:
```bash
pnpm dev
```

Visit:
- Public site: http://localhost:3010
- Admin panel: http://localhost:3010/admin
- API OpenAPI: http://localhost:3010/api/_openapi

## Available Scripts

### Development
```bash
pnpm dev                      # Start dev server
pnpm build                    # Build for production
pnpm preview                  # Preview production build
```

### Database
```bash
pnpm db:generate             # Generate migration files
pnpm db:migrate              # Run migrations
pnpm db:seed                 # Seed sample data
```

### Testing & Quality
```bash
pnpm test                    # Run unit tests (Vitest)
pnpm test:e2e               # Run E2E tests (Playwright)
pnpm lint                   # Run ESLint
pnpm typecheck             # Run TypeScript check
```

## Security

See [THREAT_MODEL.md](./THREAT_MODEL.md) for comprehensive security analysis.

### Key Security Features
- ✅ Constant-time password comparison
- ✅ httpOnly, Secure, SameSite cookies
- ✅ JWT token expiration (1 hour)
- ✅ Input validation with Zod schemas
- ✅ Protection against SQL injection (Drizzle ORM)
- ✅ Protection against XSS (Vue auto-escaping)
- ✅ Environment variable validation at startup

## API Documentation

See [API_DOCS.md](./API_DOCS.md) for full API reference with curl examples.

### Quick API Examples

**Get categories:**
```bash
curl http://localhost:3000/api/categories
```

**List published news:**
```bash
curl 'http://localhost:3000/api/news?page=1&limit=20'
```

**Get article by slug:**
```bash
curl http://localhost:3000/api/news/article-slug
```

**Admin login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Database

Supports both PostgreSQL and SQLite through Drizzle ORM dialect switching.

### Production Build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
