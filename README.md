# Chat Application

A real-time chat application built with Next.js 15, NextAuth, Prisma, PostgreSQL, and shadcn/ui components.

## Features

- **Email Authentication**: Sign in with magic link (no password required)
- **Email Verification**: Secure email verification through NextAuth
- **User Onboarding**: New users complete profile setup (name & username)
- **Real-time Chat**: Send and receive messages in real-time
- **User Search**: Find users by username or name to start conversations
- **Conversation Management**: View all your conversations with last message preview
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Built-in theme switching

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: NextAuth v5 with email provider
- **UI Components**: shadcn/ui, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Email**: Mailpit for development (SMTP testing)
- **Form Validation**: React Hook Form with Zod schemas
- **State Management**: NextAuth sessions

## Prerequisites

- Node.js 20.11.1 or higher
- Docker and Docker Compose
- pnpm package manager

## Quick Start with Docker

1. **Clone and install dependencies**

   ```bash
   git clone <your-repo-url>
   cd e2e-encryption
   pnpm install
   ```

2. **Set up with Docker (Recommended)**

   ```bash
   pnpm run docker:setup
   ```

3. **Start the development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Manual Setup

### Option 1: Docker Services

1. **Start Docker services**

   ```bash
   pnpm run docker:up
   ```

2. **Set up database**

   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

### Option 2: Local PostgreSQL

1. **Install and start PostgreSQL**

   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql

   # Create database
   createdb chat_app
   ```

2. **Update environment variables**

   ```env
   DATABASE_URL="postgresql://username@localhost:5432/chat_app"
   ```

3. **Set up database**
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/chat_app"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Email (for development with Mailpit)
EMAIL_SERVER_HOST="localhost"
EMAIL_SERVER_PORT="1025"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="noreply@localhost"
```

## How It Works

### Authentication Flow

1. **Sign In**: User enters email address
2. **Magic Link**: NextAuth sends verification email
3. **Email Verification**: User clicks link in email
4. **Onboarding Check**: System checks if user has completed profile
5. **Profile Setup**: New users complete name and username
6. **Access Granted**: User can access chat functionality

### User Journey

- **New User**: Sign in → Email verification → Onboarding → Chat
- **Existing User**: Sign in → Email verification → Chat (if onboarded)

## Docker Services

- **PostgreSQL**: Database server on port 5433
- **Mailpit**: SMTP server on port 1025, web interface on port 8025

### Docker Commands

```bash
# Start services
pnpm run docker:up

# Stop services
pnpm run docker:down

# View logs
pnpm run docker:logs

# Full setup
pnpm run docker:setup
```

## Database Schema

The application uses the following database models:

- **User**: Stores user information (id, email, name, username, isOnboarded)
- **Account**: NextAuth OAuth account linking
- **Session**: NextAuth user sessions
- **VerificationToken**: Email verification tokens
- **Conversation**: Represents chat conversations between users
- **UserConversation**: Junction table linking users to conversations
- **Message**: Stores individual messages with sender and conversation references

## API Endpoints

- `POST /api/auth/signin` - Email sign in (NextAuth)
- `GET /api/auth/[...nextauth]` - NextAuth API routes
- `POST /api/user/onboard` - Complete user onboarding
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]/messages` - Get conversation messages
- `POST /api/conversations/[id]/messages` - Send new message
- `GET /api/users/search` - Search users by username/name

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (authenticated)/   # Protected routes
│   │   ├── chat/          # Chat page
│   │   └── onboarding/    # User onboarding
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth routes
│   │   └── user/          # User management
│   └── auth/              # Authentication pages
├── components/             # Reusable UI components
├── lib/                    # Utilities and configurations
├── types/                  # TypeScript type definitions
└── styles/                 # Global styles
```

## Development

- **Linting**: `pnpm lint`
- **Formatting**: `pnpm format`
- **Build**: `pnpm build`
- **Start**: `pnpm start`

## Testing Email

During development, emails are captured by Mailpit:

1. **Send magic link** from the sign-in page
2. **Check Mailpit** at [http://localhost:8025](http://localhost:8025)
3. **Click the link** in the email to verify

## Production Deployment

1. **Update environment variables** with production values
2. **Set up production email service** (SendGrid, AWS SES, etc.)
3. **Configure production database**
4. **Build and deploy**:
   ```bash
   pnpm run build
   pnpm start
   ```

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Ensure Docker services are running: `pnpm run docker:up`
   - Check DATABASE_URL in `.env`

2. **"Email not sending"**
   - Verify Mailpit is running on port 1025
   - Check Mailpit web interface at port 8025

3. **"Authentication failed"**
   - Ensure NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain

4. **"User not found"**
   - Run database migrations: `pnpm run db:migrate`
   - Check if user exists in database

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
