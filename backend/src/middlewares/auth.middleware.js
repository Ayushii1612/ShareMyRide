const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
	try {
		const header = req.headers.authorization || '';
		if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required.' });
		const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
		const user = await User.findById(payload.id);
		if (!user) return res.status(401).json({ message: 'User account not found.' });
		req.user = user;
		next();
	} catch (error) {
		return res.status(401).json({ message: 'Invalid or expired authentication token.' });
	}
};

module.exports = protect;
