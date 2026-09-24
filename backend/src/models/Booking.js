const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seats: { type: Number, required: true, min: 1, max: 4, default: 1 },
  totalPrice: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed', index: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
