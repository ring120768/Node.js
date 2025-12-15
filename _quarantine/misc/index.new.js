
const http = require('http');
const createApp = require('./src/app');

const app = createApp();
const port = process.env.PORT || 5000;

http.createServer(app).listen(port, () => {
  console.log(`✅ Server listening on :${port}`);
});
