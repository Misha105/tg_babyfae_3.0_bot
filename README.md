# Babyfae 3.0

Telegram Mini App for infant care tracking.

## Project Structure

- `frontend/`: React + Vite + Tailwind CSS (The Mini App)
- `bot/`: Node.js + Express + Telegraf (The Backend & Bot)

## Getting Started

### Prerequisites

- Node.js 20+
- Telegram Bot Token (from @BotFather)

### Installation

1. Install dependencies for all packages:
   ```bash
   npm run install:all
   ```

2. Configure the Bot:
   - Copy `bot/.env.example` to `bot/.env`
   - Add your `TELEGRAM_BOT_TOKEN`

### Running Locally

1. Start both frontend and backend:
   ```bash
   npm run dev
   ```

2. Expose your local frontend to the internet (required for Telegram Web App):
   - Use **Cloudflare Tunnel** (`cloudflared`):
     ```bash
     # If you have cloudflared installed:
     cloudflared tunnel --url http://localhost:5173
     ```
     *Alternatively, you can use `npm run tunnel` if you have cloudflared in your PATH.*
   
   - Copy the HTTPS URL (e.g., `https://xxxx-xxxx.trycloudflare.com`)

3. Configure the Bot in Telegram:
   - Open @BotFather
   - Select your bot
   - Go to **Bot Settings** > **Menu Button** > **Configure Menu Button**
   - Send the HTTPS URL from step 2

### Features

- **Data Persistence**: Uses Telegram CloudStorage with a local fallback for development.
- **Notifications**: Scheduled via the Bot backend.
- **Offline Support**: Optimistic UI updates.

## Development

- **Frontend**: Runs on port 5173
- **Backend**: Runs on port 3000

To test notifications locally, ensure the backend is running and configured with a valid Bot Token.
