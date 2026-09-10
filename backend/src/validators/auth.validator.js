const { body } = require('express-validator');

const registerValidator = [
	body('firstName').trim().notEmpty().withMessage('First name is required.'),
	body('lastName').trim().notEmpty().withMessage('Last name is required.'),
	body('email').isEmail().withMessage('Enter a valid email address.'),
	body('phone').custom((value) => {
		const digits = String(value || '').replace(/\D/g, '');
		if (digits.length < 10) throw new Error('Phone number must contain at least 10 digits.');
		return true;
	}).withMessage('Phone number must contain at least 10 digits.'),
	body('dateOfBirth').isISO8601().withMessage('Enter a valid date of birth.'),
	body('gender').isIn(['female', 'male', 'prefer-not-to-say']).withMessage('Choose how you would like to be addressed.'),
	body('password').isLength({ min: 8 }).matches(/[A-Za-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/).withMessage('Password must contain 8 characters, a letter, a number, and a special character.'),
];

const loginValidator = [body('identifier').trim().notEmpty().withMessage('Email or phone number is required.'), body('password').notEmpty().withMessage('Password is required.')];
const forgotPasswordValidator = [body('email').isEmail().withMessage('Enter a valid email address.')];
const resetPasswordValidator = [
	body('token').trim().notEmpty().withMessage('Reset token is missing.'),
	body('password').isLength({ min: 8 }).matches(/[A-Za-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/).withMessage('Password must contain 8 characters, a letter, a number, and a special character.'),
];
const changePasswordValidator = [
	body('currentPassword').notEmpty().withMessage('Current password is required.'),
	body('password').isLength({ min: 8 }).matches(/[A-Za-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/).withMessage('Password must contain 8 characters, a letter, a number, and a special character.'),
];

module.exports = { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, changePasswordValidator };
