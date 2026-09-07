const jwt = require('jsonwebtoken');

const generateToken = (user) => jwt.sign(
	{ id: user._id.toString(), role: user.role },
	process.env.JWT_SECRET || 'development-only-secret',
	{ expiresIn: '7d' },
);

module.exports = generateToken;
