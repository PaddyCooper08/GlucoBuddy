(async () => {
  const dotenv = await import('dotenv');
  dotenv.config();

  const TelegramBot = (await import('node-telegram-bot-api')).default;
  const { LibreLinkClient } = await import('libre-link-unofficial-api');
  const http = (await import('http')).default;
  const { GoogleGenAI } = await import('@google/genai');



  // --- Configuration ---
  // It is strongly recommended to use environment variables for sensitive data.
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN 
  const libreLinkEmail = process.env.LIBRE_LINK_EMAIL 
  const libreLinkPassword = process.env.LIBRE_LINK_PASSWORD 
  const geminiApiKey = process.env.GEMINI_API_KEY;
  console.log('Using Telegram Bot Token:', telegramBotToken);

  // --- Initialization ---

  // Initialize Telegram Bot without polling
  const bot = new TelegramBot(telegramBotToken, {polling: true});

  // Initialize Express app


  // Parse JSON bodies


  // Webhook endpoint


  // Initialize Google Generative AI
  const ai = new GoogleGenAI({geminiApiKey});


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
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        isLoggedIn = false;
        bot.sendMessage(chatId, '❌ Authentication failed. Please check your LibreLink credentials.');
      } else if (error.message.includes('Network') || error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
        bot.sendMessage(chatId, '🌐 Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('No data')) {
        bot.sendMessage(chatId, '📊 No blood sugar data available. Make sure your sensor is active.');
      } else {
        bot.sendMessage(chatId, `❌ Error fetching blood sugar data: ${error.message}`);
      }
    }
  });

  // Helper function to calculate and send bolus information
  async function calculateAndSendBolus(chatId, carbs, foodDescription = null) {
    try {
      const initialMessage = foodDescription 
        ? `AI estimated ${carbs}g carbs for "${foodDescription}".\nFetching sugar and calculating bolus...`
        : `Calculating bolus for ${carbs}g carbs...`;
      bot.sendMessage(chatId, initialMessage);

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
${foodDescription ? `🍽️ Meal: ${foodDescription}\n` : ''}🍞 Carbs: ${carbs}g
📊 Current BG: ${currentBG.toFixed(1)} mmol/L
🎯 Target BG: ${targetBG} mmol/L

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
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        isLoggedIn = false;
        bot.sendMessage(chatId, '❌ Authentication failed. Please check your LibreLink credentials.');
      } else if (error.message.includes('Network') || error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
        bot.sendMessage(chatId, '🌐 Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('No data')) {
        bot.sendMessage(chatId, '📊 No blood sugar data available. Make sure your sensor is active.');
      } else {
        bot.sendMessage(chatId, `❌ Error calculating bolus: ${error.message}`);
      }
    }
  }

  // Listen for the /bolus command
  bot.onText(/mungbeans (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const carbs = parseInt(match[1]);

    if (isNaN(carbs) || carbs <= 0) {
      bot.sendMessage(chatId, 'Please provide a valid number of carbs. Example: /mungbeans 45');
      return;
    }

    await calculateAndSendBolus(chatId, carbs);
  });

  // Listen for any message to use as a food description for carb calculation
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore empty messages or messages from other bots
    if (!text || msg.from.is_bot) {
      return;
    }

    // Ignore commands that are handled by other listeners
    if (text.startsWith('sugar') || text.startsWith('mungbeans')) {
      return;
    }

    // The entire message is treated as the food description
    const foodDescription = text;

    try {
      bot.sendMessage(chatId, `Asking the AI to calculate carbs for: "${foodDescription}"...`);

      const prompt = `How many carbs are in ${foodDescription}? Provide only the total number of carbs in grams as a single number.`;
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const aiResponseText = result.text;

      // Extract the first number (float or int) from the AI's response
      const numberMatch = aiResponseText.match(/\d+(\.\d+)?/);
      const carbsRaw = numberMatch ? parseFloat(numberMatch[0]) : NaN;

      if (isNaN(carbsRaw)) {
        bot.sendMessage(chatId, `The AI's response ("${aiResponseText}") could not be understood as a number. Please try again.`);
        return;
      }

      // Round the carb value to 2 decimal places
      const carbs = parseFloat(carbsRaw.toFixed(2));

      // Pass the carb count to the bolus calculation function
      await calculateAndSendBolus(chatId, carbs, foodDescription);

    } catch (error) {
      console.error('Error with Gemini API:', error);
      
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
        bot.sendMessage(chatId, '🔑 Invalid Gemini API key. Please check your configuration.');
      } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
        bot.sendMessage(chatId, '🚫 AI service quota exceeded. Please try again later.');
      } else if (error.message.includes('Network') || error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
        bot.sendMessage(chatId, '🌐 Network error connecting to AI service. Please try again.');
      } else {
        bot.sendMessage(chatId, `🤖 AI error: ${error.message}. Please try again later.`);
      }
    }
  });

  // Add health check server for Cloud Run
  const port = process.env.PORT || 8080;
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
  });

  console.log('GlucoBuddy Telegram bot is running...');
})();

