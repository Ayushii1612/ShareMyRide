const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seats: { type: Number, required: true, min: 1, max: 4, default: 1 },
  totalPrice: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed', index: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending', index: true },
  passengerLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    updatedAt: { type: Date },
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
