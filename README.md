# YMoginator

Gym accountability for YC founders. Book shared gym sessions, verify check-ins with in-browser AI, and compete on the streak leaderboard.

Built by Vikram from [Ardent](https://tryardent.com/) (YC X26).

## What is this?

YMoginator is an open source community tool for YC founders who want to work out together. It's part gym booking system, part fitness accountability app, with a fun competitive leaderboard.

**Features:**
- **Book gym sessions** — Reserve time slots at popular SF gyms, see who else is going
- **AI-verified check-ins** — Take a gym selfie and an in-browser vision model (SmolVLM-256M) verifies you're actually at the gym. No cheating!
- **Streak leaderboard** — Build your gym streak and compete with other founders. Streak badges go from Normie to Tera Chad
- **YC founder verification** — Sign up with your YC verification link to prove you're a real founder

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — Postgres, Auth, Storage, RLS
- **shadcn/ui** + Tailwind CSS
- **Transformers.js** + SmolVLM-256M-Instruct — in-browser gym photo verification via Web Worker
- **date-fns** for date handling

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/VikramChennai/YMoginator.git
   cd YMoginator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run the database migration:
   ```bash
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Streak Badges

| Streak | Badge |
|--------|-------|
| 1-2 days | Normie |
| 3-6 days | Chadlite |
| 7-13 days | Chad |
| 14-29 days | GigaChad |
| 30+ days | Tera Chad |

## License

MIT
