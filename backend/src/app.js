const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use((error, req, res, next) => {
	console.error(error);
	if (error?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request data is not valid JSON.' });
	if (error?.code === 11000) return res.status(409).json({ message: 'An account already exists with those details.' });
	if (error?.name === 'ValidationError') return res.status(422).json({ message: Object.values(error.errors)[0].message });
	return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;
