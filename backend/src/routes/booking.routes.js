const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { createBooking, getMyBookings } = require('../controllers/booking.controller');

const router = express.Router();

router.get('/my', protect, getMyBookings);
router.post('/', protect, createBooking);

module.exports = router;
