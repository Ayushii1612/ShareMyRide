const express = require('express');
const { validationResult } = require('express-validator');
const { register, login } = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');

const router = express.Router();
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });
	next();
};

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
module.exports = router;
