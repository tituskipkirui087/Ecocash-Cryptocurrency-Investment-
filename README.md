# Ecocash Investment Platform

A modern web application for investment management with EcoCash and USDT TRC20 payment integration.

## Tech Stack

### Frontend
- Next.js 15
- React 18
- Tailwind CSS
- TypeScript

### Backend
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM

### Key Features
- JWT Authentication
- Email Verification
- Telegram Bot Integration
- EcoCash / USDT Payments
- Investment Tracking
- Profit Monitoring
- Withdrawal System
- Audit Logging

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Fill in your database credentials, email settings, and Telegram bot token

4. Set up the database:
   ```bash
   cd server
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. Run development servers:
   ```bash
   npm run dev
   ```

## Project Structure

```
ecocash-investment-platform/
├── client/                 # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   │   ├── dashboard/ # User dashboard
│   │   │   ├── admin/     # Admin panels
│   │   │   ├── login/     # Login page
│   │   │   └── register/  # Register page
│   │   ├── components/    # Reusable components
│   │   ├── context/       # Auth context
│   │   └── lib/           # API client
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── prisma/            # Database schema
│   └── src/
│       ├── controllers/   # Route handlers
│       ├── middleware/    # Auth & validation
│       ├── routes/        # API routes
│       ├── services/      # Email & Telegram
│       └── utils/         # Helpers
└── package.json           # Root workspace config
```

## Default Credentials

After seeding:
- Admin: `admin@ecocashinvestment.com` / `admin123`
- Investor: `investor@example.com` / `investor123`

## Deployment

1. Build both projects:
   ```bash
   npm run build
   ```

2. Configure Nginx as reverse proxy
3. Set up SSL certificate
4. Run with PM2:
   ```bash
   npx tsc -p server/tsconfig.json
   node server/dist/index.js
   cd client && npm start
   ```

## Environment Variables

### Server (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` - SMTP settings
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` - Telegram bot credentials
- `TRC20_WALLET_ADDRESS` - USDT deposit wallet
- `ECOASH_NUMBER` - Customer support EcoCash number

### Client (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_TRC20_WALLET` - Display wallet address on deposit page

## Features Overview

### Investor Features
- Registration with email verification
- View dashboard with investment overview
- Submit investment requests ($100 minimum)
- Deposit via EcoCash or USDT TRC20
- Track profits and losses in real-time
- Request withdrawals
- Manage profile settings

### Admin Features
- Dashboard with platform statistics
- User management (search, activate/deactivate)
- Investment management (view, start trade, close trade, update profits)
- Deposit approval/rejection
- Withdrawal approval/rejection
- Audit log review
- Telegram notifications for all actions

### Telegram Bot
- Receive real-time notifications
- Approve/reject actions from chat
- View pending requests
- Send payment details directly

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CSRF protection ready
- Audit logging
- Secure file uploads
- HTTPS enforcement

## License

Private - All rights reserved
