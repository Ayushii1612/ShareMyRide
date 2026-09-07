require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 5000;
connectDB().then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`))).catch((error) => {
	console.error('Unable to start API:', error.message);
	process.exit(1);
});
