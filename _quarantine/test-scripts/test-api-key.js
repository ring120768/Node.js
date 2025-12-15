require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log('Testing NEW OpenAI API key from .env...');
console.log('Key prefix:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');

(async () => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    });

    console.log('✅ API key is VALID and working!');
    console.log('Response:', response.choices[0].message.content);
    process.exit(0);
  } catch (error) {
    console.error('❌ API key test FAILED');
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    process.exit(1);
  }
})();
