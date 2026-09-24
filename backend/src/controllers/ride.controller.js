const Ride = require('../models/Ride');
const { calculateRoute, findCompatibleRides } = require('../services/route.service');

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
	const { pickup, dropoff, departureDate, passengers = 1, maxRouteDistanceMeters = 5000, maxDetourMeters = 15000 } = req.body;
	if (!validateLocation(pickup) || !validateLocation(dropoff)) return res.status(422).json({ message: 'Pickup and drop-off must include a name, latitude, and longitude.' });
	const requestedSeats = Number(passengers);
	if (!Number.isInteger(requestedSeats) || requestedSeats < 1 || requestedSeats > 4) return res.status(422).json({ message: 'Passengers must be a whole number between 1 and 4.' });
	const dayStart = new Date(departureDate);
	if (Number.isNaN(dayStart.getTime())) return res.status(422).json({ message: 'A valid departure date is required.' });
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(dayStart);
	dayEnd.setDate(dayEnd.getDate() + 1);
	const dateRides = await Ride.find({ status: 'published', departureAt: { $gte: dayStart, $lt: dayEnd } }).populate('driver', 'firstName lastName').lean();
	const seatEligibleRides = dateRides.filter((ride) => ride.availableSeats >= requestedSeats);
	const matches = findCompatibleRides(seatEligibleRides, pickup, dropoff, { requestedSeats, maxRouteDistanceMeters: Number(maxRouteDistanceMeters), maxDetourMeters: Number(maxDetourMeters) });
	return res.json({
		success: true,
		count: matches.length,
		rides: matches,
		diagnostics: {
			dateRides: dateRides.length,
			seatEligibleRides: seatEligibleRides.length,
			compatibleRides: matches.length,
			requestedSeats,
			departureDate,
			pickup: { latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) },
			dropoff: { latitude: Number(dropoff.latitude), longitude: Number(dropoff.longitude) },
		},
	});
};

const getRide = async (req, res) => {
	const ride = await Ride.findById(req.params.id).populate('driver', 'firstName lastName');
	if (!ride) return res.status(404).json({ message: 'Ride not found.' });
	return res.json({ ride });
};

module.exports = { calculateRideRoute, createRide, searchRides, getRide };