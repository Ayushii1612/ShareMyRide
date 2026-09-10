const Ride = require('../models/Ride');
const { calculateRoute, routeMatch } = require('../services/route.service');

const validateLocation = (location) => location && typeof location.name === 'string' && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

const calculateRideRoute = async (req, res) => {
	const { origin, destination, stops = [] } = req.body;
	if (!validateLocation(origin) || !validateLocation(destination) || !stops.every(validateLocation)) return res.status(422).json({ message: 'Origin, destination, and stops must include a name, latitude, and longitude.' });
	const route = await calculateRoute(origin, destination, stops);
	return res.json(route);
};

const createRide = async (req, res) => {
	const { origin, destination, stops = [], departureAt, availableSeats, pricePerSeat = 0, routeDistanceMeters, routeDurationSeconds, routeGeometry } = req.body;
	if (!validateLocation(origin) || !validateLocation(destination) || !Array.isArray(routeGeometry?.coordinates) || !routeGeometry.coordinates.length) return res.status(422).json({ message: 'Ride locations and a calculated route are required.' });
	const ride = await Ride.create({ driver: req.user._id, origin, destination, stops, departureAt, availableSeats, pricePerSeat, routeDistanceMeters, routeDurationSeconds, routeGeometry });
	return res.status(201).json({ ride });
};

const searchRides = async (req, res) => {
	const { pickup, dropoff, departureDate, maxRouteDistanceMeters = 5000, maxDetourMeters = 15000 } = req.body;
	if (!validateLocation(pickup) || !validateLocation(dropoff)) return res.status(422).json({ message: 'Pickup and drop-off must include a name, latitude, and longitude.' });
	const dayStart = new Date(departureDate);
	if (Number.isNaN(dayStart.getTime())) return res.status(422).json({ message: 'A valid departure date is required.' });
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(dayStart);
	dayEnd.setDate(dayEnd.getDate() + 1);
	const rides = await Ride.find({ status: 'published', availableSeats: { $gt: 0 }, departureAt: { $gte: dayStart, $lt: dayEnd } }).populate('driver', 'firstName lastName').lean();
	const matches = rides.map((ride) => ({ ride, match: routeMatch(ride, pickup, dropoff, { maxRouteDistanceMeters: Number(maxRouteDistanceMeters), maxDetourMeters: Number(maxDetourMeters) }) })).filter((item) => item.match.compatible).sort((first, second) => first.match.score - second.match.score);
	return res.json({ rides: matches });
};

const getRide = async (req, res) => {
	const ride = await Ride.findById(req.params.id).populate('driver', 'firstName lastName');
	if (!ride) return res.status(404).json({ message: 'Ride not found.' });
	return res.json({ ride });
};

module.exports = { calculateRideRoute, createRide, searchRides, getRide };