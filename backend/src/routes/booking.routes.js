const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { createBooking, getMyBookings, getMyRideBookings, updatePassengerLocation, getRidePassengerLocations } = require('../controllers/booking.controller');

const router = express.Router();

router.get('/my', protect, getMyBookings);
router.get('/driver', protect, getMyRideBookings);
router.get('/ride/:rideId/locations', protect, getRidePassengerLocations);
router.patch('/ride/:rideId/location', protect, updatePassengerLocation);
router.post('/', protect, createBooking);

module.exports = router;
