const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	latitude: { type: Number, required: true, min: -90, max: 90 },
	longitude: { type: Number, required: true, min: -180, max: 180 },
}, { _id: false });

const rideSchema = new mongoose.Schema({
	driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	origin: { type: locationSchema, required: true },
	destination: { type: locationSchema, required: true },
	stops: { type: [locationSchema], default: [] },
	departureAt: { type: Date, required: true, index: true },
	currentLocation: {
		latitude: { type: Number, min: -90, max: 90 },
		longitude: { type: Number, min: -180, max: 180 },
		updatedAt: { type: Date },
	},
	availableSeats: { type: Number, required: true, min: 1, max: 4 },
	pricePerSeat: { type: Number, min: 0, default: 0 },
	routeDistanceMeters: { type: Number, required: true, min: 0 },
	routeDurationSeconds: { type: Number, required: true, min: 0 },
	routeGeometry: {
		type: { type: String, enum: ['LineString'], required: true },
		coordinates: { type: [[Number]], required: true },
	},
	status: { type: String, enum: ['published', 'cancelled', 'completed'], default: 'published', index: true },
}, { timestamps: true });

rideSchema.index({ 'origin.latitude': 1, 'origin.longitude': 1, departureAt: 1 });
rideSchema.index({ 'destination.latitude': 1, 'destination.longitude': 1, departureAt: 1 });

module.exports = mongoose.model('Ride', rideSchema);
