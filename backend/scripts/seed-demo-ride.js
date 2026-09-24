require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Ride = require('../src/models/Ride');
const { calculateRoute } = require('../src/services/route.service');

const demoDriver = {
	firstName: 'Demo',
	lastName: 'Driver',
	email: 'demo.driver@carpooling.local',
	phone: '9999999999',
	dateOfBirth: new Date('1990-01-01'),
	gender: 'prefer-not-to-say',
	password: 'DemoDriver123!',
};

const origin = {
	name: 'Jaypee Institute of Information Technology',
	address: 'Jaypee Institute of Information Technology, Noida, Uttar Pradesh, India',
	latitude: 28.62954,
	longitude: 77.3725,
};

const destination = {
	name: 'Hauz Khas',
	address: 'Hauz Khas, New Delhi, Delhi, India',
	latitude: 28.5536,
	longitude: 77.1947,
};

const seed = async () => {
	await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/carpooling');
	let driver = await User.findOne({ email: demoDriver.email });
	if (!driver) driver = await User.create(demoDriver);
	const route = await calculateRoute(origin, destination);
	await Ride.deleteMany({ driver: driver._id, 'origin.name': origin.name, 'destination.name': destination.name });
	const ride = await Ride.create({
		driver: driver._id,
		origin,
		destination,
		departureAt: new Date(),
		availableSeats: 3,
		pricePerSeat: 80,
		routeDistanceMeters: route.distanceMeters,
		routeDurationSeconds: route.durationSeconds,
		routeGeometry: route.geometry,
	});
	console.log(`Seeded demo ride ${ride._id} with ${route.distanceMeters}m of route geometry.`);
	await mongoose.disconnect();
};

seed().catch(async (error) => {
	console.error('Unable to seed demo ride:', error.message);
	await mongoose.disconnect();
	process.exit(1);
});
