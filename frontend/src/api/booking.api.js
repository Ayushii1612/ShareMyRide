import axiosInstance from './axiosInstance'

export const createBooking = (payload) => axiosInstance.post('/bookings', payload)
export const getMyBookings = () => axiosInstance.get('/bookings/my')
export const getMyRideBookings = () => axiosInstance.get('/bookings/driver')
export const updatePassengerLocation = (rideId, payload) => axiosInstance.patch(`/bookings/ride/${rideId}/location`, payload)
export const getRidePassengerLocations = (rideId) => axiosInstance.get(`/bookings/ride/${rideId}/locations`)
