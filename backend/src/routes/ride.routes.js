const express = require('express');
const protect = require('../middlewares/auth.middleware');
const { calculateRideRoute, createRide, searchRides, getRide } = require('../controllers/ride.controller');

const router = express.Router();
router.post('/route', calculateRideRoute);
router.post('/search', searchRides);
router.get('/:id', getRide);
router.post('/', protect, createRide);

module.exports = router;