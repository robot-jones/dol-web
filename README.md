# Duke of Lizards Web

## Setup

### Install dependencies

```bash
npm install
```

### Configure environment

1. Copy the file `.env.example`, naming it `.env` (git is already configured to ignore this file).

```bash
cp ./.env.example ./.env
```

2. Open the newly created `.env` file and set an appropriate value for each environment variable (e.g. `AWS_REGION=us-east-1`)

## Testing

Tests use Vitest + React Testing Library. Config lives in `vitest.config.mts` and `vitest.setup.ts`.

### Run tests:

```bash
npm run test
```

### Run tests in watch mode:

```bash
npm run test:watch
```

## UI Routes

- `/` - Home
- `/helping-friendly-book/dates` - Browse Shows by Date
- `/helping-friendly-book/locations` - Browse Shows by Location
- `/helping-friendly-book/songs` - Browse Performances by Song
- `/helping-friendly-book/songs/[slug]` - Song Performances
- `/shows/[date]` - Show
- `/shows/[date]/[position]` - Performance
- `/stash` - Your Stash
- `/logs` - Duke's Log
- `/privacy-policy` - Privacy Policy
- `/terms-of-service` - Terms of Service

## API Routes

- `/api/audit/[accountId]` - POST
- `/api/audit-logs/[key]` - GET
- `/api/mint/[accountId]/[showDate]/[position]` - POST
- `/api/mint/[accountId]/[showDate]/[position]/[serial]` - POST
- `/api/mint/[accountId]/[showDate]/[position]/[serial]/abort` - POST
- `/api/mirror/accounts/[accountId]/nfts/[tokenId]` - GET
- `/api/mirror/accounts/[accountId]/tokens/[tokenId]` - GET
- `/api/mirror/tokens/[tokenId]/nfts/[serial]` - GET
- `/api/performances/[showDate]` - GET
- `/api/performances/[showDate]/[position]` - GET
- `/api/reviews/[date]` - GET
- `/api/setlists/[dateOrSlug]` - GET
- `/api/setlists/[dateOrSlug]/[position]` - GET
- `/api/shows` - GET
- `/api/shows/[date]` - GET
- `/api/songs` - GET
- `/api/songs/[songId]` - GET
- `/api/tracks/[date]` - GET
- `/api/tracks/[date]/[position]` - GET

## Public Routes

- `/public/avatar.png`
- `/public/dol-preview.png`
- `/public/favicon.ico`
- `/public/hedera-logo.png`
- `/public/logo.png`
- `/public/manifest.json`
- `/public/robotjones.jpg`
- `/public/subjects/famous-mockingbird.png`
- `/public/subjects/harpua.png`
- `/public/subjects/helping-friendly-book.png`
- `/public/subjects/lizard.png`
- `/public/subjects/llama.png`
- `/public/subjects/multibeast.png`
- `/public/subjects/poster-nutbag.png`
- `/public/subjects/sloth.png`
