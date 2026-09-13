require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
connectDB()
  .then(() => console.log('Database connected successfully.'))
  .catch((error) => console.warn('MongoDB connection warning:', error.message));

