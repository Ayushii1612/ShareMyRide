const Booking = require('../models/Booking');
const Ride = require('../models/Ride');

const createBooking = async (req, res) => {
  const { rideId, seats = 1 } = req.body;
  const passengerId = req.user._id;

  if (!rideId) return res.status(400).json({ message: 'Ride ID is required.' });

  const requestedSeats = Number(seats);
  if (!Number.isInteger(requestedSeats) || requestedSeats < 1 || requestedSeats > 4) {
    return res.status(422).json({ message: 'Seat count must be a whole number between 1 and 4.' });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: 'Ride not found.' });
  if (String(ride.driver) === String(passengerId)) {
    return res.status(400).json({ message: 'You cannot book your own ride.' });
  }
  if (ride.status !== 'published') {
    return res.status(400).json({ message: 'This ride is no longer available.' });
  }
  if (ride.availableSeats < requestedSeats) {
    return res.status(400).json({ message: 'Not enough seats left in this ride.' });
  }

  const existing = await Booking.findOne({
    ride: rideId,
    passenger: passengerId,
    status: { $in: ['confirmed', 'completed'] },
  });

  if (existing) {
    return res.status(409).json({ message: 'You already booked a seat on this ride.' });
  }

  const totalPrice = Number(ride.pricePerSeat || 0) * requestedSeats;
  const booking = await Booking.create({
    ride: ride._id,
    driver: ride.driver,
    passenger: passengerId,
    seats: requestedSeats,
    totalPrice,
    status: 'confirmed',
    paymentStatus: 'pending',
  });

  ride.availableSeats = ride.availableSeats - requestedSeats;
  await ride.save();

  return res.status(201).json({
    message: 'Ride booked successfully.',
    booking,
  });
};

const getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ passenger: req.user._id })
    .populate('ride')
    .sort({ createdAt: -1 });

  return res.json({ bookings });
};

module.exports = { createBooking, getMyBookings };
