const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../services/email.service');

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

const forgotPassword = async (req, res) => {
	const { email } = req.body;
	const normalizedEmail = String(email || '').trim().toLowerCase();
	const user = await User.findOne({ email: normalizedEmail });
	if (!user) return res.status(404).json({ message: 'No account found with that email address.' });
	const resetToken = crypto.randomBytes(32).toString('hex');
	user.resetPasswordToken = resetToken;
	user.resetPasswordExpiresAt = Date.now() + 60 * 60 * 1000;
	await user.save();
	const emailResult = await sendPasswordResetEmail(user.email, resetToken);
	return res.json({
		message: emailResult.sent
			? 'Password reset link sent to your registered email.'
			: (emailResult.message || 'Email service is not configured, so here is the reset link for local testing.'),
		resetLink: emailResult.resetLink,
	});
};

const resetPassword = async (req, res) => {
	const { token, password } = req.body;
	const user = await User.findOne({
		resetPasswordToken: token,
		resetPasswordExpiresAt: { $gt: Date.now() },
	});
	if (!user) return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });
	user.password = password;
	user.resetPasswordToken = undefined;
	user.resetPasswordExpiresAt = undefined;
	await user.save();
	return res.json({ message: 'Your password has been updated successfully.' });
};

const changePassword = async (req, res) => {
	const { currentPassword, password } = req.body;
	const user = await User.findById(req.user._id).select('+password');
	if (!user || !(await user.comparePassword(currentPassword))) return res.status(401).json({ message: 'Current password is incorrect.' });
	user.password = password;
	await user.save();
	return res.json({ message: 'Your password has been updated successfully.' });
};

module.exports = { register, login, forgotPassword, resetPassword, changePassword };
