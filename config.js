// Configuration file for WhatsApp Bot
// Add your API keys here

module.exports = {
    // OpenAI API Configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '', // Add your OpenAI API key here
        model: 'gpt-3.5-turbo', // Default model
        maxTokens: 1000, // Maximum tokens for responses
        temperature: 0.7 // Creativity level (0.0 to 1.0)
    },
    
    // Other API configurations can be added here
    weather: {
        apiKey: process.env.WEATHER_API_KEY || '' // Optional: for more detailed weather data
    },
    
    // Bot settings
    bot: {
        name: 'BIG TENNET Bot',
        version: '2.0.0',
        creator: 'BIG TENNET https://instagram.com/bigtennet',
        website: 'https://bigtennet.com'
    }
}; 