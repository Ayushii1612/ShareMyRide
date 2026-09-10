const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const rideRoutes = require('./routes/ride.routes');

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'];

const app = express();
app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
		return callback(new Error('Not allowed by CORS'));
	},
	credentials: true,
}));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use((error, req, res, next) => {
	console.error(error);
	if (error?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request data is not valid JSON.' });
	if (error?.code === 11000) return res.status(409).json({ message: 'An account already exists with those details.' });
	if (error?.name === 'ValidationError') return res.status(422).json({ message: Object.values(error.errors)[0].message });
	return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;
