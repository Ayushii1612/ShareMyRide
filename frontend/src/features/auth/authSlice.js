import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { loginUser, registerUser } from '../../api/auth.api'

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
	try { return (await registerUser(payload)).data } catch (error) { return rejectWithValue(error.response?.data?.message || 'Unable to create your account.') }
})
export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
	try { return (await loginUser(payload)).data } catch (error) { return rejectWithValue(error.response?.data?.message || 'Unable to sign you in.') }
})

const savedUser = localStorage.getItem('carpooling_user')
const authSlice = createSlice({ name: 'auth', initialState: { user: savedUser ? JSON.parse(savedUser) : null, token: localStorage.getItem('carpooling_token'), loading: false, error: null }, reducers: { logout: (state) => { state.user = null; state.token = null; localStorage.removeItem('carpooling_user'); localStorage.removeItem('carpooling_token') }, clearAuthError: (state) => { state.error = null } }, extraReducers: (builder) => builder.addCase(register.pending, (state) => { state.loading = true; state.error = null }).addCase(register.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.token = action.payload.token; localStorage.setItem('carpooling_user', JSON.stringify(action.payload.user)); localStorage.setItem('carpooling_token', action.payload.token) }).addCase(register.rejected, (state, action) => { state.loading = false; state.error = action.payload }).addCase(login.pending, (state) => { state.loading = true; state.error = null }).addCase(login.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.token = action.payload.token; localStorage.setItem('carpooling_user', JSON.stringify(action.payload.user)); localStorage.setItem('carpooling_token', action.payload.token) }).addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload }) })

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
