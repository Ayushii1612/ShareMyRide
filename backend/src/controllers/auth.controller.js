const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const publicUser = (user) => ({
	id: user._id,
	firstName: user.firstName,
	lastName: user.lastName,
	email: user.email,
	phone: user.phone,
	role: user.role,
	phoneVerified: user.phoneVerified,
});

const register = async (req, res) => {
	const { firstName, lastName, email, phone, dateOfBirth, gender, password } = req.body;
	const normalizedEmail = email?.trim().toLowerCase();
	const normalizedPhone = phone?.replace(/[\s-]/g, '');
	const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
	if (existingUser) {
		const field = existingUser.email === normalizedEmail ? 'email' : 'phone';
		return res.status(409).json({ message: `An account already exists with this ${field}.` });
	}
	const user = await User.create({ firstName, lastName, email: normalizedEmail, phone: normalizedPhone, dateOfBirth, gender, password });
	return res.status(201).json({ token: generateToken(user), user: publicUser(user) });
};

const login = async (req, res) => {
	const { identifier, password } = req.body;
	const value = identifier?.trim();
	const query = value?.includes('@') ? { email: value.toLowerCase() } : { phone: value?.replace(/[\s-]/g, '') };
	const user = await User.findOne(query).select('+password');
	if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'The email or phone number and password do not match.' });
	return res.json({ token: generateToken(user), user: publicUser(user) });
};

module.exports = { register, login };
