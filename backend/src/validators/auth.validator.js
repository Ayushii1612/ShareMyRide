const { body } = require('express-validator');

const registerValidator = [
	body('firstName').trim().notEmpty().withMessage('First name is required.'),
	body('lastName').trim().notEmpty().withMessage('Last name is required.'),
	body('email').isEmail().withMessage('Enter a valid email address.'),
	body('phone').matches(/^\+?[0-9]{10,15}$/).withMessage('Enter a valid phone number.'),
	body('dateOfBirth').isISO8601().withMessage('Enter a valid date of birth.'),
	body('gender').isIn(['female', 'male', 'prefer-not-to-say']).withMessage('Choose how you would like to be addressed.'),
	body('password').isLength({ min: 8 }).matches(/[A-Za-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/).withMessage('Password must contain 8 characters, a letter, a number, and a special character.'),
];

const loginValidator = [body('identifier').trim().notEmpty().withMessage('Email or phone number is required.'), body('password').notEmpty().withMessage('Password is required.')];

module.exports = { registerValidator, loginValidator };
