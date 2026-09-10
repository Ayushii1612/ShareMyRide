import axiosInstance from './axiosInstance'

export const calculateRideRoute = (payload) => axiosInstance.post('/rides/route', payload)
export const createRide = (payload) => axiosInstance.post('/rides', payload)
export const searchRides = (payload) => axiosInstance.post('/rides/search', payload)
export const getRide = (id) => axiosInstance.get(`/rides/${id}`)