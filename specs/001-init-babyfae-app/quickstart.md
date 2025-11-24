# Quickstart: Babyfae Development

## Prerequisites

- Node.js 20+
- npm or pnpm
- Docker & Docker Compose (for production simulation)
- cloudflared (for local Telegram testing)
- A Telegram Bot Token (from @BotFather)

## Setup

1.  **Clone & Install**
    ```bash
    git clone <repo>
    cd babyfae
    npm install # Installs root dependencies if any
    cd frontend && npm install
    cd ../bot && npm install
    ```

2.  **Environment Variables**
    Create `.env` in `frontend/` and `bot/` based on `.env.example`.

    **frontend/.env**:
    ```env
    VITE_BOT_USERNAME=your_bot_username
    VITE_API_URL=http://localhost:3001/api
    VITE_MOCK_TELEGRAM=true # Set to false for real testing
    ```

    **bot/.env**:
    ```env
    TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
    PORT=3001
    DATABASE_PATH=./data/dev.db
    ```

3.  **Run Local Dev**
    ```bash
    # Terminal 1: Frontend
    cd frontend
    npm run dev

    # Terminal 2: Bot
    cd bot
    npm run dev
    ```

4.  **Test in Telegram**
    - Start cloudflared: `cloudflared tunnel --url http://localhost:5173`
    - Update Bot Menu Button in @BotFather to the generated URL (ends with .trycloudflare.com).
    - Open bot in Telegram.

## Mock Mode

If `VITE_MOCK_TELEGRAM=true`, the app runs in the browser with simulated Telegram environment and mock CloudStorage. This is the fastest way to develop UI.
