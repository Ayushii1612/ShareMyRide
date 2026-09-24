import axiosInstance from './axiosInstance'

export const createBooking = (payload) => axiosInstance.post('/bookings', payload)
export const getMyBookings = () => axiosInstance.get('/bookings/my')
