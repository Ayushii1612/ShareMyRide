const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { calculateRideRoute, createRide, searchRides, getRide, updateRideLocation } = require('../controllers/ride.controller');

const router = express.Router();
router.post('/route', calculateRideRoute);
router.post('/search', searchRides);
router.get('/:id', getRide);
router.patch('/:id/location', protect, updateRideLocation);
router.post('/', protect, createRide);

module.exports = router;