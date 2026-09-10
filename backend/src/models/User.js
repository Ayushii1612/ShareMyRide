const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
	firstName: { type: String, required: true, trim: true },
	lastName: { type: String, required: true, trim: true },
	email: { type: String, required: true, unique: true, lowercase: true, trim: true },
	phone: { type: String, required: true, unique: true, trim: true },
	dateOfBirth: { type: Date, required: true },
	gender: { type: String, enum: ['female', 'male', 'prefer-not-to-say'], required: true },
	password: { type: String, required: true, minlength: 8, select: false },
	role: { type: String, enum: ['user', 'admin'], default: 'user' },
	phoneVerified: { type: Boolean, default: false },
	resetPasswordToken: { type: String, default: null },
	resetPasswordExpiresAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function save() {
	if (!this.isModified('password')) return;
	this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(password) {
	return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
