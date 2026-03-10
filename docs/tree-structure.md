# stars.guide: Project Structure
 
 ```
 stars-guide/
 ├── convex/                   # Backend (Convex)
 │   ├── (oracle)/             # Oracle-specific mutations/logic
 │   ├── _generated/           # Auto-generated Convex types
 │   ├── admin.ts              # Admin mutations
 │   ├── ai.ts                 # AI / LLM logic
 │   ├── auth.ts               # Authentication config
 │   ├── crons.ts              # Scheduled jobs (Daily Spark)
 │   ├── horoscopes.ts         # Horoscope queries & access control
 │   ├── schema.ts             # Database schema & indexes
 │   └── users.ts              # User profiles & settings
 ├── docs/                     # Documentation
 │   ├── intro.md              # Technical introduction
 │   └── tree-structure.md     # This file
 ├── public/                   # Static assets
 │   └── fonts/                # Local brand fonts
 ├── src/                      # Frontend (Next.js)
 │   ├── app/                  # App Router pages
 │   │   ├── (auth)/           # Authentication (login/signup)
 │   │   ├── (dashboard)/      # Protected user area
 │   │   ├── admin/            # Administrative portal
 │   │   ├── horoscopes/       # Individual horoscope views
 │   │   ├── onboarding/       # Birth data collection
 │   │   └── oracle/           # Oracle chat interface
 │   ├── components/           # React Components
 │   │   ├── ui/               # Primary design system (shadcn)
 │   │   ├── hero/             # Landing page visuals
 │   │   ├── pricing/          # Tier-based cards
 │   │   └── providers/        # Context providers
 │   ├── lib/                  # Shared utilities
 │   └── store/                # Client state (Zustand)
 └── package.json              # Dependencies & scripts
 ```
