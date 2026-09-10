import axiosInstance from './axiosInstance'

export const registerUser = (payload) => axiosInstance.post('/auth/register', payload)
export const loginUser = (payload) => axiosInstance.post('/auth/login', payload)
export const requestPasswordReset = (payload) => axiosInstance.post('/auth/forgot-password', payload)
export const resetUserPassword = (payload) => axiosInstance.post('/auth/reset-password', payload)
export const changeUserPassword = (payload) => axiosInstance.post('/auth/change-password', payload)
