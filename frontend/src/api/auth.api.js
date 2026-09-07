import axiosInstance from './axiosInstance'

export const registerUser = (payload) => axiosInstance.post('/auth/register', payload)
export const loginUser = (payload) => axiosInstance.post('/auth/login', payload)
