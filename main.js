require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { LibreLinkClient } = require('libre-link-unofficial-api');
const express = require('express');

// --- Configuration ---
// It is strongly recommended to use environment variables for sensitive data.
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN 
const libreLinkEmail = process.env.LIBRE_LINK_EMAIL 
const libreLinkPassword = process.env.LIBRE_LINK_PASSWORD 
const webhookUrl = process.env.WEBHOOK_URL // Your public webhook URL
const port = process.env.PORT || 3000;

console.log('Using Telegram Bot Token:', telegramBotToken);

// --- Initialization ---

// Initialize Telegram Bot without polling
const bot = new TelegramBot(telegramBotToken);

// Initialize Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Set webhook
if (webhookUrl) {
  bot.setWebHook(`${webhookUrl}/bot${telegramBotToken}`)
    .then(() => {
      console.log('Webhook set successfully to:', `${webhookUrl}/bot${telegramBotToken}`);
    })
    .catch((error) => {
      console.error('Failed to set webhook:', error);
    });
} else {
  console.warn('WEBHOOK_URL not provided. Please set it in your environment variables.');
  console.warn('The bot will not receive messages without a valid webhook URL.');
}

// Webhook endpoint
app.post(`/bot${telegramBotToken}`, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook update:', error);
    res.sendStatus(500);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start the Express server
app.listen(port, () => {
  console.log(`GlucoBuddy webhook server is running on port ${port}`);
});


// Initialize LibreLinkClient
const libreClient = new LibreLinkClient({
  email: libreLinkEmail,
  password: libreLinkPassword,
});

// Cache login state
let isLoggedIn = false;
let lastRequestTime = 0;
const REQUEST_COOLDOWN = 60000; // 1 minute cooldown between requests

// --- Bolus Calculation Function ---
function calculateBolus(carbs, bg, targetBG = 7) {
  const a = 0.165;  // insulin units per gram of carbs
  const b = 0.255;  // insulin units per mmol/L correction

  const correction = Math.max(0, bg - targetBG);
  const bolus = a * carbs + b * correction;

  return bolus;
}

// --- Bot Logic ---

// Listen for the /sugar command
bot.onText(/sugar/, async (msg) => {
  const chatId = msg.chat.id;

  
  // Check cooldown
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_COOLDOWN) {
    const waitTime = Math.ceil((REQUEST_COOLDOWN - (now - lastRequestTime)) / 1000);
    bot.sendMessage(chatId, `Please wait ${waitTime} seconds before making another request.`);
    return;
  }
  
  try {
    bot.sendMessage(chatId, 'Fetching your blood sugar level, please wait...');

    // Log in only if not already logged in
    if (!isLoggedIn) {
      await libreClient.login();
      isLoggedIn = true;
    }

    // Get the latest blood glucose reading
    const reading = await libreClient.read();
    lastRequestTime = now;

    if (reading && reading.value) {
      const convertedValue = (reading.value / 18).toFixed(1);
      bot.sendMessage(chatId, convertedValue);
    } else {
      bot.sendMessage(chatId, 'Could not retrieve blood sugar reading. Please try again later.');
    }
  } catch (error) {
    console.error('Error fetching blood sugar data:', error);
    
    // Reset login state on error
    if (error.message.includes('430')) {
      isLoggedIn = false;
      bot.sendMessage(chatId, 'Rate limit exceeded. Please wait a few minutes before trying again.');
    } else {
      bot.sendMessage(chatId, 'Sorry, something went wrong while fetching your data.');
    }
  }
});

// Listen for the /bolus command
bot.onText(/mungbeans (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const carbs = parseInt(match[1]);

  if (isNaN(carbs) || carbs <= 0) {
    bot.sendMessage(chatId, 'Please provide a valid number of carbs. Example: /bolus 45');
    return;
  }

  try {
    bot.sendMessage(chatId, 'Calculating bolus dose, please wait...');

    // Log in only if not already logged in
    if (!isLoggedIn) {
      await libreClient.login();
      isLoggedIn = true;
    }

    // Get the latest blood glucose reading
    const reading = await libreClient.read();

    if (reading && reading.value) {
      const currentBG = (reading.value / 18); // Convert to mmol/L
      const targetBG = 7; // Target sugar in mmol/L

      const totalBolus = calculateBolus(carbs, currentBG, targetBG);

      const message = `💉 Bolus Calculation:
📊 Current BG: ${currentBG.toFixed(1)} mmol/L
🎯 Target BG: ${targetBG} mmol/L
🍞 Carbs: ${carbs}g

💉 Total Bolus: ${totalBolus.toFixed(2)} units`;

      bot.sendMessage(chatId, message);
    } else {
      bot.sendMessage(chatId, 'Could not retrieve blood sugar reading. Please try again later.');
    }
  } catch (error) {
    console.error('Error calculating bolus:', error);
    
    // Reset login state on error
    if (error.message.includes('430')) {
      isLoggedIn = false;
      bot.sendMessage(chatId, 'Rate limit exceeded. Please wait a few minutes before trying again.');
    } else {
      bot.sendMessage(chatId, 'Sorry, something went wrong while calculating bolus.');
    }
  }
});

console.log('GlucoBuddy Telegram bot message handlers are ready...');

