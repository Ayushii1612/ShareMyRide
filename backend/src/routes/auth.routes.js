const express = require('express');
const { validationResult } = require('express-validator');
const { register, login, forgotPassword, resetPassword, changePassword } = require('../controllers/auth.controller');
const { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, changePasswordValidator } = require('../validators/auth.validator');
const protect = require('../middlewares/auth.middleware');

const router = express.Router();
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });
	next();
};

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, resetPassword);
router.post('/change-password', protect, changePasswordValidator, validate, changePassword);
module.exports = router;
