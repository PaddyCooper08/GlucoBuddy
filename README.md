# GlucoBuddy Telegram Bot

GlucoBuddy is a Telegram bot that helps people with diabetes manage their blood sugar and insulin dosing. It integrates with the Freestyle Libre Link Up API to fetch your latest blood glucose readings and provides bolus insulin calculations based on your current blood sugar and carbohydrate intake.

## Features

- **/sugar**: Returns your latest blood sugar reading (in mmol/L) from Libre Link Up.
- **/mungbeans [carbs]**: Calculates your total insulin bolus for a given number of carbs, using your current blood sugar and a standard formula.

## Bolus Calculation Formula

The bot uses the following formula for bolus calculation:

```
bolus = (0.165 * carbs) + (0.255 * max(0, currentBG - 7))
```

- `carbs`: grams of carbohydrate in your meal
- `currentBG`: your current blood sugar in mmol/L (fetched from Libre Link Up)
- `7`: target blood sugar (mmol/L)

## Setup

### Prerequisites

- Node.js (v16 or higher recommended)
- A Telegram bot token (get one from [@BotFather](https://t.me/BotFather))
- Your Libre Link Up account credentials
- A publicly accessible webhook URL (for production deployment)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd GlucoBuddy
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file:**
   ```env
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   LIBRE_LINK_EMAIL=your-libre-link-up-email
   LIBRE_LINK_PASSWORD=your-libre-link-up-password
   WEBHOOK_URL=https://your-domain.com
   PORT=3000
   ```
4. **Start the bot:**
   ```bash
   node main.js
   ```

### Webhook Configuration

This bot now uses webhooks instead of polling for better performance and reliability.

**For Production:**

- Set `WEBHOOK_URL` to your publicly accessible domain (e.g., `https://your-domain.com`)
- The bot will automatically set the webhook to `https://your-domain.com/bot<your-bot-token>`
- Make sure your server is accessible from the internet and uses HTTPS

**For Development:**

- You can use tools like [ngrok](https://ngrok.com/) to create a public tunnel to your local server
- Example: `ngrok http 3000` will give you a public URL like `https://abc123.ngrok.io`
- Set this as your `WEBHOOK_URL`

**Health Check:**

- The bot includes a health check endpoint at `/health`
- You can monitor your bot's status by visiting `https://your-domain.com/health`

## Usage

- In your Telegram chat with the bot:
  - Send `/sugar` to get your latest blood sugar reading.
  - Send `/mungbeans 45` (replace 45 with your carbs) to get a bolus calculation.

## Security

- **Never share your `.env` file or credentials.**
- This bot is for educational and personal use only. Use at your own risk.

## Disclaimer

This project is not affiliated with Abbott, Freestyle, or Telegram. The Libre Link Up API is unofficial and may change at any time. Always consult your healthcare provider before making medical decisions.

## License

MIT
