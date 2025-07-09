# GlucoBuddy - Telegram Diabetes Assistant

GlucoBuddy is a simple yet powerful Telegram bot designed to assist with daily diabetes management. It can fetch your latest blood sugar readings from Libre Link Up and calculate the appropriate insulin bolus. With the integration of Google's Gemini AI, it can also estimate the carbohydrate content of a meal from a simple text description.

## Features

- **Blood Sugar Monitoring**: Get your current blood sugar level with a simple `/sugar` command.
- **AI-Powered Carb Calculation**: Describe your meal in a message (e.g., "a slice of pepperoni pizza and a can of coke"), and the bot will use AI to estimate the carbs and automatically calculate the required insulin bolus.
- **Manual Bolus Calculation**: Calculate an insulin dose for a specific amount of carbs using the `/mungbeans [carbs]` command.
- **Secure**: Uses environment variables to keep your API keys and credentials safe.
- **Rate Limit Aware**: Prevents spamming the Libre Link Up API to avoid getting blocked.

## Bolus Calculation Formula

The bot uses the following formula to calculate the total insulin bolus:

`Total Bolus = (Carbohydrates * 0.165) + (Correction * 0.255)`

Where:

- `Carbohydrates` are the grams of carbs you are eating (either provided manually or estimated by the AI).
- `Correction` is the difference between your current blood sugar and a target of 7 mmol/L.

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd GlucoBuddy
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Create a `.env` file:**
    Create a file named `.env` in the root of the project and add your credentials. You will need a Telegram Bot Token, your Libre Link Up credentials, and a Google Gemini API key.

    ```env
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    LIBRE_LINK_EMAIL=your-libre-link-up-email@example.com
    LIBRE_LINK_PASSWORD=your_libre_link_up_password
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    ```

4.  **Run the bot:**
    ```bash
    node main.js
    ```
    For development, you can use `nodemon` to automatically restart the server on file changes:
    ```bash
    npx nodemon main.js
    ```

## Usage

- **Get current blood sugar:**
  Send `/sugar` to the bot.

- **Calculate bolus with AI carb estimation:**
  Simply send a description of your meal as a message. The bot will handle the rest.

  > `100g of potato and 50g of mcdonalds fries`

- **Calculate bolus for a known amount of carbs:**
  Send `/mungbeans 45` to calculate the bolus for 45g of carbs.

## Disclaimer

This project is for educational purposes only and is **not a medical device**. The bolus calculations are based on a fixed formula and may not be appropriate for your individual needs. **Always consult with your healthcare provider** before making any changes to your diabetes management routine. The Libre Link Up API is unofficial and may change at any time.
