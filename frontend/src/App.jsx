import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import { logout } from './features/auth/authSlice.js'
import { changeUserPassword } from './api/auth.api.js'
import { calculateRideRoute, createRide, getRide, searchRides, updateRideLocation } from './api/ride.api.js'
import { createBooking } from './api/booking.api.js'

const popularRoutes = [
	['Gurgaon', 'Rohtak'],
	['Dadri', 'Gurgaon'],
	['Meerut', 'Ghaziabad'],
]

const faqs = [
	['How do I book a carpool ride?', 'Search for your destination, choose the date you want to travel, and pick the carpool that suits you best. Some rides can be booked instantly, while others require driver approval.'],
	['How do I publish a carpool ride?', 'Share your departure and arrival points, the time of departure, how many passengers you can take, and your price per seat.'],
	['How do I cancel my carpool ride?', 'You can cancel your carpool ride from your rides section. The sooner you cancel, the better, so your driver has time to accept new passengers.'],
	['What are the benefits of travelling by carpool?', 'Carpooling is affordable for longer distances and more eco-friendly because sharing a car means fewer cars on the road.'],
	['How much does a carpool ride cost?', 'Prices vary by distance, departure time, demand, and the driver. Every price shown is per seat, so you know what you are paying for.'],
	['How do I start carpooling?', 'Create an account, tell us a little about yourself, then start booking or publishing rides directly on the app.'],
]

function LocationField({ label, value, onChange, placeholder }) {
	const [query, setQuery] = useState(value?.address || '')
	const [suggestions, setSuggestions] = useState([])
	const [loading, setLoading] = useState(false)
	const [activeIndex, setActiveIndex] = useState(0)
	useEffect(() => { setQuery(value?.address || '') }, [value?.address])
	useEffect(() => {
		if (query.trim().length < 2 || query === value?.address) { setSuggestions([]); setActiveIndex(0); return undefined }
		const controller = new AbortController()
		const timer = window.setTimeout(async () => {
			setLoading(true)
			try {
				const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&countrycodes=in&accept-language=en&q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
				setSuggestions(await response.json())
				setActiveIndex(0)
			} catch (error) { if (error.name !== 'AbortError') setSuggestions([]) } finally { setLoading(false) }
		}, 350)
		return () => { window.clearTimeout(timer); controller.abort() }
	}, [query, value?.address])
	const choose = (place) => { const address = place.display_name || `${place.lat}, ${place.lon}`; const location = { name: place.name || address.split(',')[0], address, latitude: Number(place.lat), longitude: Number(place.lon) }; setQuery(location.address); setSuggestions([]); onChange(location) }
	const useCurrentLocation = () => navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
		try { const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`, { headers: { Accept: 'application/json' } }); const place = await response.json(); choose({ display_name: place.display_name || `${coords.latitude}, ${coords.longitude}`, lat: coords.latitude, lon: coords.longitude }) } catch { onChange({ address: 'Current location', latitude: coords.latitude, longitude: coords.longitude }) }
	}, () => onChange({ name: 'Current location', address: 'Current location', latitude: 0, longitude: 0 }))
	const handleKeyDown = (event) => {
		if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % suggestions.length) }
		if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length) }
		if (event.key === 'Enter' && suggestions[activeIndex]) { event.preventDefault(); choose(suggestions[activeIndex]) }
		if (event.key === 'Escape') setSuggestions([])
	}
	return <div className="location-field"><label><span>{label}</span><input value={query} onChange={(event) => { setQuery(event.target.value); onChange(null) }} onKeyDown={handleKeyDown} placeholder={placeholder} autoComplete="off" aria-autocomplete="list" aria-expanded={suggestions.length > 0} /><button type="button" onClick={useCurrentLocation} aria-label={`Use current location for ${label}`}>⌖</button></label>{loading && <small className="location-status">Searching places...</small>}{!loading && query.trim().length >= 2 && !value && suggestions.length === 0 && <small className="location-status">No places found. Try a nearby landmark or area.</small>}{suggestions.length > 0 && <div className="location-suggestions" role="listbox">{suggestions.map((place, index) => { const title = place.name || place.address?.road || place.display_name.split(',')[0]; const detail = place.display_name.replace(`${title},`, '').trim(); return <button className={index === activeIndex ? 'active' : ''} type="button" role="option" aria-selected={index === activeIndex} key={place.place_id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(place)}><span className="location-pin">⌖</span><span className="location-copy"><strong>{title}</strong><small>{detail}</small></span></button> })}</div>}{query && !value && !loading && suggestions.length > 0 && <small className="location-hint">Select a place to use its exact road location.</small>}</div>
}

function MapRouteView({ coordinates }) {
	const map = useMap()
	useEffect(() => {
		if (!coordinates || coordinates.length < 2) return
		const bounds = coordinates.map(([lng, lat]) => [lat, lng])
		map.fitBounds(bounds, { padding: [25, 25] })
	}, [coordinates, map])
	return null
}

const driverIcon = L.divIcon({ className: 'driver-map-icon', html: '<span>●</span>', iconSize: [30, 30], iconAnchor: [15, 15] })
const pickupIcon = L.divIcon({ className: 'pickup-map-icon', html: '<span>A</span>', iconSize: [30, 30], iconAnchor: [15, 30] })
const dropoffIcon = L.divIcon({ className: 'dropoff-map-icon', html: '<span>B</span>', iconSize: [30, 30], iconAnchor: [15, 30] })

function RideMapPanel({ ride, pickup, dropoff }) {
	const [routeGeometry, setRouteGeometry] = useState(ride?.routeGeometry)
	const [liveRide, setLiveRide] = useState(ride)
	const [recalculating, setRecalculating] = useState(false)
	const [locationMessage, setLocationMessage] = useState('')
	useEffect(() => { setRouteGeometry(ride?.routeGeometry); setLiveRide(ride) }, [ride?._id, ride?.routeGeometry])
	useEffect(() => {
		if (!ride?._id) return undefined
		let active = true
		const refresh = async () => {
			try { const response = await getRide(ride._id); if (active) setLiveRide(response.data.ride) } catch { /* a public map remains usable if tracking is unavailable */ }
		}
		refresh()
		const timer = window.setInterval(refresh, 5000)
		return () => { active = false; window.clearInterval(timer) }
	}, [ride?._id])
	if (!ride?.routeGeometry?.coordinates?.length) {
		return <aside className="ride-results-map"><div className="map-road map-road-one" /><div className="map-road map-road-two" /><div className="map-road map-road-three" /><span className="map-pin map-pin-start">A</span><span className="map-pin map-pin-end">B</span><button type="button">⌖ Show on map</button></aside>
	}
	const activeGeometry = routeGeometry || ride.routeGeometry
	const routeCoordinates = activeGeometry.coordinates.map(([lng, lat]) => [lat, lng])
	const start = routeCoordinates[0]
	const end = routeCoordinates[routeCoordinates.length - 1]
	const updateRoutePoint = async (kind, event) => {
		const point = event.target.getLatLng()
		const nextPickup = kind === 'pickup' ? { ...(pickup || ride.origin), latitude: point.lat, longitude: point.lng } : (pickup || ride.origin)
		const nextDropoff = kind === 'dropoff' ? { ...(dropoff || ride.destination), latitude: point.lat, longitude: point.lng } : (dropoff || ride.destination)
		setRecalculating(true)
		try {
			const response = await calculateRideRoute({ origin: nextPickup, destination: nextDropoff, stops: ride.stops || [] })
			setRouteGeometry(response.data.geometry)
		} catch { /* keep the last valid road route if the routing service is unavailable */ } finally { setRecalculating(false) }
	}
	const currentLocation = liveRide?.currentLocation
	const etaMinutes = Math.max(1, Math.round((liveRide?.routeDurationSeconds || ride.routeDurationSeconds || 0) / 60))
	const shareLocation = () => {
		if (!navigator.geolocation) return setLocationMessage('Location is not supported by this browser.')
		navigator.geolocation.getCurrentPosition(async ({ coords }) => {
			try { const response = await updateRideLocation(ride._id, { latitude: coords.latitude, longitude: coords.longitude }); setLiveRide(response.data.ride); setLocationMessage('Your live location is shared.') } catch (error) { setLocationMessage(error.response?.data?.message || 'Only the driver can share this ride location.') }
		}, () => setLocationMessage('Allow location access to share your position.'))
	}
	return <aside className="ride-results-map"><MapContainer center={routeCoordinates[Math.floor(routeCoordinates.length / 2)]} zoom={12} scrollWheelZoom className="route-map"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapRouteView coordinates={activeGeometry.coordinates} /><Polyline positions={routeCoordinates} pathOptions={{ color: '#087df3', weight: 6, opacity: 0.9 }} /><Marker position={start} icon={pickupIcon} draggable eventHandlers={{ dragend: (event) => updateRoutePoint('pickup', event) }}><Popup>Drag to adjust pickup</Popup></Marker><Marker position={end} icon={dropoffIcon} draggable eventHandlers={{ dragend: (event) => updateRoutePoint('dropoff', event) }}><Popup>Drag to adjust drop-off</Popup></Marker>{currentLocation?.latitude !== undefined && <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={driverIcon}><Popup>Driver location updated {currentLocation.updatedAt ? new Date(currentLocation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}</Popup></Marker>}</MapContainer><div className="map-live-panel"><div><strong>{recalculating ? 'Updating route...' : `${etaMinutes} min route ETA`}</strong><span>{currentLocation ? 'Live driver position' : 'Waiting for driver location'}</span>{locationMessage && <small>{locationMessage}</small>}</div><button type="button" onClick={shareLocation}>Share my location</button></div></aside>
}

function HomePage() {
	const dispatch = useDispatch()
	const user = useSelector((state) => state.auth.user)
	const [from, setFrom] = useState(null)
	const [to, setTo] = useState(null)
	const [date, setDate] = useState('')
	const [returnDate, setReturnDate] = useState('')
	const [passengers, setPassengers] = useState(1)
	const [notice, setNotice] = useState('')
	const [matches, setMatches] = useState([])
	const [searching, setSearching] = useState(false)
	const [bookingRideId, setBookingRideId] = useState(null)
	const [selectedRideId, setSelectedRideId] = useState(null)
	const [showRideMap, setShowRideMap] = useState(false)
	const [showOffer, setShowOffer] = useState(false)
	const [showAccount, setShowAccount] = useState(false)
	const [activeAccountView, setActiveAccountView] = useState(null)
	const [profileTab, setProfileTab] = useState('about')
	const [profilePage, setProfilePage] = useState(null)

	const submitSearch = async (event) => {
		event.preventDefault()
		if (!from || !to) {
			setNotice('')
			return
		}
		if (!date) { setNotice('Choose a departure date to find compatible rides.'); return }
		setSearching(true)
		try {
			const response = await searchRides({ pickup: from, dropoff: to, departureDate: date, passengers })
			const rides = response.data.rides || []
			const dateRides = response.data.diagnostics?.dateRides
			const [year, month, day] = date.split('-').map(Number)
			const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
			setMatches(rides)
			setNotice(rides.length ? `Found ${rides.length} compatible planned ride${rides.length > 1 ? 's' : ''}.` : dateRides === 0 ? `No rides found for ${formattedDate}. Try another date or offer a ride.` : 'No compatible rides found.')
		} catch (error) { setNotice(error.response?.data?.message || 'Unable to search rides right now.') } finally { setSearching(false) }
	}

	const handleBookRide = async (ride) => {
		if (!user) {
			setNotice('Log in to book this ride.');
			return;
		}
		if (ride.driver && (ride.driver._id === user.id || ride.driver._id === user._id)) {
			setNotice('You cannot book your own ride.');
			return;
		}
		if (ride.availableSeats < 1) {
			setNotice('This ride has no seats left.');
			return;
		}
		setBookingRideId(ride._id)
		try {
			await createBooking({ rideId: ride._id, seats: 1 })
			setNotice('Ride booked successfully. You are now confirmed on this trip.')
			setMatches((current) => current.filter((item) => item.ride._id !== ride._id))
		} catch (error) {
			setNotice(error.response?.data?.message || 'Unable to book this ride right now.')
		} finally {
			setBookingRideId(null)
		}
	}

	const selectedRide = matches.find(({ ride }) => ride._id === selectedRideId) || matches[0] || null
	const showMapRoute = selectedRide?.ride?.routeGeometry?.coordinates?.length > 1
	const rideMapPoints = showMapRoute ? selectedRide.ride.routeGeometry.coordinates.map(([lng, lat]) => {
		const x = ((lng + 180) / 360) * 100
		const y = ((90 - lat) / 180) * 100
		return `${x},${y}`
	}).join(' ') : ''
	const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

	return (
		<div className="app-shell">
			<header className="site-header">
				<button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="CarPooling home">
					<span className="brand-mark"><i /> <b /></span>
					<span>CarPooling</span>
				</button>
				<nav className="nav-links" aria-label="Main navigation">
					<button onClick={() => jumpTo('why')}>How it works</button>
					<button onClick={() => { setActiveAccountView('help'); setShowAccount(false) }}>Help Centre</button>
					<button className="nav-offer" onClick={() => setShowOffer(true)}>Offer a ride <span>↗</span></button>
						<div className="account-menu-wrap">
							<button className="avatar" onClick={() => setShowAccount((visible) => !visible)} aria-label="Open account menu" aria-expanded={showAccount}>◉</button>
							{showAccount && <div className="account-menu">
								{user ? <>
									<p>Hi, {user.firstName}</p>
									<button onClick={() => { setShowAccount(false); setActiveAccountView('rides') }}>♧ <span>Your rides</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setActiveAccountView('inbox') }}>◌ <span>Inbox</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setActiveAccountView('profile'); setProfileTab('about'); setProfilePage(null) }}>◎ <span>Profile</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setActiveAccountView('profile'); setProfileTab('account'); setProfilePage('payments-refunds') }}>▣ <span>Payments &amp; refunds</span><b>›</b></button>
									<button className="account-logout" onClick={() => { dispatch(logout()); setShowAccount(false); setActiveAccountView(null); setNotice('You have been logged out.') }}>⊗ <span>Log out</span><b>›</b></button>
								</> : <>
									<p className="account-menu-title">Welcome to CarPooling</p>
									<a href="/login" className="account-auth-link" onClick={() => setShowAccount(false)}><span>Log in</span><b>›</b></a>
									<a href="/register" className="account-auth-link" onClick={() => setShowAccount(false)}><span>Sign up</span><b>›</b></a>
								</>}
							</div>}
						</div>
				</nav>
			</header>

			{activeAccountView === 'rides' && user && (
				<div className="account-empty-state">
					<div className="magnifier-wrap" aria-hidden="true">
						<span className="magnifier-track magnifier-track-1" />
						<span className="magnifier-track magnifier-track-2" />
						<div className="magnifier-shell">
							<div className="magnifier-ring">
								<div className="magnifier-inner" />
							</div>
							<div className="magnifier-handle" />
						</div>
					</div>
					<h2>Your future travel plans will<br />appear here.</h2>
					<p>Find the perfect ride from thousands of destinations, or publish to share your travel costs.</p>
				</div>
			)}

			{activeAccountView === 'inbox' && user && (
				<div className="inbox-empty-state">
					<h1>Inbox</h1>
					<p>No messages right now. Book or publish a ride to contact other members. If you have already an upcoming ride, feel free to contact who you're travelling with!</p>
				</div>
			)}

			{activeAccountView === 'profile' && user && (
				<ProfileView
					user={user}
					profileTab={profileTab}
					setProfileTab={setProfileTab}
					profilePage={profilePage}
					setProfilePage={setProfilePage}
					onAction={(message) => setNotice(message)}
					onLogout={() => { dispatch(logout()); setActiveAccountView(null); setNotice('You have been logged out.') }}
					onCloseAccount={() => { if (window.confirm('Are you sure you want to close your account?')) { dispatch(logout()); setActiveAccountView(null); setNotice('Your account has been closed.') } }}
				/>
			)}

			{activeAccountView === 'help' && <HelpCentreView />}

			{(activeAccountView === 'rides' || activeAccountView === 'inbox' || activeAccountView === 'profile' || activeAccountView === 'help') && (user || activeAccountView === 'help') ? null : (
			<main>
				<section className="hero-section">
					<div className="hero-copy">
						<p className="eyebrow">THE ROAD IS BETTER TOGETHER</p>
						<h1>Go farther.<br /><em>Share the ride.</em></h1>
						<p className="hero-text">Find friendly rides going your way, or turn your empty seats into shared travel costs.</p>
					</div>
					<div className="hero-image image-one" role="img" aria-label="Friends enjoying a road trip" />
					<form id="search" className="search-panel" onSubmit={submitSearch}>
						<LocationField label="From" value={from} onChange={setFrom} placeholder="City or place" />
						<span className="swap">↔</span>
						<LocationField label="To" value={to} onChange={setTo} placeholder="City or place" />
						<label className="date-field"><span>Departure</span><input type="date" value={date} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => setDate(event.target.value)} /><small>{date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Today'}</small></label>
						<label className="return-field"><span>Return</span><input type="date" value={returnDate} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => setReturnDate(event.target.value)} /><small>{returnDate ? new Date(`${returnDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Date'}</small></label>
						<label className="passenger-field"><span>Passengers</span><select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))}><option value={1}>1 passenger</option><option value={2}>2 passengers</option><option value={3}>3 passengers</option><option value={4}>4 passengers</option></select></label>
						<button className="search-button" type="submit">Search <span>→</span></button>
					</form>
					{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
				</section>
				{matches.length > 0 && <section className="ride-results-page" aria-label="Ride search results"><div className="ride-results-head"><div><p className="eyebrow">OUTBOUND · {date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'TODAY'}</p><h2>{from?.name || 'Your pickup'} <span>→</span> {to?.name || 'Your destination'}</h2></div><strong>{matches.length} ride{matches.length > 1 ? 's' : ''} available</strong></div><div className="ride-results-layout"><RideMapPanel ride={selectedRide?.ride || matches[0]?.ride} /><div className="ride-results-list"><div className="ride-filter-row"><strong>Rides matching your route</strong><button type="button">Sort by best match⌄</button></div>{matches.map(({ ride, match }) => { const departure = new Date(ride.departureAt); const driverName = ride.driver ? `${ride.driver.firstName || ''} ${ride.driver.lastName || ''}`.trim() : 'CarPooling driver'; const isSelected = selectedRideId === ride._id; return <article className={`ride-result-card${isSelected ? ' selected-ride-card' : ''}`} key={ride._id} onClick={() => { setSelectedRideId(ride._id); setShowRideMap(true) }}><div className="ride-time"><strong>{departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><span>{Math.max(1, Math.round((ride.routeDurationSeconds || 0) / 3600))}h</span><strong>{new Date(departure.getTime() + (ride.routeDurationSeconds || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div><div className="ride-route-copy"><strong>{ride.origin.name}</strong><span>{ride.destination.name}</span><small>Pickup {Math.round(match.pickupDistanceMeters)}m from route · Drop-off {Math.round(match.dropoffDistanceMeters)}m</small></div><div className="ride-driver"><span className="driver-avatar">{driverName[0] || 'D'}</span><span><strong>{driverName}</strong><small>Available seats: {ride.availableSeats}</small></span></div><div className="ride-price"><strong>₹{Number(ride.pricePerSeat || 0).toFixed(0)}</strong><small>per seat</small></div><button type="button" className="primary-button ride-book-button" onClick={(event) => { event.stopPropagation(); handleBookRide(ride) }} disabled={bookingRideId === ride._id}>{bookingRideId === ride._id ? 'Booking...' : 'Accept ride'}</button></article> })}</div></div></section>}

				<section className="benefits" id="why">
					<article><span className="benefit-icon">↗</span><h2>Travel everywhere</h2><p>Explore cities and quiet corners with rides going your way.</p></article>
					<article><span className="benefit-icon">₹</span><h2>Prices like nowhere</h2><p>Share the cost of your journey and keep more for the destination.</p></article>
					<article><span className="benefit-icon">✓</span><h2>Ride with confidence</h2><p>Verified profiles and reviews help you choose your next travel companion.</p></article>
				</section>

				<section className="routes-band">
					<div className="section-heading light"><p className="eyebrow">FIND YOUR NEXT JOURNEY</p><h2>Top carpool routes</h2></div>
					<div className="route-grid">{popularRoutes.map(([origin, destination]) => <button className="route-card" key={origin} onClick={() => { setFrom(null); setTo(null); setNotice(`Search for ${origin} to ${destination} and select exact pickup and drop-off points.`); jumpTo('search') }}><span>{origin} <b>→</b> {destination}</span><strong>↗</strong></button>)}</div>
					<button className="light-button" onClick={() => jumpTo('search')}>Explore all routes <span>→</span></button>
				</section>

				<section className="story-section">
					<div className="story-image image-two" role="img" aria-label="Driver in a car" />
					<div className="story-copy"><p className="eyebrow">NEVER MISS A CARPOOL</p><h2>Your next seat is closer than you think.</h2><p>Set your route once and discover a growing network of people heading in the same direction. Simple plans, shared costs, better journeys.</p><button className="primary-button" onClick={() => jumpTo('search')}>Find a ride <span>→</span></button></div>
				</section>

				<section className="share-banner"><p className="eyebrow">FOR DRIVERS WITH ROOM TO SPARE</p><h2>Share your ride.<br />Cut your costs.</h2><p>Turn your empty seats into lower travel costs. Publish your route and meet people on the way.</p><button className="light-button" onClick={() => setShowOffer(true)}>Offer a ride <span>→</span></button></section>

				<section className="story-section reverse"><div className="story-image image-three" role="img" aria-label="Happy driver at a fuel station" /><div className="story-copy"><p className="eyebrow">THE CARPOOLING DIFFERENCE</p><h2>More than a ride. A better way to move.</h2><p>Every shared trip means one less car on the road, a lighter cost for everyone, and a little more connection between the places we call home.</p></div></section>

				<section className="quote-section"><div><p className="eyebrow">REAL PEOPLE. REAL JOURNEYS.</p><h2>“Carpooling makes the long way feel like the right way.”</h2><p className="quote-author">Aarav, from Pune</p></div><div className="quote-image image-four" role="img" aria-label="Passenger smiling in a car" /></section>

				<section className="help-section" id="help"><div className="section-heading"><p className="eyebrow">A LITTLE HELP ALONG THE WAY</p><h2>Carpool Help Centre</h2></div><div className="faq-grid">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div><button className="primary-button" onClick={() => { setActiveAccountView('help'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Read our Help Centre <span>→</span></button></section>

				<section className="app-banner"><div><p className="eyebrow">YOUR JOURNEYS, IN YOUR POCKET</p><h2>Enjoy a better travel experience with the CarPooling app.</h2><p>Keep your rides, messages, and tickets together wherever you go.</p><div className="store-buttons"><button> <span>Download on the<br /><b>App Store</b></span></button><button>▶ <span>GET IT ON<br /><b>Google Play</b></span></button></div></div><div className="phone-mockup"><div className="phone-screen"><span>Upcoming ride</span><strong>Pune → Mumbai</strong><small>Tomorrow · 08:30</small><div className="ticket-line" /><span>Seat confirmed</span></div></div></section>
			</main>
			)}

			{activeAccountView !== 'rides' && activeAccountView !== 'inbox' && activeAccountView !== 'profile' && activeAccountView !== 'help' && (
				<>
					<footer className="site-footer">
						<div className="footer-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong><p>Travel together. Spend smarter.</p></div>
						<div><h3>Travel with carpool</h3><button onClick={() => { setFrom(null); setTo(null); setNotice('Search Mumbai to Pune and select exact pickup and drop-off points.'); jumpTo('search') }}>Mumbai → Pune</button><button onClick={() => { setFrom(null); setTo(null); setNotice('Search Bengaluru to Chittoor and select exact pickup and drop-off points.'); jumpTo('search') }}>Bengaluru → Chittoor</button><button onClick={() => jumpTo('search')}>Popular carpool rides</button></div>
						<div><h3>Find out more</h3><button onClick={() => jumpTo('why')}>How it works</button><button onClick={() => jumpTo('help')}>Help Centre</button><button onClick={() => setNotice('Contact support at hello@carpooling.app')}>Contact us</button></div>
						<div><h3>Follow the journey</h3><p className="socials">◎　𝕏　▶　◎</p></div>
						<div className="footer-bottom"><span>Terms and Conditions</span><span>© 2026 CarPooling</span></div>
					</footer>

					{showOffer && <OfferRideModal user={user} onClose={() => setShowOffer(false)} onAuthExpired={() => { dispatch(logout()); setShowOffer(false); setNotice('Your session expired. Please log in again before publishing a ride.') }} onPublish={(message) => { setShowOffer(false); setNotice(message) }} />}
				</>
			)}
		</div>
	)
}

function OfferRideModal({ user, onClose, onAuthExpired, onPublish }) {
	const [pickup, setPickup] = useState(null)
	const [dropoff, setDropoff] = useState(null)
	const [departureAt, setDepartureAt] = useState('')
	const [availableSeats, setAvailableSeats] = useState(1)
	const [pricePerSeat, setPricePerSeat] = useState('')
	const [error, setError] = useState('')
	const [saving, setSaving] = useState(false)
	const submit = async (event) => {
		event.preventDefault()
		if (!user) return setError('Log in before publishing a planned ride.')
		if (!pickup || !dropoff || !departureAt) return setError('Select exact pickup and drop-off points and a departure time.')
		setSaving(true)
		try {
			const routeResponse = await calculateRideRoute({ origin: pickup, destination: dropoff })
			await createRide({ origin: pickup, destination: dropoff, departureAt: new Date(departureAt).toISOString(), availableSeats: Number(availableSeats), pricePerSeat: Number(pricePerSeat || 0), routeDistanceMeters: routeResponse.data.distanceMeters, routeDurationSeconds: routeResponse.data.durationSeconds, routeGeometry: routeResponse.data.geometry })
			onPublish(`Ride published from ${pickup.address} to ${dropoff.address}. Route: ${(routeResponse.data.distanceMeters / 1000).toFixed(1)} km.`)
		} catch (requestError) {
			if (requestError.response?.status === 401) return onAuthExpired()
			setError(requestError.response?.data?.message || requestError.message || 'Unable to publish this ride.')
		} finally { setSaving(false) }
	}
	return <div className="modal-backdrop" onClick={onClose}><div className="offer-modal location-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">SHARE YOUR EMPTY SEATS</p><h2>Plan your journey</h2><p>Choose the exact places and time for the trip you already intend to make.</p><form onSubmit={submit}><LocationField label="Pickup" value={pickup} onChange={setPickup} placeholder="Address, landmark or place" /><LocationField label="Drop-off" value={dropoff} onChange={setDropoff} placeholder="Address, landmark or place" /><label className="ride-modal-input"><span>Departure</span><input type="datetime-local" value={departureAt} onChange={(event) => setDepartureAt(event.target.value)} required /></label><label className="ride-modal-input"><span>Available seats</span><select value={availableSeats} onChange={(event) => setAvailableSeats(event.target.value)}><option value={1}>1 seat</option><option value={2}>2 seats</option><option value={3}>3 seats</option><option value={4}>4 seats</option></select></label><label className="ride-modal-input"><span>Price per seat</span><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6" placeholder="Enter amount" value={pricePerSeat} onChange={(event) => setPricePerSeat(event.target.value.replace(/[^0-9]/g, ''))} /></label>{error && <p className="location-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={saving}>{saving ? 'Calculating route...' : 'Publish planned ride'} <span>→</span></button></form></div></div>
}

function HelpCentreView() {
	const [query, setQuery] = useState('')
	const [collection, setCollection] = useState(null)
	const categories = ['Getting Started on CarPooling', 'Carpooling', 'Profile & account', 'Trust / Safety & Accessibility']
	const gettingStartedArticles = [
		'Booking a carpool: What to do if you’re new to CarPooling',
		'Downloading the CarPooling app',
		'How do I offer a ride?',
		'Can I commute with CarPooling?',
		'Locating your invoice',
		'How do I get help or contact CarPooling?',
	]
	const articles = [
		['How carpool ratings work', 'Ratings are a great way for fellow carpoolers to give each other feedback.'],
		['Vehicle requirements', 'Vehicles must have seat belts, four wheels, and enough room for every passenger.'],
		['Carpooling experience: Safety tips', 'At CarPooling, we value member safety and provide several trust features.'],
	]
	const visibleArticles = articles.filter(([title, text]) => `${title} ${text}`.toLowerCase().includes(query.toLowerCase()))
	if (collection === 'getting-started') return <HelpCollectionView articles={gettingStartedArticles} query={query} setQuery={setQuery} categories={categories} onBack={() => setCollection(null)} onSelectCategory={(category) => category === categories[0] ? setCollection('getting-started') : category === categories[1] ? setCollection('carpooling') : category === categories[2] ? setCollection('profile-account') : setCollection(null)} />
	if (collection === 'carpooling') return <CarpoolingCollectionView categories={categories} onBack={() => setCollection(null)} onSelectCategory={(category) => category === categories[0] ? setCollection('getting-started') : category === categories[1] ? setCollection('carpooling') : category === categories[2] ? setCollection('profile-account') : setCollection(null)} />
	if (collection === 'profile-account') return <ProfileAccountCollectionView categories={categories} onBack={() => setCollection(null)} onSelectCategory={(category) => category === categories[0] ? setCollection('getting-started') : category === categories[1] ? setCollection('carpooling') : category === categories[2] ? setCollection('profile-account') : setCollection(null)} />
	if (collection === 'trust-safety') return <TrustSafetyCollectionView categories={categories} onBack={() => setCollection(null)} onSelectCategory={(category) => category === categories[0] ? setCollection('getting-started') : category === categories[1] ? setCollection('carpooling') : category === categories[2] ? setCollection('profile-account') : setCollection('trust-safety')} />
	return <section className="help-centre-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in the help center" /></label></div></div>
		<div className="help-centre-body"><div className="help-category-grid">{categories.map((category, index) => <button key={category} onClick={() => category === categories[0] ? setCollection('getting-started') : category === categories[1] ? setCollection('carpooling') : category === categories[2] ? setCollection('profile-account') : setCollection('trust-safety')}><span className={`help-category-icon icon-${index}`}>{index === 1 ? '▣' : index === 2 ? '●' : index === 3 ? '✓' : '◉'}</span><strong>{category}</strong></button>)}</div><h2>Pinned contents</h2><div className="pinned-grid">{visibleArticles.map(([title, text]) => <article key={title}><strong>▤　{title}</strong><span>{text}</span><button onClick={() => setQuery(title)}>Read article →</button></article>)}</div>{query && visibleArticles.length === 0 && <p className="help-no-results">No articles found.</p>}</div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

function HelpCollectionView({ articles, query, setQuery, categories, onBack, onSelectCategory }) {
	const [selectedArticle, setSelectedArticle] = useState(null)
	const visibleArticles = articles.filter((article) => article.toLowerCase().includes(query.toLowerCase()))
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Help Centre</button>{categories.map((category, index) => <button className={index === 0 ? 'selected' : ''} key={category} onClick={() => onSelectCategory(category)}><span>{index === 0 ? '◉' : index === 1 ? '▣' : index === 2 ? '●' : '✓'}</span>{category}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Getting Started on CarPooling</p><h2><span className="help-collection-icon">◉</span>Getting Started on CarPooling</h2><div className="help-article-list">{visibleArticles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span><strong>{article}</strong><b>›</b></button>)}</div>{visibleArticles.length === 0 && <p className="help-no-results">No articles found.</p>}</main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

const profileAccountSections = [
	{ key: 'create', title: 'Create your account', articles: ['Creating an account', 'Logging in to your BlaBlaCar account'] },
	{ key: 'manage', title: 'Manage your account', articles: ['Adding vehicles to your profile', 'Change your email address', 'Changing the language or currency on BlaBlaCar', 'Edit your account settings', 'Managing your notifications', 'Uploading your profile photo', 'Closing your account', 'Merging multiple accounts'] },
	{ key: 'verification', title: 'Verification', articles: ['What is the Verified Profile badge?', 'Verifying your ID', 'How to submit your ID', 'Verify your phone number'] },
	{ key: 'security', title: 'Account security', articles: ['Reporting suspicious activity', 'Change or reset your password', 'BlaBlaCar and your personal info', 'Creating a strong password', 'How we keep your ID secure', 'How do I exercise my data subject rights?', 'About 2-step authentication', 'I think my account has been compromised', 'Online security tips', 'Where and when is my phone number displayed?', 'How do I know if a website or link is really from BlaBlaCar?'] },
	{ key: 'troubleshooting', title: 'Account Troubleshooting', articles: ['My phone number is already in use', "Why can't I sign up?", "If you can't verify your phone number", 'Reporting a technical issue', "If you're missing notifications", "Why can’t I log in after changing my password ?", 'Issues with my profile photo'] },
]

function ProfileAccountCollectionView({ categories, onBack, onSelectCategory }) {
	const [openSection, setOpenSection] = useState('create')
	const [selectedArticle, setSelectedArticle] = useState(null)
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={profileAccountSections[0].articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Profile &amp; account</button>{categories.map((category, index) => <button className={index === 2 ? 'selected' : ''} key={category} onClick={() => onSelectCategory(category)}><span>{index === 0 ? '◉' : index === 1 ? '▣' : index === 2 ? '●' : '✓'}</span>{category}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Profile &amp; account</p><h2><span className="help-collection-icon">●</span>Profile &amp; account</h2><div className="carpooling-sections">{profileAccountSections.map((section) => { const isOpen = openSection === section.key; return <div className="carpooling-section" key={section.key}><button className="carpooling-section-heading" onClick={() => setOpenSection(isOpen ? null : section.key)}><span>□</span><strong>{section.title}</strong><b>{isOpen ? '⌃' : '⌄'}</b></button>{isOpen && <div className="carpooling-article-list">{section.articles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span>{article}</button>)}</div>}</div> })}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026 ©</small></footer>
	</section>
}

const trustSafetySections = [
	{ key: 'terms', title: 'Terms & policies', articles: ['Pet policy', 'Transporting parcels', 'Nondiscrimination Policy', 'Is a driver responsible for their passengers’ luggage?'] },
	{ key: 'mobility', title: 'Persons with Reduced Mobility', articles: [] },
	{ key: 'reporting', title: 'Reporting Issues', articles: ['How do I report a message on BlaBlaCar?', 'Who is responsible in case of an accident?', 'How to report discrimination to BlaBlaCar', 'What it means when BlaBlaCar suspends my account', 'Reporting inappropriate behaviour: What to do if you feel unsafe', 'How to report bad behaviour'] },
	{ key: 'children', title: 'Child travel policy', articles: ['Child travel policy', 'Is there a reduced carpooling rate for children?', 'Carpool parental authorisation form'] },
	{ key: 'safety', title: 'Safety', articles: ['Drivers: use our checklist to prepare for your journey', 'Drivers: 10 tips for travelling safely', 'Being a considerate driver', 'Carpooling experience : Safety tips', 'How do I stay safe on the road?', 'What is expected of me when I travel?'] },
]

function TrustSafetyCollectionView({ categories, onBack, onSelectCategory }) {
	const [openSection, setOpenSection] = useState('terms')
	const [selectedArticle, setSelectedArticle] = useState(null)
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={trustSafetySections[0].articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Trust / Safety &amp; Accessibility</button>{categories.map((category, index) => <button className={index === 3 ? 'selected' : ''} key={category} onClick={() => onSelectCategory(category)}><span>{index === 0 ? '◉' : index === 1 ? '▣' : index === 2 ? '●' : '✓'}</span>{category}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Trust / Safety &amp; Accessibility</p><h2><span className="help-collection-icon">✓</span>Trust / Safety &amp; Accessibility</h2><div className="carpooling-sections">{trustSafetySections.map((section) => { const isOpen = openSection === section.key; return <div className="carpooling-section" key={section.key}><button className="carpooling-section-heading" onClick={() => setOpenSection(isOpen ? null : section.key)}><span>□</span><strong>{section.title}</strong><b>{isOpen ? '⌃' : '⌄'}</b></button>{isOpen && (section.articles.length ? <div className="carpooling-article-list">{section.articles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span>{article}</button>)}</div> : <p className="help-empty-collection">No content to display</p>)}</div> })}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026 ©</small></footer>
	</section>
}

function CarpoolingCollectionView({ categories, onBack, onSelectCategory }) {
	const [openSection, setOpenSection] = useState('getting-started')
	const [openCollection, setOpenCollection] = useState(null)
	if (openCollection === 'basics') return <BasicsCollectionView onBack={() => setOpenCollection(null)} />
	if (openCollection === 'driver') return <DriverCollectionView onBack={() => setOpenCollection(null)} />
	if (openCollection === 'passenger') return <PassengerCollectionView onBack={() => setOpenCollection(null)} />
	const sections = {
		'getting-started': { title: 'Getting Started with Carpooling', articles: ['The basics'] },
		driver: { title: 'Driver', articles: ['How to Publish a Carpool Ride', 'Driver cancellations & refunds', 'Manage your carpool publications', 'Driver requirements', 'Driver Troubleshooting'] },
		passenger: { title: 'Passenger', articles: ['How to book a carpool ride', 'Carpool passenger cancellations & refunds', 'Manage your carpool bookings', 'Carpool Payments', 'Carpool passenger troubleshooting'] },
	}
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Carpooling</button>{categories.map((category, index) => <button className={index === 1 ? 'selected' : ''} key={category} onClick={() => onSelectCategory(category)}><span>{index === 0 ? '◉' : index === 1 ? '▣' : index === 2 ? '●' : '✓'}</span>{category}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Carpooling</p><h2><span className="help-collection-icon">▣</span>Carpooling</h2><div className="carpooling-sections">{Object.entries(sections).map(([key, section]) => <div className="carpooling-section" key={key}><button className="carpooling-section-heading" onClick={() => setOpenSection(openSection === key ? null : key)}><span>□</span><strong>{section.title}</strong><b>{openSection === key ? '⌃' : '⌄'}</b></button>{openSection === key && <div className="carpooling-article-list">{section.articles.map((article) => <button key={article} onClick={() => article === 'The basics' ? setOpenCollection('basics') : key === 'driver' ? setOpenCollection('driver') : key === 'passenger' ? setOpenCollection('passenger') : window.alert(`${article} article will open here.`)}><span>□</span>{article}</button>)}</div>}</div>)}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

const passengerCollections = [
	{ title: 'Carpool passenger cancellations & refunds', articles: ['Cancelling your carpool booking', "What if the driver cancels the ride or doesn't show up?"] },
	{ title: 'Manage your carpool bookings', articles: ['How to find your carpool booking', 'Making a claim for a carpool', 'Communicating with the driver after booking', 'If the carpool driver makes changes to the ride', 'Driver response time', 'Understanding the passenger cancellation rate'] },
	{ title: 'Carpool Payments', articles: ['How to pay with PayPal', "When you'll pay for your carpool booking"] },
	{ title: 'Carpool passenger troubleshooting', articles: ["If you can't send a message"] },
]

function PassengerCollectionView({ onBack }) {
	const articles = ['Searching for a ride', 'Using search filters', 'Ride alerts', 'Choosing a carpool driver', 'Instant Booking', 'How to Make a Special Request', 'Ladies only', 'Contacting a Driver without booking a ride']
	const [selectedArticle, setSelectedArticle] = useState(null)
	const [openSection, setOpenSection] = useState('booking')
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	const sections = [
		{ key: 'booking', title: 'How to book a carpool ride', articles },
		...passengerCollections.map((collection) => ({ key: collection.title, ...collection })),
	]
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Carpooling　›　Passenger</button><button className="selected"><span>□</span>Passenger</button></aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Carpooling　›　Passenger</p><h2><span className="help-collection-icon">□</span>Passenger</h2><div className="carpooling-sections">{sections.map((section) => { const isOpen = openSection === section.key; return <div className="carpooling-section" key={section.key}><button className="carpooling-section-heading" onClick={() => setOpenSection(isOpen ? null : section.key)}><span>□</span><strong>{section.title}</strong><b>{isOpen ? '⌃' : '⌄'}</b></button>{isOpen && <div className="carpooling-article-list">{section.articles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span>{article}</button>)}</div>}</div> })}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026 ©</small></footer>
	</section>
}

function DriverCollectionView({ onBack }) {
	const articles = ['Publication requirements', 'Setting a price per seat', 'Instant Booking', 'Boost booking', 'Handling Special Requests from Passengers', 'How do I publish a Ladies only ride?']
	const [selectedArticle, setSelectedArticle] = useState(null)
	const [openSection, setOpenSection] = useState('publish')
	const [expandedSections, setExpandedSections] = useState({})
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	const sections = [
		{ key: 'publish', title: 'How to Publish a Carpool Ride', articles: ['Publication requirements', 'Setting a price per seat', 'Instant Booking', 'Boost booking', 'Handling Special Requests from Passengers', 'How do I publish a Ladies only ride?'] },
		...driverCollections.map((collection) => ({ key: collection.title, ...collection })),
	]
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Carpooling　›　Driver</button><button className="selected"><span>□</span>Driver</button></aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Carpooling　›　Driver</p><h2><span className="help-collection-icon">□</span>Driver</h2><div className="carpooling-sections">{sections.map((section) => { const isOpen = openSection === section.key; const visibleArticles = expandedSections[section.key] ? section.articles : section.articles.slice(0, 6); return <div className="carpooling-section" key={section.key}><button className="carpooling-section-heading" onClick={() => setOpenSection(isOpen ? null : section.key)}><span>□</span><strong>{section.title}</strong><b>{isOpen ? '⌃' : '⌄'}</b></button>{isOpen && <div className="carpooling-article-list">{visibleArticles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span>{article}</button>)}{section.articles.length > 6 && !expandedSections[section.key] && <button className="help-show-more" onClick={() => setExpandedSections((current) => ({ ...current, [section.key]: true }))}>Show more</button>}</div>}</div> })}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

const driverCollections = [
	{ title: 'Driver cancellations & refunds', articles: ["How do I cancel a passenger's carpool booking?", "What if a passenger cancels before departure or doesn't show up?", 'Declining a booking request', 'Understanding the driver cancellation rate'] },
	{ title: 'Manage your carpool publications', articles: ['Editing a publication', 'Editing the price per seat', 'Deleting a publication', 'How do I copy a ride I’m making more than once?', 'Search results', 'Where can I find more details about my ride and the passengers who have booked?', 'Managing Boost requests', 'Responding to booking requests', 'Messaging your passengers', 'How to find your pickup and dropoff points'] },
	{ title: 'Driver requirements', articles: ['Vehicle requirements', 'How do I know it’s OK to carpool?'] },
	{ title: 'Driver Troubleshooting', articles: ["What should I do if there’s an error with my ride?", "Why can’t I edit my publication after passengers book?", "Why your vehicle’s picture isn’t visible", 'If you cannot approve a booking request via SMS', 'If you can’t add your vehicle', 'Missed booking requests'] },
]

function DriverSubCollection({ title, articles, onBack }) {
	const [selectedArticle, setSelectedArticle] = useState(null)
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={articles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	return <section className="help-centre-page help-collection-page"><div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div><div className="help-collection-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Carpooling　›　Driver</button>{articles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>□</span>{article}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　Carpooling　›　Driver</p><h2><span className="help-collection-icon">□</span>{title}</h2><div className="help-article-list">{articles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span><strong>{article}</strong><b>›</b></button>)}</div></main></div><footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer></section>
}

function BasicsCollectionView({ onBack }) {
	const basicsArticles = ['How Pricing works ?', 'How carpool ratings work', 'About Experience Levels', 'What is Zen, Door-to-Door Carpool Ride?']
	const [selectedArticle, setSelectedArticle] = useState(null)
	if (selectedArticle) return <HelpArticleView title={selectedArticle} articles={basicsArticles} onBack={() => setSelectedArticle(null)} onSelectArticle={setSelectedArticle} />
	return <section className="help-centre-page help-collection-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-collection-layout basics-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Carpooling　›　Getting Started with Carpooling</button><button className="selected"><span>□</span>The basics</button></aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　The basics</p><h2><span className="help-collection-icon">□</span>The basics</h2><div className="help-article-list">{basicsArticles.map((article) => <button key={article} onClick={() => setSelectedArticle(article)}><span>▤</span><strong>{article}</strong><b>›</b></button>)}</div></main></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

const driverManagementArticleContent = {
	'Editing a publication': { paragraphs: ['From Your rides, select the publication, choose Edit your publication, make the desired changes, and confirm them.', 'Drivers can edit a publication until the ride departure. To prevent misunderstandings and cancellations after a passenger books, some changes are limited.'], sections: ['To edit the number of seats available', 'If passengers have not booked a seat', 'If passengers have booked a seat', 'Informing passengers about a change'], bullets: ['Select the ride from Your rides, choose Edit your publication, open Seats and options, and use the plus or minus buttons to adjust the seats.', 'Before a booking, you can edit the ride date and time, booking settings, number of seats, additional details, and price.', 'After a booking, you can edit booking settings, number of seats, additional details, and price. Date, time, and departure or arrival cities cannot be changed.', 'If a major change is needed after booking, contact passengers first. If they are not happy, cancel the ride and publish a new one; bookings will be cancelled and passengers refunded.', 'A seat may be temporarily blocked for 15 minutes while a passenger enters their booking information.'] },
	'Editing the price per seat': { paragraphs: ['From Your rides, select the publication, choose Edit your publication, and select Price.', 'Drivers can edit the price until departure within the recommended price range. Stopover prices suggested by Boost cannot be edited.', 'If a passenger visited the publication, booked the ride, or sent a booking request before the edit, they may still book at the original price. The new price applies to future bookings, so passengers on one ride may pay different prices.'] },
	'Deleting a publication': { paragraphs: ['As long as passengers have not booked a seat, you can cancel a ride in a minute.'], sections: ['To cancel a ride'], bullets: ['Go to Your rides.', 'Select the ride you want to cancel.', 'Choose Your publication, then Cancel your ride.', 'Confirm the cancellation.', 'If a passenger has already booked, follow the separate passenger-booking cancellation process.'] },
	'How do I copy a ride I’m making more than once?': { paragraphs: ['To publish the same ride more than once, open your Rides offered page and choose Duplicate. All ride details are recreated; update the date and time before publishing.', 'Each copy appears as an individual ride for you and passengers. You can manage requests and passengers for each copy normally.'] },
	'Search results': { paragraphs: ['Your publication is visible to passengers a few seconds after publishing, even if it is being moderated. You can check its views to confirm that it is showing in search results.'], sections: ['To see your publication', 'Finding your publication in the search results', 'If you cannot find your publication online', 'How search results work'], bullets: ['From Your rides, select the ride, then choose Your publication and See your publication online.', 'Search for the ride yourself, remembering that passengers see different results based on departure time, seats, and search radius.', 'After the main ride departs, the publication and its stopover versions are no longer visible.', 'Price, proximity, departure time, trip duration, and the passenger’s search criteria influence how rides are displayed.'] },
	'Where can I find more details about my ride and the passengers who have booked?': { paragraphs: ['Select the ride from Your rides to open its Ride plan. From there you can review the exact departure, arrival, stopovers, and estimated arrival time, as well as the passengers and their itineraries.', 'After selecting a passenger, you can see the number of seats booked and the amount you will receive. You can also contact the passenger or cancel the booking.'] },
	'Managing Boost requests': { paragraphs: ['Boost suggests your journey to passengers travelling along your route, including passengers who need a stopover you did not add. This can help you share more travel costs while helping passengers reach their destination.', 'As long as passengers have not booked, you can add or remove stopovers from your ride plan.'], sections: ['To add or remove stopovers', 'Adding a city', 'Your itinerary details', 'Responding to Boost booking requests'], bullets: ['From Your rides, select the publication, choose Edit your publication, then Itinerary details and Manage stopovers.', 'Remove a city by selecting it. Add a stopover by entering a full address, choosing a suggested city, or using your current location. You can add up to six.', 'Open the Ride plan to view meeting points on a map or export them to your GPS application. Avoid motorway toll stations as meeting points.', 'Approve or decline the request before it expires: within three hours during the day or twelve hours at night. Approving adds the stopover to your ride plan.'] },
	'Responding to booking requests': { paragraphs: ['If Instant Booking is disabled, passengers send a booking request. Approve or decline it within three hours by responding to the BlaBlaCar alert; at night, the response time can extend to twelve hours.'], sections: ['Ways to respond', 'Last-minute booking requests'], bullets: ['Use the link in the email to approve or decline the request.', 'Select the publication in Your rides to view and respond to requests.', 'Use the link in the SMS notification.', 'Once confirmed, available seats update automatically and contact details are shared by email.', 'Messaging agreement is not a booking; the booking must be confirmed through the online system.', 'Passengers can book up to fifteen minutes before departure, so respond within the displayed time limit.'] },
	'Messaging your passengers': { paragraphs: ['Your Inbox lets you contact passengers before and after a ride is confirmed. Select a passenger’s photo for more details.'], sections: ['If you cannot reply to previous messages', 'If the passenger is not responding after booking'], bullets: ['Significant updates to the date, time, or departure and arrival cities create a new ride version, so old messages may no longer be available. Warn interested passengers before editing again.', 'If a confirmed passenger is unreachable, you can cancel their booking and report the issue. Their seats become available for another passenger.', 'After confirmation, passenger contact details and ride information remain available in the Ride plan from Your rides.'] },
	'How to find your pickup and dropoff points': { paragraphs: ['Select your publication from Your rides and open the Ride plan to see where you will pick up and drop off passengers.', 'On iOS or Android, you can export a meeting point to your GPS app from Itinerary or the full-screen map. To change a meeting point, update the precise meeting point in the publication itinerary.'] },
	"What should I do if there’s an error with my ride?": { paragraphs: ['Edit your ride as soon as you spot the error.', 'If passengers have already booked and you cannot edit the ride, contact them and explain the mistake. If the changes do not suit them, cancel the ride and publish a new one.'] },
	"Why can’t I edit my publication after passengers book?": { paragraphs: ['Once a passenger books a seat, we limit the changes you can make to prevent misunderstandings and cancellations. Passengers book based on the itinerary, departure date and time, and price.'], sections: ['What you can still edit', 'Need to make other changes?'], bullets: ['How you accept bookings: instantly or manually.', 'The number of passengers you can take.', 'Your message for passengers.', 'Contact passengers to ask if they accept the proposed changes. If they do not, cancel the ride and publish a new one; all bookings will be cancelled.'] },
	"Why your vehicle’s picture isn’t visible": { paragraphs: ['Vehicle pictures have been removed from publications because they added an extra step for drivers without providing much value to passengers.', 'Your vehicle colour, make, and model are still shown so passengers know what kind of car they will travel in and can identify it at the start of the ride.'] },
	'If you cannot approve a booking request via SMS': { paragraphs: ['A booking request may not be approved by SMS for several reasons.'], sections: ['You did not respond in time', 'You accidentally declined', 'You could not approve by SMS'], bullets: ['The maximum response time is shown by email and SMS. Once it passes, the request is automatically cancelled. Use Instant Booking Approval next time to avoid missing bookings.', 'If you decline a request, it is automatically cancelled and cannot be recovered.', 'Follow the SMS link to approve or decline. If SMS continues to fail, use the BlaBlaCar website or mobile app instead.'] },
	'If you can’t add your vehicle': { paragraphs: ['If your vehicle meets the requirements but is not in the selection, contact support to add it to the database. Minivans are not allowed because drivers may not use the platform to make a profit by offering more seats than allowed.', 'Once a booking is confirmed, you can tell passengers about your vehicle directly through the app messaging system.'] },
	'Missed booking requests': { paragraphs: ['If Instant Booking is disabled and you do not respond to a passenger request, it expires within three hours and the request is automatically cancelled.'], sections: ['What you can do'], bullets: ['An expired request cannot be recovered, but you can ask the passenger to make a new request. This is not possible if you declined the original request.', 'Opt in to Instant Approval if you want bookings to be managed automatically.', 'Instant Approval is not yet available for Boost booking requests.'] },
	'Vehicle requirements': { paragraphs: ['Vehicles must have seat belts, four wheels, and fewer than seven seats to be allowed to carpool. Drivers can offer a maximum of four seats per ride, so minivans are not allowed because the platform is for sharing costs, not making a profit.'], sections: ['Electric cars', 'Company or rental cars'], bullets: ['If your electric car is not in the database, provide the make and model so it can be added.', 'Add any charging stopovers to your ride and mention the vehicle type, possible charging breaks, and estimated arrival time in the ride comment.', 'A company or professional car must not be used for a business trip. Its non-professional use must be authorised by the owner and covered by insurance.', 'You must bear the ride costs without reimbursement or tax deduction, and adjust passenger contributions to reflect your genuine fuel and toll costs.', 'Service vehicles intended only for professional use are not allowed on the platform.'] },
	'How do I know it’s OK to carpool?': { paragraphs: ['In India, the Motor Vehicles Act, 1988 regulates vehicles carrying passengers for hire and reward, but does not prohibit occasional lifts in a private car when payment only offsets trip costs.', 'BlaBlaCar recommends a contribution for each journey so car owners do not receive more than their running costs. Private car owners generally do not require a permit for carpooling when they are not operating for hire or reward.', 'State-level interpretations can differ, so seek independent legal advice before proceeding.'] },
}

const passengerArticleContent = {
	'Searching for a ride': { paragraphs: ['Enter where you are leaving from, where you are going, your departure date, and the number of passengers, then click Search.', 'Use Filters to narrow the results by ride type, price, departure time, amenities, number of changes, and driver preferences. Review the publication, bus amenities, and driver profile before continuing.', 'If you have questions, contact the driver from the publication. When you are ready, click Continue.'], sections: ['Can’t find a ride?', 'To create a ride alert'], bullets: ['Set up a ride alert to receive notifications when a suitable ride becomes available.', 'Go to Find a ride, enter your departure and destination, choose the travel day, and click Search.', 'Review the results and choose Create a ride alert. Logged-in members see a confirmation; other members must confirm their email.', 'Create a separate alert for each date you want to monitor.'] },
	'Using search filters': { paragraphs: ['Start by entering your departure point, destination, departure date, and total passengers. Results may include rides leaving or arriving near your selected locations.'], sections: ['Popular filters', 'Filter by preferences', 'Ride symbols and amenities', 'Search for pet-friendly rides'], bullets: ['Type of ride: carpool or bus.', 'Lowest price, closest departure, and earliest departure.', 'Verified Profile, Instant Booking, maximum two passengers in the back, Ladies Only, and preferred departure time.', 'Amenities such as pets allowed, restrooms, power outlets, and direct rides or rides with one change.', 'To find pet-friendly rides, search your route, open Filters, then select Pets allowed. Contact the driver to confirm your pet can travel.'] },
	'Ride alerts': { paragraphs: ['Many drivers publish only a few days before departure, so create a ride alert when you cannot find a suitable ride.'], sections: ['To create a ride alert', 'To delete a ride alert'], bullets: ['Go to Find a ride, enter your departure and destination, choose the travel day, and click Search.', 'Review the results and choose Create a ride alert. A green tick confirms an alert for logged-in members; other members confirm by email.', 'To stop push notifications only, open Notification preferences and uncheck Your account and bookings.', 'To delete an alert from email and push notifications, open the alert email and choose Delete this alert.', 'After you book a ride for the alerted route, the alert is automatically deleted when you are logged in.'] },
	'Choosing a carpool driver': { paragraphs: ['Find a ride with departure and arrival cities and a time that suit you. Before booking, review the driver and publication carefully.'], sections: ['What to check'], bullets: ['Verified Profile: the driver has confirmed their identity document, email, and phone.', 'Experience level: experienced drivers may be a good choice for a first carpool.', 'Ratings: use feedback from other members when deciding who to travel with.', 'Preferences and mini-bio: check whether the driver smokes, likes conversation or music, and other preferences.', 'A trusted driver will not ask you to pay more or move payment off the BlaBlaCar platform. Report anyone who asks you to bypass official booking.'] },
	'Instant Booking': { paragraphs: ['Instant Booking lets you book immediately without sending a request to the driver. Use the Instant Booking filter when you need a last-minute ride.'], sections: ['Booking requests'], bullets: ['A driver has up to three hours during the day and twelve hours at night to approve or decline a request.', 'When confirmed, you receive an email or SMS with the driver’s contact details.', 'If declined or expired, you receive an email or SMS notification.'] },
	'How to Make a Special Request': { paragraphs: ['Before booking, you can request a different pickup or drop-off location, extra luggage, or offer a top-up for the driver’s extra effort. You can also propose a lower price.'], sections: ['How it works', 'Booking and payment'], bullets: ['Find a ride, choose Contact, select Make a special request, and choose a category. You can submit one request per ride.', 'Add a clear message describing your needs and set a top-up or proposed lower price.', 'The driver can accept, decline, or make one counter-offer. You will receive notifications in the app and Inbox.', 'Do not book before approval. Booking early creates a standard booking and does not apply the Special Request.', 'After acceptance, pay for the ride as usual, including the agreed top-up. An approved pickup or drop-off change appears in your booking and messages.'] },
	'Ladies only': { paragraphs: ['Women Only rides let female members organise a ride where the driver and all passengers are women. Complete profiles, verified details, preferences, and ratings also help build trust regardless of gender.'], sections: ['Finding a ride', 'Offering a ride'], bullets: ['Log in, search your route, and select the Ladies Only filter. This filter is visible to logged-in members.', 'Female drivers with empty seats can publish a Women Only ride, which is visible only to women.', 'BlaBlaCar does not assign a gender to members and does not tolerate discrimination.'] },
	'Contacting a Driver without booking a ride': { paragraphs: ['Messaging a driver before booking is useful when you have questions about the ride. First review the publication details, then choose Contact Driver. Most drivers respond within a few hours.'], sections: ['Contacting the driver', 'Exchanging information', 'If the driver is not responding', 'Contacting the driver after booking'], bullets: ['You cannot message a driver if the ride leaves in fifteen minutes or less, is in the past, the driver refused your request, or no seats remain.', 'Keep communication on BlaBlaCar. Do not share personal or payment information before booking and do not open suspicious links.', 'Contact other drivers if one is not responding; you can message multiple drivers.', 'After booking, use the phone number sent by email, the driver profile in Your rides, or your Inbox. If the driver is unreachable, cancel and select driver was unreachable.'] },
	'Cancelling your carpool booking': { paragraphs: ['You can cancel any booking from Bookings. Cancel as soon as possible so another passenger can book the seat, and consider messaging the driver to let them know.'] },
	"What if the driver cancels the ride or doesn't show up?": { paragraphs: ['If the driver is delayed, especially at a stopover, wait thirty minutes and call them to check what happened.'], sections: ['The driver did not show up'], bullets: ['Within one hour after the estimated arrival time, open Your rides and select the booking.', 'Choose Report you didn’t travel together, explain what happened, and confirm.', 'A driver who does not show up receives an automatic negative rating.'] },
	'How to find your carpool booking': { paragraphs: ['Go to Your rides and select the ride to open your Ride plan details, including the departure point.'], sections: ['Understanding your booking status'], bullets: ['Awaiting driver approval: the request was sent and the driver has up to three hours during the day or twelve hours at night to respond.', 'Cancelled: the driver or passenger cancelled, the passenger cancelled before approval, or the driver declined the request.', 'Open claim: the team is reviewing a disagreement about a cancellation or no-show.', 'Answer driver’s claim: the driver reported that you did not travel together and you need to provide the reason.'] },
	'Making a claim for a carpool': { paragraphs: ['Report a problem within one hour after the ride if you did not travel with the driver, could not cancel before departure, experienced a problem during the ride, the ride did not take place, or you need to report a money-related issue.'], sections: ['How claims work', 'How long claims take'], bullets: ['Open Your rides, choose Report you didn’t travel together, and provide the reason and details.', 'If both parties disagree, the Community Relations team decides using the circumstances and available information.', 'When a claim is opened, you have seven days to respond to the complaint through BlaBlaCar.', 'Contact support if a complaint is in progress or you want to dispute its processing.'] },
	'Communicating with the driver after booking': { paragraphs: ['After your booking is confirmed, use the driver’s phone number in the booking details, select the booking in Your rides and tap the driver’s name, or message them through your Inbox. The discussion shows the driver’s average reply time.', 'If you cannot reach the driver after booking, cancel your booking and select driver was unreachable.'] },
	'If the carpool driver makes changes to the ride': { paragraphs: ['The driver should contact you if they change the route, departure point, or departure time. If the changes suit you, you can travel together as planned.', 'If they do not suit you, open Bookings, find the ride, choose Cancel, and provide a reason. The reason helps improve the service and is not published on your profile.'] },
	'Driver response time': { paragraphs: ['Unless the ride has Instant Booking, the driver must approve your request. Drivers have three hours during the day to approve or decline, and you can check the status in Your rides and Ride plan details. You will also receive an email update.'], sections: ['When to reach out', 'If you have not heard back'], bullets: ['Before requesting, message the driver about luggage or travelling with a pet, after checking the publication details.', 'Use your Inbox or the publication in Your rides to ask clear questions.', 'If the request expires or the driver does not respond, contact other drivers. The driver may simply be unavailable.'] },
	'Understanding the passenger cancellation rate': { paragraphs: ['Drivers can see how often you cancel confirmed bookings, just as you can see a driver’s cancellation history before booking. This helps the community plan reliable shared rides.', 'The rate reflects confirmed bookings cancelled over the last eighteen months.'], sections: ['How it works', 'Tips for managing your bookings'], bullets: ['Never cancels bookings.', 'Rarely cancels bookings.', 'Sometimes cancels bookings.', 'Often cancels bookings.', 'Only book when your plans are confirmed, communicate with your driver if you must cancel, and always cancel through BlaBlaCar so the driver is notified and the seat becomes available.'] },
	'How to pay with PayPal': { paragraphs: ['Paying the driver is easy: give them cash on the day of the ride and bring the exact change.'] },
	"When you'll pay for your carpool booking": { paragraphs: ['With Instant Booking, your reservation is made immediately. With a booking request, it is made after the driver approves it. Once confirmed, you receive a booking email and can view the ride in Your rides.'], sections: ['How the driver gets paid'], bullets: ['Pay the driver in cash at the end of the ride.'] },
	"If you can't send a message": { paragraphs: ['Messages may not send if they do not meet the guidelines, your connection is weak, or the ride was more than twenty days ago.'], sections: ['Passenger-specific reasons'], bullets: ['There is no Contact driver button for the ride.', 'The driver refused your request.', 'There are no seats left.', 'The ride departs in fifteen minutes or less.', 'If none of these applies, contact support for help.'] },
}

const profileAccountArticleContent = {
	'Creating an account': { paragraphs: ['Signing up is free. Visit blablacar.in and choose Sign Up, or download the mobile app and follow the instructions.'], sections: ['Sign-up options'], bullets: ['Use an email address.', 'Use a Facebook account.', 'Complete your profile before booking a carpool or bus ride.'] },
	'Logging in to your BlaBlaCar account': { paragraphs: ['Choose Log in, select Facebook or email, and enter your login details. Select Remember me to stay logged in next time.'] },
	'Adding vehicles to your profile': { paragraphs: ['Adding a vehicle saves time, lets you choose the car for each ride, and helps passengers understand the vehicle and luggage space before booking.'], sections: ['To add a vehicle', 'Privacy'], bullets: ['Open your Profile, scroll to Vehicles, choose Add vehicle, enter the details, and save.', 'If an electric car is missing from the database, provide its make and model so it can be added.', 'Choose the vehicle for a ride from Your rides, Edit your publication, and Seats and options.', 'Only the vehicle make and model are shared with the community; your licence plate is private.', 'Minivans are not allowed because drivers must not use the platform to make a profit.'] },
	'Change your email address': { paragraphs: ['Keep your email current and verified so you receive booking information.'], sections: ['To change your email', 'To verify your email', 'Privacy'], bullets: ['Open Profile, About you, and Edit personal details.', 'Select your existing email, enter the new address, and save.', 'The email can belong to only one account. Reset the password for an existing account if needed.', 'Follow the verification link sent by email or choose Verify my email from your Profile.', 'Your email is never shared with other members.'] },
	'Changing the language or currency on BlaBlaCar': { paragraphs: ['Language and currency are linked. When using BlaBlaCar in English, currency defaults to GBP. If a language is not listed, it is not currently available.'], sections: ['Android app', 'iOS app', 'Website'], bullets: ['Open phone Settings, choose Applications, find BlaBlaCar, clear its data, then reopen the app and choose your country and language.', 'On iOS, change the device language under Settings, General, Language & Region, then reinstall the app.', 'Choose the language from the BlaBlaCar website footer.'] },
	'Edit your account settings': { paragraphs: ['About you controls the information shared with members, while Account contains password, communication, privacy, and account actions.'], sections: ['About you', 'Account'], bullets: ['Edit personal details, mini-bio, profile photo, travel preferences, ID verification, and vehicle details.', 'Open Profile, Account to manage ratings, communication preferences, password, postal address, data protection, and logout.', 'Driver and passenger profiles are the same: you become a driver when offering a ride and a passenger when booking a seat.'] },
	'Managing your notifications': { paragraphs: ['BlaBlaCar can send push, email, SMS, WhatsApp, and phone notifications.'], sections: ['To manage notifications', 'Notification types'], bullets: ['Open Profile, Account, and Communication preferences.', 'Manage promotions and tips, messages, reminders, account support, ride information, and booking confirmations.', 'Deselect marketing communications or use Unsubscribe in an email.', 'Booking, account, legal, and support communications cannot be disabled because they contain important information.', 'Close your account if you no longer want any BlaBlaCar notifications.'] },
	'Uploading your profile photo': { paragraphs: ['A profile photo helps members recognise you and builds trust. Open Profile, About you, and Add profile picture. Upload a JPEG, GIF, or PNG up to 2 MB, or take a photo with your phone.'], sections: ['Photo guidelines', 'Troubleshooting'], bullets: ['Be alone, recognisable, and close to the camera.', 'Do not wear sunglasses and use a clear, presentable photo.', 'Approval can take up to 24 hours. A photo may be refused if it is blurry, distant, an illustration, includes multiple people, contains contact information, or is inappropriate.', 'If the image is too large, reduce it to under 2 MB.'] },
	'Closing your account': { paragraphs: ['Contact support before closing if you have an unjustified rating or technical problem.'], sections: ['To close your account'], bullets: ['Open Profile, Account, and Close my account.', 'Confirm the closure on the close-account page.', 'The page is currently available on the mobile and desktop websites.', 'A closed account cannot be reactivated and its data cannot be recovered. A new email is required to create another account.'] },
	'Merging multiple accounts': { paragraphs: ['Past or active bookings, ride offers, and ratings cannot be merged between accounts. Keep the account you use most to preserve its experience level and delete the other account after existing rides are complete.'] },
	'What is the Verified Profile badge?': { paragraphs: ['The Verified Profile badge helps members identify trusted profiles. It means the member submitted required information and it matched their profile details, but it does not guarantee identity.'], sections: ['Do I have to verify?', 'How to get the badge'], bullets: ['Verification is optional but recommended for trust and visibility.', 'Verify your ID, phone number, and email address.', 'ID information and documents remain confidential; members only see the verification badge.'] },
	'Verifying your ID': { paragraphs: ['ID verification adds trust and can improve visibility and booking requests. A third-party provider checks the document through the BlaBlaCar app.'], sections: ['Accepted documents', 'Privacy'], bullets: ['Depending on your country, use a passport, national ID, residence permit, driving licence, or tax ID.', 'If information does not match, update your profile or contact support for a gender change.', 'Your ID photo and details are confidential. Other members only see the ID-verified tick.'] },
	'How to submit your ID': { paragraphs: ['Open Profile, About you, and Verify ID. Choose and upload a clear colour photo, then confirm your identity.'], sections: ['Tips for a successful verification'], bullets: ['Photograph both sides of an ID card, driving licence, tax ID, or residence permit.', 'For a passport, include the photo and numbers at the bottom of the page.', 'Use a well-lit, sharp image, grant camera permission, and submit original documents.', 'Make sure your profile name matches your ID and use a driving licence or passport when requested.', 'Use the account you rely on most if you have duplicate accounts.'] },
	'Verify your phone number': { paragraphs: ['Members must verify a mobile number before publishing or booking rides or messaging other members.'], sections: ['To verify your number', 'Privacy and troubleshooting'], bullets: ['Open Profile, About you, and Confirm phone number.', 'Choose your country, enter your mobile number, and continue.', 'Enter the four-digit SMS code. It may take a few minutes to arrive.', 'Use a mobile number with SMS service, check that it is correct, and use the existing account if the number is already linked elsewhere.', 'Your number is private and is shown to the other member only after a booking is confirmed.'] },
	'Reporting suspicious activity': { paragraphs: ['Report suspicious messages, profiles, and rides to help keep the community safe. Communicate and pay only through BlaBlaCar.'], sections: ['To report a suspicious message', 'To report a suspicious profile', 'To report a suspicious ride'], bullets: ['Open Inbox, select the conversation, choose Report from the menu or guidelines page, select a reason, and follow the prompts.', 'Open the member’s Profile, choose Report this member, select a reason, and follow the prompts.', 'Open the publication, choose Report this ride, and follow the prompts.'] },
	'Change or reset your password': { paragraphs: ['Reset your password from Login, Continue with email, and Forgot my password. Enter your email and send the reset link. The link is valid for 24 hours, so check spam if it does not arrive.'], sections: ['To change your password', 'Creating a password for direct login', 'Troubleshooting'], bullets: ['Open Profile, Account, Password, enter your current password, enter and confirm the new password, and save.', 'If you signed up with Facebook or Apple, log out and follow the reset steps to create a password.', 'If the email does not arrive, check spam and contact your email provider. If the link expired, request a new one.', 'You must access the email on your account to reset the password. Contact support if you have lost access.'] },
	'BlaBlaCar and your personal info': { paragraphs: ['Your account information is kept while you use the platform. If you close your account or it becomes inactive, personal information is deleted according to the Privacy Policy.'] },
	'Creating a strong password': { paragraphs: ['Use a unique BlaBlaCar password that you do not use for your bank account, email, or other websites. Never share it in email or other messages.'], sections: ['Do', 'Do not'], bullets: ['Use at least eight characters, with at least one letter, number, and special character.', 'Combine words and symbols into a unique phrase and use a password manager if helpful.', 'Do not use common words, names, birth dates, or simple combinations such as pet1990.'] },
	'How we keep your ID secure': { paragraphs: ['A third-party provider compares your name, date of birth, and gender on your ID with your BlaBlaCar profile. If details do not match, your profile data may be amended to match the ID.', 'Your ID photo and details remain confidential, are never shared with members, and are not used for background checks. Members only see the ID-verified label. Your age is displayed to help maintain trust and safety.'] },
	'How do I exercise my data subject rights?': { paragraphs: ['Closing your account permanently deletes your personal data within 30 days, except information BlaBlaCar may legally retain. You can close the account from Close my account or contact the Data Protection Office.'], sections: ['Marketing communications', 'Data access and portability', 'Objecting to processing'], bullets: ['Open Profile, Account, Communication preferences, then deselect marketing push or email communications. Important booking, ride alert, cancellation, legal, and support notifications continue.', 'Request a copy of your personal data in a structured, commonly used, machine-readable format from the Data Protection Office.', 'Ask BlaBlaCar not to process personal information for specific purposes described in the Privacy Policy. Provide the email registered to your account when contacting support.'] },
	'About 2-step authentication': { paragraphs: ['Two-step authentication confirms that it is really you logging in. First enter your email and password, then enter the six-digit code sent to your email.', 'This security measure protects personal information and cannot be turned off. You complete it every time you log in.'] },
	'I think my account has been compromised': { paragraphs: ['Warning signs include an unexpected password or profile update, a password that no longer works, an unexpected trip notification, messages you did not send, or unfamiliar profile details.'], sections: ['Regaining access'], bullets: ['If you can log in, change your password, create a strong unique password, and correct unfamiliar email, phone, or profile details.', 'If you cannot log in, contact support immediately with the email and phone number used to create the account.', 'Review the online security tips to prevent unauthorised access.'] },
	'Online security tips': { paragraphs: ['Use a unique password of at least eight characters with letters, numbers, and special characters.'], sections: ['Online safety', 'Messages'], bullets: ['Check for HTTPS, a padlock, and an official BlaBlaCar country domain before entering information.', 'Use your own device and keep software and devices updated.', 'Communicate only on BlaBlaCar, do not share personal details before booking, and do not open suspicious links or attachments.', 'BlaBlaCar will never ask for your login off-platform. Report suspicious payment links or messages.'] },
	'Where and when is my phone number displayed?': { paragraphs: ['Your phone number is shown to the other party only after a booking is confirmed. It is saved on your profile and is not displayed elsewhere on the site. You can choose whether to receive marketing communications when adding the number.'] },
	'How do I know if a website or link is really from BlaBlaCar?': { paragraphs: ['Phishing links imitate BlaBlaCar to steal personal information. BlaBlaCar will not ask you to log in outside its platform.'], sections: ['How to identify fraudulent links', 'Reporting scams'], bullets: ['Check for a padlock, HTTPS, and an official country domain such as www.blablacar.in.', 'Read the entire address carefully. Misspellings, extra characters, and domains such as blablacar-eu-ticket.co.uk are suspicious.', 'Do not open suspicious links from messages or email. Report them immediately.'] },
	'My phone number is already in use': { paragraphs: ['If your phone number is linked to another account while registering, contact support if the account is not yours.'], sections: ['If the account is yours'], bullets: ['Continue using the older account to keep its established experience level.', 'If you prefer the new account, verify the mobile number with the four-digit SMS code. It will move from the old account to the new one.', 'A phone number linked to an account with several bad ratings may not be used for a new account.'] },
	"Why can't I sign up?": { paragraphs: ['Signup or login problems can happen for several reasons.'], sections: ['Common causes', 'You are on the wrong page'], bullets: ['An account closed because of negative ratings may block re-registration with the same phone or email; contact support to request reactivation.', 'If you already have an account, log in with that email and password or reset the password.', 'If you signed up with Facebook, log in without a password unless you later create one, which switches login to email and password.', 'After resetting a password, reinstall the app, enable cookies, or try incognito or another browser.', 'Use the blue avatar to choose the correct Log in or Sign up option. Contact support if the problem continues.'] },
	"If you can't verify your phone number": { paragraphs: ['If your number is not recognised or the four-digit code does not arrive, check the following.'], sections: ['Troubleshooting'], bullets: ['Check the country code and phone number in your Profile.', 'If the number is already in use, log in to the existing account or contact support if it is not yours.', 'Use a mobile number, not a landline.', 'Check with your carrier that your mobile plan can receive SMS messages.'] },
	'Reporting a technical issue': { paragraphs: ['Contact support through the contact form and include as much detail as possible. Screenshots and exact error messages help the team investigate.'], sections: ['Before contacting support'], bullets: ['Check your internet connection and restart your router.', 'Use the latest version of the app.', 'Clear browsing data, history, cookies, and cache on the web.', 'Turn off your ad blocker or VPN while testing.'] },
	"If you're missing notifications": { paragraphs: ['If notifications are missing, check your email address, preferences, and device settings.'], sections: ['Troubleshooting'], bullets: ['Update an outdated email address from your Profile so notifications reach you.', 'Open Communication preferences and re-enable the notifications you opted out of.', 'Open your phone settings and enable notifications for the BlaBlaCar app.', 'Use Communication preferences to change how you receive messages.'] },
	'Why can’t I log in after changing my password ?': { paragraphs: ['If you still cannot log in after resetting your password, reinstall the app or check that browser cookies are enabled. On Android, clear BlaBlaCar app data from Phone settings, Applications, and Storage.', 'Try an incognito window or another browser when opening the reset link. Update older devices where necessary, then contact support if the issue continues.'] },
	'Issues with my profile photo': { paragraphs: ['A profile photo may not be visible until moderation is complete, which can take up to 24 hours. Upload a new photo if the current one was refused.'], sections: ['Reasons a photo may be refused', 'Your image is too large'], bullets: ['Do not use sunglasses, blurry or distant photos, illustrations, fictional characters, or photos with several people.', 'Use a high-quality, centred photo where your face is recognisable.', 'Do not include contact information or inappropriate content.', 'The image must be no larger than 2 MB. Reduce its size and submit a new photo.'] },
}

const trustSafetyArticleContent = {
	'Pet policy': { paragraphs: ['Pets may carpool when accompanied by their owner and allowed by the driver in the ride details. After booking, message the driver so there is enough room.'], sections: ['Carpooling'], bullets: ['Large pets or pets in cages may require an additional seat.', 'The pet owner is responsible for travel equipment and health documents.', 'Use the Pets allowed filter to find suitable rides.'] },
	'Transporting parcels': { paragraphs: ['Unaccompanied animals and parcels cannot be sent in a carpool. Animals and parcels are allowed only when the owner travels with them.'], sections: ['Community standards'], bullets: ['Drivers are responsible for knowing what and who they transport.', 'Drivers may ask passengers to open luggage, bags, suitcases, and parcels accepted in the vehicle.', 'The restriction protects members and keeps carpooling focused on shared journeys and costs.'] },
	'Nondiscrimination Policy': { paragraphs: ['BlaBlaCar is committed to an inclusive, welcoming, and respectful community built on freedom, fairness, and fraternity.'], sections: ['Drivers must not', 'Drivers may'], bullets: ['Decline or impose different terms based on race, colour, ethnicity, origin, religion, sexual orientation, gender identity, age, appearance, disability, marital status, or protected familial status.', 'Refuse a request or make comments based on a member’s actual or perceived disability or protected characteristics.', 'Decline for reasons not prohibited by law, such as not accepting pets.', 'Publish Ladies Only rides when needed to create a safe space.', 'Drivers who consistently reject protected groups may have their accounts suspended.'] },
	'Is a driver responsible for their passengers’ luggage?': { paragraphs: ['Each passenger is responsible for their own luggage. Ask passengers to label their luggage to avoid confusion about ownership. Contact support immediately if there are issues with authorities during the ride.'] },
	'How do I report a message on BlaBlaCar?': { paragraphs: ['Open Inbox and select the conversation with the person you want to report.'], sections: ['Report a message'], bullets: ['Use the three-dot menu at the top of the conversation or the guidelines page at the bottom and choose Report.', 'Select the reason and follow the on-screen prompts.'] },
	'Who is responsible in case of an accident?': { paragraphs: ['The driver is responsible for passengers and the driver’s insurance covers all occupants of the vehicle, as with any other ride.'], sections: ['After an accident'], bullets: ['The driver should help passengers with next steps and share insurance details.', 'Contact BlaBlaCar support so the team can provide suitable assistance.'] },
	'How to report discrimination to BlaBlaCar': { paragraphs: ['BlaBlaCar takes discrimination reports seriously. Contact support to report content from profiles, rides, or booking requests that violates the Nondiscrimination Policy.'] },
	'What it means when BlaBlaCar suspends my account': { paragraphs: ['BlaBlaCar reviews ratings and reports from members. You receive an email explaining the reason for a suspension.'], sections: ['Why an account may be suspended', 'Appealing a suspension'], bullets: ['Consistently poor ratings may lead to suspension.', 'A profile or publication repeatedly reported for violating the Terms and Conditions may lead to suspension.', 'Suspensions are rarely reversed, but contact support to appeal if you believe the decision was a mistake.'] },
	'Reporting inappropriate behaviour: What to do if you feel unsafe': { paragraphs: ['BlaBlaCar does not tolerate abusive or non-consensual behavior. Report inappropriate behavior to BlaBlaCar and the authorities immediately if you feel uncomfortable or unsafe.'], sections: ['What to do'], bullets: ['Firmly say no and ask the person to stop.', 'Tell loved ones what is happening and share details about the incident and ride.', 'Report the member anonymously from their Profile by choosing Report this member.', 'If threatened, contact Women In Distress at 1091, Police at 112 or 100, or someone who can contact authorities.', 'If you experience sexual violence, report it to the police or an appropriate government-certified hotline. Victims are never at fault.'] },
	'How to report bad behaviour': { paragraphs: ['Contact support with the details of what happened and identify the person involved. The team will help and take steps to prevent it happening again.'], sections: ['Report a member'], bullets: ['Open the member’s Profile.', 'Choose Report this member at the bottom of the page.', 'Select a reason and follow the on-screen prompts.', 'Leave a rating to share your experience with the community.'] },
	'Drivers: use our checklist to prepare for your journey': { paragraphs: ['Use this checklist before setting off and keep the required documents with you or in your car.'], sections: ['Documents', 'Your car', 'Weather, especially in winter', 'Cross-border rides'], bullets: ['Carry valid insurance, your driving licence and registration documents, and two road traffic accident report forms.', 'Check tyre pressure, coolant, oil, windscreen wash, hazard triangle, spare wheel, jack, functioning seatbelts, and two high-visibility jackets.', 'In cold weather, use de-icing product, check the battery, lights, electrical system, defroster, heating, and tyres, defrost windows, and clean both headlamps.', 'Use snow tyres or chains where needed and practise fitting them.', 'Carry a valid passport for cross-border rides.'] },
	'Drivers: 10 tips for travelling safely': { paragraphs: ['Drive well-rested and take a 15 to 20 minute break every two hours. Talking with passengers can also help reduce tiredness.'], sections: ['Safe driving essentials'], bullets: ['Every passenger needs their own seat and seatbelt. Children up to 12 need an approved child car seat.', 'Leave at least two motorway chevrons, about 40 metres, between cars and double the distance in bad weather.', 'Never use a phone while driving. Do not drive after alcohol or drugs.', 'Take more frequent breaks at night and slow down in rain, snow, and poor visibility.', 'In rain, increase distance and use dipped headlights. In snow, drive slowly and smoothly, brake gently, and slow before turns.', 'Drivers are responsible for passenger wellbeing. Passengers should avoid distracting the driver and wear seatbelts.'] },
	'Being a considerate driver': { paragraphs: ['A good carpool driver is a welcoming host: drive carefully, respect passenger requests within reason, and stay focused on the road.'], sections: ['During the journey'], bullets: ['Drop passengers at agreed, suitable locations rather than motorway rest areas or unsafe places.', 'Consider passenger comfort and do not overload the car, especially with luggage.', 'Make a little effort to communicate while respecting that passengers may be tired or quiet.', 'Ask how best to help passengers with special needs, sensory sensitivities, or mobility needs.', 'Leave a rating for passengers after the journey.'] },
	'Carpooling experience : Safety tips': { paragraphs: ['Use BlaBlaCar trust features and remain alert before and during your trip.'], sections: ['On the platform', 'Preparing to travel', 'At the meeting point'], bullets: ['Check Verified Profile badges, Ambassador profiles, and ratings.', 'Use BlaBlaCar messaging and report suspicious messages.', 'Confirm that the meeting point is an accessible public location and consider Ladies Only rides.', 'Charge your phone, keep it on, and share your itinerary with someone you trust.', 'Check that fellow carpoolers match their profiles and that the car matches the listed make and model. Cancel and report if it does not.'] },
	'How do I stay safe on the road?': { paragraphs: ['Make sure everyone wears a seatbelt and control the safety details you can.'], sections: ['Passengers', 'Drivers'], bullets: ['Keep luggage in the boot, use a child seat for children under 135 cm, and do not distract the driver.', 'Do not use a phone while driving. Let passengers set up navigation and take hands-free calls only.', 'Take a break every two hours and rest before night travel.', 'Keep the vehicle insured and check the Certificate of Fitness, tyres, oil, water, brakes, headlights, and wipers.', 'Follow traffic laws.'] },
	'What is expected of me when I travel?': { paragraphs: ['Drivers should care for passengers, listen to reasonable requests, drive calmly, arrive on schedule, and use suitable pickup and drop-off locations. Do not overfill the vehicle.'], sections: ['Passengers', 'Being a considerate passenger'], bullets: ['Do not treat the driver as a taxi, arrive late, cancel at the last minute, or demand large detours.', 'Do not book multiple drivers for the same trip or negotiate an agreed price.', 'Respect the driver’s music and smoking preferences, keep the car clean, and be ready to pay in cash.', 'Leave a rating after the ride to help the carpooling community.'] },
	'Child travel policy': { paragraphs: ['Passengers must be over 18 to create a BlaBlaCar account, but an adult can book a ride for a child. A child occupies a full seat and the accompanying passenger must bring suitable equipment such as a car seat, booster seat, or seat-belt adaptor.'], sections: ['Carpooling with children'], bullets: ['Children up to 13 must travel with a legal guardian or an adult authorised by one, for domestic and international rides.', 'Young children must use a suitable car seat or booster. Book a seat for both the child and accompanying adult.', 'Children over 13 may travel alone with parental authorisation for domestic and international rides.', 'Before booking, contact the driver, agree on pickup and drop-off points, and arrange for someone to meet the child at the destination.'] },
	'Is there a reduced carpooling rate for children?': { paragraphs: ['Passengers must be over 18 to create an account, but an adult can book a ride for a child. A child occupies a full seat whether using a child seat or a normal seat belt, so there is no reduced carpooling rate. The accompanying passenger is responsible for suitable travel equipment.'] },
	'Carpool parental authorisation form': { paragraphs: ['Use a written authorisation for a minor travelling in a carpool. The form should identify the parent or guardian, child, car owner, journey date and time, departure and arrival cities, and an emergency contact.'], sections: ['Information to include'], bullets: ['Parent, mother, father, or guardian full name, address, phone numbers, email, and signature.', 'Child full name and date of birth.', 'Driver or car owner full name, address, phone numbers, and email.', 'Emergency contact details if different from the guardian.', 'Date and place of signature, with copies signed by the guardian and car owner.'] },
}

function HelpArticleView({ title, articles, onBack, onSelectArticle }) {
	const [feedback, setFeedback] = useState(null)
	const content = {
		'Publication requirements': { paragraphs: ['The following ride details are essential when offering a ride:', 'Your departure and arrival point, any stopovers you can make during your ride to pick up and drop off passengers, and the date and time of your departure.', 'You can publish a maximum of 4 rides within a 24-hour period with departure times 20 minutes apart. These limits ensure that carpooling remains focused on sharing planned journeys and that passengers can rely on published rides.'], sections: ['Indicating your exact meeting point', 'Electric vehicles', 'How many passengers can I take?', 'Community standards'], bullets: ['Select the publication in Your rides, edit your publication, open Itinerary details, then update the meeting point with an exact address.', 'We recommend checking Google Maps for exact addresses. Electric-vehicle drivers should add charging stopovers and mention the vehicle type, charging breaks, and estimated arrival time.', 'The maximum number of seats you can offer is 4. Keep the middle seat free when appropriate for passenger comfort.', 'Carpooling shares costs and is not intended to generate profit. Do not offer more than 4 seats or post the same ride multiple times.'] },
		'Setting a price per seat': { paragraphs: ['To maintain the spirit of carpooling and maximise your savings, we recommend the suggested price per seat when publishing your ride.', 'You can update the recommended price with the plus and minus buttons within the suggested range, or edit the price per seat after publishing. If you add stopover cities, you can update the recommended price for specific stopovers.', 'Learn more about how stopover pricing works in the relevant Help Centre article.'] },
		'Instant Booking': { paragraphs: ['If your publication has Instant Booking turned on, passengers can book immediately without sending a booking request.', 'Passengers book immediately on the platform and you receive a booking confirmation by email with the passenger’s name and mobile number. Instant Booking is not yet available for Boost booking requests.'], sections: ['To turn Instant Booking on or off'], bullets: ['Select the ride from Your rides.', 'Open Your Publication, then Edit your publication.', 'Go to Seats and options.', 'Turn Instant Booking on or off.'], },
		'Boost booking': { paragraphs: ['It is not mandatory to add stopover cities, but we recommend doing so to increase your chances of finding passengers interested in part of your route.', 'With Boost on, our technology suggests rides with convenient meeting points for passengers searching along your route. Once you approve a Boost booking request, the proposed meeting point becomes a new stopover for regular bookings.', 'For example, a ride from London to Manchester with a Birmingham stopover can appear for passengers travelling London to Birmingham or Birmingham to Manchester. With Boost off, you only receive bookings and requests for the original ride.'], sections: ['To turn Boost on or off'], bullets: ['Go to Your rides.', 'Select the ride you want to update.', 'Choose Edit your publication, then Boost booking requests.', 'Select the blue checkbox and press Save.'] },
		'Handling Special Requests from Passengers': { paragraphs: ['Passengers can submit one Special Request before booking. They may request a different pick-up or drop-off location up to 3 km from your route, extra luggage, or another option in exchange for a top-up. They can also negotiate a lower ride price.', 'You will receive the request by email, in the app, and in your Inbox according to your communication preferences. Each request includes the passenger’s requirements and proposed top-up.'], sections: ['Available options', 'Booking and Payment'], bullets: ['Accept: agree to the terms and top-up amount or lower ride price.', 'Modify: make one counter-offer if the top-up is too low. This is not available for negotiating a lower price.', 'Decline: reject the request and optionally add a brief message.', 'Passengers can send only one request per ride and drivers can make only one counter-offer. Once accepted, the passenger books and pays the full amount onboard, including the top-up.'] },
		'How do I publish a Ladies only ride?': { paragraphs: ['If you are a female driver with empty seats, you can offer a ride for female members only.'], sections: ['To publish a Women Only ride'], bullets: ['Log in to your CarPooling account.', 'Click Publish a ride and follow the steps.', 'When choosing the number of passengers, select Women Only under Passenger options.', 'Publish the ride. A female icon will appear and the ride will only be visible in search results to logged-in women.', 'To edit an existing ride, open Your rides, choose Edit your publication, select Passenger options, check Women Only, and save. You can only add this option before receiving bookings.'], },
		'How Pricing works ?': { paragraphs: ['Prices are fixed when a driver offers a ride and are non-negotiable. The price is based on a suggested contribution calculated according to the itinerary and real costs incurred by the driver.', 'Drivers may adjust the price within reason to account for the comfort of their car or their willingness to make a detour. The price cannot exceed the maximum suggested contribution, ensuring costs are fairly shared and that drivers do not make a profit.'] },
		'How carpool ratings work': { heading: 'Star ratings', paragraphs: ['Ratings are a great way for fellow carpoolers to give each other feedback. They help the community know what to expect when making travel plans.', 'One hour after your ride is complete, we send an email asking you to rate your fellow carpoolers with a star rating and a short review. Ratings are published after both parties have submitted theirs.', 'Members have 14 days to leave a rating. Ratings range from 1 to 5 stars and help build a trusted community.'], sections: ['Automatic ratings', 'Editing a rating you left', 'Removing ratings', 'Why you can’t see your rating before leaving one'] },
		'About Experience Levels': { heading: 'CarPooling’s Experience Levels', paragraphs: ['When you share a ride on CarPooling, you travel with a member of a trusted community. Every member has an Experience Level that evolves with time and activity.', 'Your level is based on profile completion, the number and percentage of positive ratings received, and how long you have been a member. Your level is updated within 24 hours.'], sections: ['How to raise your Experience Level', 'Becoming an Ambassador - what it does for you', 'Trust is the key'] },
		'What is Zen, Door-to-Door Carpool Ride?': { heading: 'How it works', paragraphs: ['Drivers who are flexible with their route and schedule can match with passengers willing to pay a higher contribution for a door-to-door carpooling experience.', 'Drivers can enable the Zen option to receive requests from passengers who want to book empty seats. Passengers can request a ride that starts and ends exactly where they need it.', 'Once your booking is confirmed, the details are available in Your rides. Passengers pay the driver directly in cash during the ride.'], sections: ['Where to find your ride details', 'Payment', 'Cancellations', 'Safety'] },
		[articles[0]]: { heading: 'Search for a ride', paragraphs: ['To find a ride, say where you’re heading, leaving, and when. Then pick a ride that works for you. If you need more information, message drivers before booking or check their profiles to view their ratings.', 'Can’t find a ride? Narrow your results using search filters or set up a ride alert to receive notifications when a ride is available.'], sections: ['Contact a driver about a ride', 'Book and pay online'] },
		[articles[1]]: { paragraphs: ['Head to the App Store or Google Play Store to download the CarPooling app. You can also use and bookmark our mobile site.', 'The app keeps your rides, messages, and profile details together wherever you travel.'] },
		[articles[2]]: { paragraphs: ['So you’re ready to offer a ride! Publish a ride and tell us where you’re going and when. Decide whether to let passengers book instantly or review their booking requests.', 'You can publish multiple dates for regular journeys. Add your departure and arrival points, choose a price per seat, and share your empty seats with passengers.'], sections: ['To publish your return ride'] },
		[articles[3]]: { paragraphs: ['Most journeys on CarPooling are long distance and planned in advance, which makes them useful for regular travel.', 'If you have a regular long-distance commute, CarPooling can help you share the cost and meet passengers travelling in the same direction.'] },
		[articles[4]]: { paragraphs: ['We send an email that can be used to justify your expenses immediately after you book online. It shows how much you paid or will pay during the ride.', 'Search for “Booked! You’re off to” in your inbox. If you cannot find the email, check your spam folder.'] },
		[articles[5]]: { paragraphs: ['Sending a direct message on CarPooling is the quickest way to resolve an issue with your carpool booking.', 'Visit our Help Centre to find answers to frequently asked questions, including cancellations and reporting suspicious activity.', 'Need more help? Contact us by email and our support team will get in touch.'], sections: ['Contact your carpool driver or passenger', 'Search our Help Centre', 'Contact CarPooling'] },
		"How do I cancel a passenger's carpool booking?": { paragraphs: ['If a driver cannot fulfil a ride that has already been booked, it is their responsibility to cancel in a timely manner so the passenger can adjust their plans. Before cancelling, let passengers know by message that you cannot travel anymore.'], sections: ["To cancel a passenger’s booking", 'Cancellation penalties'], bullets: ['Go to Your rides.', 'Select the ride you want to cancel.', 'Choose the passenger and then Cancel this booking.', 'Select a reason, add details for the support team, and confirm the cancellation.', 'Passengers will be notified by SMS and email. Drivers who cancel regularly or at the last minute may be suspended from offering rides.'] },
		"What if a passenger cancels before departure or doesn't show up?": { paragraphs: ['If a passenger cancels before the ride, you will be notified immediately by email and SMS. Their seat becomes available again on your ride offer and may be booked by another passenger.', 'If a passenger cancels after departure or does not show up, report that you did not travel together from your dashboard by opening Rides offered, choosing See co-travellers, and confirming the trip did not take place.', 'Passengers receive an automatic negative rating if they cancel at the last minute or do not show up.'], sections: ['How to report a passenger who did not travel'] },
		'Declining a booking request': { paragraphs: ['Decline booking requests before they expire, ideally within three hours, so passengers have enough time to find another ride. Passengers will be notified and their payment method will not be charged.', 'Once a booking request is declined, the passenger cannot send a new request for the same ride.'] },
		'Understanding the driver cancellation rate': { paragraphs: ['Passengers trust drivers to fulfil their bookings. When drivers cancel for preventable reasons, passengers lose confidence in the community, so your publications show how often you cancel.', 'Your rate reflects cancelled bookings, excluding declined requests, over the last 18 months.'], sections: ['How it works', 'If you need to cancel'], bullets: ['Never cancels rides: exceptional commitment to fulfilling booked rides.', 'Rarely cancels rides: almost never cancels and is highly dependable.', 'Sometimes cancels rides: has occasionally cancelled but completes most bookings.', 'Often cancels rides: has cancelled many rides, so passengers may choose other options.', 'Avoid cancellations whenever possible. If one is necessary, tell passengers and cancel as soon as possible. Completing future rides without cancellations helps rebuild trust.'] },
		'Editing a publication': { paragraphs: ['You can update the details of an upcoming ride from Your rides. Select the publication, choose Edit your publication, make the required changes, and save.'] },
		'Editing the price per seat': { paragraphs: ['Open the ride from Your rides and choose Edit your publication. Update the price per seat within the suggested range, then save your changes. Stopover prices can be adjusted separately.'] },
		'Deleting a publication': { paragraphs: ['Open Your rides, select the publication you want to remove, choose the delete or cancel option, and confirm. Let booked passengers know promptly if the change affects their plans.'] },
		'How do I copy a ride I’m making more than once?': { paragraphs: ['For regular journeys, open Your rides and choose the option to copy or repeat a publication. Check the date, time, route, seats, and price before publishing the new ride.'] },
		'Search results': { paragraphs: ['Your ride can appear to passengers searching along your route, including passengers travelling between stopover cities. Adding accurate stopovers and meeting points helps the right passengers find your publication.'] },
		'Where can I find more details about my ride and the passengers who have booked?': { paragraphs: ['Open Your rides and select the publication. The ride details and booked passengers are shown in the ride view, where you can review meeting points and contact co-travellers.'] },
		'Managing Boost requests': { paragraphs: ['Boost requests help connect your ride with passengers travelling along part of your route. Review each proposed meeting point before approving it, because an approved request can add a new stopover to the ride.'] },
		'Responding to booking requests': { paragraphs: ['Review booking requests from Your rides or your Inbox. Accept or decline promptly so passengers know whether they need to make another travel plan.'] },
		'Messaging your passengers': { paragraphs: ['Use the ride conversation or Inbox to share important details with passengers, such as exact meeting points, delays, luggage, or changes to the journey.'] },
		'How to find your pickup and dropoff points': { paragraphs: ['Open the ride itinerary and review the exact meeting points for every stopover. Use a precise address or landmark so passengers can find you easily.'] },
		'Vehicle requirements': { paragraphs: ['Your vehicle must be suitable for a shared journey, have working seat belts, and have enough room for every passenger. Add accurate vehicle details and a visible photo when publishing your ride.'] },
		'How do I know it’s OK to carpool?': { paragraphs: ['Carpooling is based on sharing the costs of a journey you already plan to make. Follow the community standards, drive safely, and only offer seats you can genuinely provide.'] },
		"What should I do if there’s an error with my ride?": { paragraphs: ['Check the route, date, seats, vehicle, and price details, then try saving the publication again. If the error continues, contact support with the ride details and a screenshot of the message.'] },
		"Why can’t I edit my publication after passengers book?": { paragraphs: ['Some publication details cannot be changed after passengers have booked because they affect their travel plans. Review the booked ride and contact support if a necessary correction is unavailable.'] },
		"Why your vehicle’s picture isn’t visible": { paragraphs: ['Vehicle photos may be hidden while they are being reviewed or if they do not meet the image requirements. Add a clear, recent photo of the vehicle and try again.'] },
		'If you cannot approve a booking request via SMS': { paragraphs: ['Open the request from Your rides or the CarPooling app and approve it there. Check that your phone number and communication preferences are correct, then contact support if the request is still unavailable.'] },
		'If you can’t add your vehicle': { paragraphs: ['Check that all required vehicle fields are complete and that the registration and photo details are valid. If you still cannot add it, contact support with the error message.'] },
		'Missed booking requests': { paragraphs: ['Check your Inbox, email, and notifications regularly. Booking requests can expire, so respond promptly and keep your contact details and notification preferences up to date.'] },
		...driverManagementArticleContent,
		...passengerArticleContent,
		...profileAccountArticleContent,
		...trustSafetyArticleContent,
	}
	const article = content[title] || { paragraphs: ['This article is being prepared for your next journey.'] }
	return <section className="help-centre-page help-article-page">
		<div className="help-centre-hero"><div className="help-centre-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong></div><span className="help-language">English (IN)⌄</span><div className="help-centre-search"><h1>How can we help you today?</h1><label><span>⌕</span><input placeholder="Search in the help center" /></label></div></div>
		<div className="help-article-layout"><aside><button className="help-breadcrumb" onClick={onBack}>⌂　›　Getting Started on CarPooling</button>{articles.map((articleTitle) => <button className={articleTitle === title ? 'selected' : ''} key={articleTitle} onClick={() => onSelectArticle(articleTitle)}><span>▤</span>{articleTitle}</button>)}</aside><main><p className="help-breadcrumb mobile-crumb" onClick={onBack}>⌂　›　{title}</p><h2>{title}</h2>{article.heading && <h3>{article.heading}</h3>}{article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{article.sections?.map((section, index) => <section className="help-article-section" key={section}><h3>{section}</h3>{article.bullets && <ul>{article.bullets.slice(index === 0 ? 0 : Math.ceil(article.bullets.length / 2), index === 0 ? Math.ceil(article.bullets.length / 2) : undefined).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{!article.bullets && <p>Follow the steps in your account to continue. You can contact the other member directly when you have an upcoming ride.</p>}</section>)}<div className="help-feedback" role="status"><strong>{feedback ? 'Thanks for your feedback.' : 'Did this article help you?'}</strong>{!feedback && <><button onClick={() => setFeedback('yes')}>👍 Yes</button><button onClick={() => setFeedback('no')}>👎 No</button></>}{feedback && <span>{feedback === 'yes' ? 'Yes' : 'No'} selected</span>}</div></main><aside className="help-summary"><strong>SUMMARY</strong><span>Search for a ride</span><span>Contact a driver</span><span>Book and pay online</span><div><strong>Didn’t find your answer?</strong><p>Let us help you</p><button>Contact us</button></div></aside></div>
		<footer className="help-centre-footer"><span>Website</span><span>About Us</span><span>Cookie Policy</span><p>●　𝕏　◎　▶</p><small>CarPooling, 2026　©</small></footer>
	</section>
}

function ProfileView({ user, profileTab, setProfileTab, profilePage, setProfilePage, onAction, onLogout, onCloseAccount }) {
	const aboutRows = [
		['Verify your Govt. ID', 'Government identity verification'],
		[`Confirm email ${user.email}`, 'Email verification'],
		['Confirm phone number', 'Phone verification'],
	]
	const accountRows = [
		['Ratings', 'Your member ratings'],
		['Saved passengers', 'Passengers saved for future bookings'],
		['Help', 'Open the Help Centre'],
		['Communication preferences', 'Choose which updates you receive'],
		['Password', 'Change your password'],
		['Postal address', 'Manage your address'],
		['Payout methods', 'Manage payout accounts'],
		['Payouts', 'View driver payouts'],
		['Payment methods', 'Manage saved payment methods'],
		['Payments & refunds', 'View payment history and refunds'],
		['Terms and Conditions', 'Read the terms'],
		['Data protection', 'Manage your privacy choices'],
	]

	if (profilePage === 'ratings' || profilePage === 'saved-passengers') return <ProfileEmptyPage page={profilePage} onBack={() => setProfilePage(null)} />
	if (profilePage === 'communication-preferences') return <CommunicationPreferencesView onBack={() => setProfilePage(null)} />
	if (profilePage === 'password') return <PasswordView onBack={() => setProfilePage(null)} />
	if (profilePage === 'postal-address') return <PostalAddressView onBack={() => setProfilePage(null)} />
	if (profilePage === 'payout-methods') return <PayoutMethodsView onBack={() => setProfilePage(null)} />
	if (profilePage === 'payouts') return <PayoutsView onBack={() => setProfilePage(null)} />
	if (profilePage === 'payment-methods') return <PaymentMethodsView onBack={() => setProfilePage(null)} />
	if (profilePage === 'payments-refunds') return <PaymentsRefundsView onBack={() => setProfilePage(null)} />
	if (profilePage === 'terms') return <TermsAndConditionsView onBack={() => setProfilePage(null)} />
	if (profilePage === 'data-protection') return <PrivacyPolicyView onBack={() => setProfilePage(null)} />
	if (profilePage === 'verify-profile') return <VerifyProfileView user={user} onBack={() => setProfilePage(null)} />
	if (profilePage === 'email-verification') return <EmailVerificationView email={user.email} onBack={() => setProfilePage('verify-profile')} />
	if (profilePage === 'phone-verification') return <PhoneVerificationView onBack={() => setProfilePage('verify-profile')} />
	if (profilePage === 'about-you') return <AboutYouView user={user} onBack={() => setProfilePage(null)} />
	if (profilePage === 'mini-bio') return <MiniBioView onBack={() => setProfilePage('about-you')} />
	if (profilePage === 'travel-preferences') return <TravelPreferencesView onBack={() => setProfilePage('about-you')} />
	if (profilePage === 'vehicles') return <VehiclesView onBack={() => setProfilePage(null)} />

	return <section className="profile-page">
		<div className="profile-tabs" role="tablist" aria-label="Profile sections">
			<button className={profileTab === 'about' ? 'active' : ''} onClick={() => setProfileTab('about')} role="tab" aria-selected={profileTab === 'about'}>About you</button>
			<button className={profileTab === 'account' ? 'active' : ''} onClick={() => setProfileTab('account')} role="tab" aria-selected={profileTab === 'account'}>Account</button>
		</div>
		{profileTab === 'about' ? <div className="profile-content">
			<button className="profile-identity" onClick={() => onAction('Personal details editing will be available here.')}><span className="profile-avatar-large">◯</span><span><strong>{user.firstName} {user.lastName}</strong><small>Newcomer</small></span><b>›</b></button>
			<button className="profile-complete" onClick={() => onAction('Add a profile picture to complete your profile.')}><strong>Complete your profile</strong><span>This helps build trust, encouraging members to travel with you.</span><b>0 out of 6 complete</b><em>Add profile picture</em></button>
			<button className="profile-link-row" onClick={() => onAction('Personal details editing will be available here.')}>Edit personal details <b>›</b></button>
			<h2>Your carpooling reliability</h2><p className="profile-reliability">▣　Never cancels bookings as a passenger　ⓘ</p>
			<h2>Verify your profile</h2>
			<div className="profile-list">{aboutRows.map(([label, message]) => <button key={label} onClick={() => setProfilePage(label === 'Verify your Govt. ID' ? 'verify-profile' : label.startsWith('Confirm email') ? 'email-verification' : label === 'Confirm phone number' ? 'phone-verification' : 'about-you')}><span className="profile-plus">+</span>{label}<b>›</b></button>)}</div>
			<h2>About you</h2><div className="profile-list"><button onClick={() => setProfilePage('mini-bio')}><span className="profile-plus">+</span>Add a mini bio<b>›</b></button><button onClick={() => setProfilePage('travel-preferences')}><span className="profile-plus">+</span>Edit travel preferences<b>›</b></button></div>
			<h2>Vehicles</h2><div className="profile-list"><button onClick={() => setProfilePage('vehicles')}><span className="profile-plus">+</span>Add or edit vehicle<b>›</b></button></div>
		</div> : <div className="profile-content account-content">
			<div className="profile-list">{accountRows.map(([label, message]) => <button key={label} onClick={() => label === 'Ratings' ? setProfilePage('ratings') : label === 'Saved passengers' ? setProfilePage('saved-passengers') : label === 'Communication preferences' ? setProfilePage('communication-preferences') : label === 'Password' ? setProfilePage('password') : label === 'Postal address' ? setProfilePage('postal-address') : label === 'Payout methods' ? setProfilePage('payout-methods') : label === 'Payouts' ? setProfilePage('payouts') : label === 'Payment methods' ? setProfilePage('payment-methods') : label === 'Payments & refunds' ? setProfilePage('payments-refunds') : label === 'Terms and Conditions' ? setProfilePage('terms') : label === 'Data protection' ? setProfilePage('data-protection') : onAction(`${message} will be available here.`)}>{label}<b>›</b></button>)}</div>
			<div className="profile-list profile-danger-list"><button onClick={onLogout}>Log out</button><button onClick={onCloseAccount}>Close my account<b>›</b></button></div>
		</div>}
	</section>
}

function VerifyProfileView({ user, onBack }) {
	const [verified, setVerified] = useState(() => localStorage.getItem('carpooling_profile_verified') === 'true')
	const [notice, setNotice] = useState('')
	const verify = () => { localStorage.setItem('carpooling_profile_verified', 'true'); setVerified(true); setNotice('Verification request submitted. We will email you when it is reviewed.') }
	return <section className="profile-tool-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Verify your profile</h1><p>{verified ? 'Your profile verification is complete.' : 'Verified members get faster approvals on their requests. It only takes a minute.'}</p><div className="verification-art">✓</div><div className="profile-tool-list"><div><strong>Government ID</strong><span>{verified ? 'Verified' : 'Not verified'}</span></div><div><strong>Email</strong><span>{user.email}</span></div><div><strong>Phone number</strong><span>{user.phone || 'Add a phone number'}</span></div></div>{!verified && <button className="profile-tool-primary" onClick={verify}>Verify your ID</button>}{notice && <p className="profile-tool-success" role="status">{notice}</p>}</section>
}

function EmailVerificationView({ email, onBack }) {
	return <section className="email-verification-page"><div className="email-verification-art" aria-hidden="true">✓</div><h1>We’ve sent a verification link to<br />your email address. Please check<br />your inbox.</h1><button onClick={onBack}>Got it</button><small>{email}</small></section>
}

function PhoneVerificationView({ onBack }) {
	const [phone, setPhone] = useState('')
	const [marketing, setMarketing] = useState(false)
	const [saved, setSaved] = useState(() => localStorage.getItem('carpooling_phone') || '')
	const submit = (event) => { event.preventDefault(); if (phone.replace(/\D/g, '').length >= 10) { localStorage.setItem('carpooling_phone', phone); setSaved(phone) } }
	if (saved) return <section className="phone-verification-page"><div className="email-verification-art" aria-hidden="true">✓</div><h1>We’ve sent a verification code<br />to your mobile number.</h1><p>Enter the 4-digit code sent to {saved}.</p><button onClick={onBack}>I’ll do it later</button></section>
	return <section className="phone-verification-page"><h1>Please verify your mobile number</h1><form onSubmit={submit}><label className="phone-country-field"><span>India (भारत) +91</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile phone" inputMode="tel" required /></label><label className="phone-marketing"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>I don't want to receive commercial offers or recommendations from BlaBlaCar by messages or phone calls.</span></label><p>You can change your preferences at any time from your profile.</p><button className="phone-later" type="button" onClick={onBack}>I’ll do it later <b>›</b></button><button className="phone-submit" type="submit">Continue</button></form></section>
}

function AboutYouView({ user, onBack }) {
	const [bio, setBio] = useState(() => localStorage.getItem('carpooling_bio') || '')
	const [preferences, setPreferences] = useState(() => JSON.parse(localStorage.getItem('carpooling_preferences') || '{"chat":"I’m chatty when I feel comfortable","music":"I’ll jam depending on the mood","smoking":"Cigarette breaks outside the car are ok","pets":"I’ll travel with pets depending on the animal"}'))
	const [saved, setSaved] = useState(false)
	const save = (event) => { event.preventDefault(); localStorage.setItem('carpooling_bio', bio); localStorage.setItem('carpooling_preferences', JSON.stringify(preferences)); setSaved(true) }
	return <section className="profile-tool-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>About you</h1><form className="about-you-form" onSubmit={save}><label><span>Personal details</span><input value={`${user.firstName} ${user.lastName}`} readOnly /></label><label><span>Mini bio</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What would you like other members to know about you?" rows="4" /></label><h2>Travel preferences</h2>{Object.entries(preferences).map(([key, value]) => <label key={key}><span>{key[0].toUpperCase() + key.slice(1)}</span><input value={value} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<button className="profile-tool-primary" type="submit">Save changes</button>{saved && <p className="profile-tool-success" role="status">Your profile has been updated.</p>}</form></section>
}

function MiniBioView({ onBack }) {
	const [bio, setBio] = useState(() => localStorage.getItem('carpooling_bio') || '')
	const saveBio = (event) => { event.preventDefault(); localStorage.setItem('carpooling_bio', bio.trim()); onBack() }
	return <section className="mini-bio-page"><button className="mini-bio-close" onClick={onBack} aria-label="Close">×</button><h1>What would you like other<br />members to know about you?</h1><form onSubmit={saveBio}><textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder={'Example: "I\'m a student at Delhi University, and I often visit friends in Jaipur. I love photography and rock music."'} rows="4" autoFocus /><button type="submit">Save</button></form></section>
}

function TravelPreferencesView({ onBack }) {
	const defaultPreferences = { Chattiness: 'I’m chatty when I feel comfortable', Music: 'I’ll jam depending on the mood', Smoking: 'Cigarette breaks outside the car are ok', Pets: 'I’ll travel with pets depending on the animal' }
	const [preferences, setPreferences] = useState(() => JSON.parse(localStorage.getItem('carpooling_preferences') || JSON.stringify(defaultPreferences)))
	const [saved, setSaved] = useState(false)
	const save = (event) => { event.preventDefault(); localStorage.setItem('carpooling_preferences', JSON.stringify(preferences)); setSaved(true) }
	return <section className="travel-preferences-page"><button className="mini-bio-close" onClick={onBack} aria-label="Close">×</button><h1>Travel preferences</h1><form onSubmit={save}>{Object.entries(preferences).map(([label, value]) => <label key={label}><span>{label}</span><select value={value} onChange={(event) => setPreferences((current) => ({ ...current, [label]: event.target.value }))}>{(label === 'Chattiness' ? ['I’m chatty when I feel comfortable', 'I prefer quiet rides'] : label === 'Music' ? ['I’ll jam depending on the mood', 'I prefer no music'] : label === 'Smoking' ? ['Cigarette breaks outside the car are ok', 'No smoking breaks'] : ['I’ll travel with pets depending on the animal', 'I prefer not to travel with pets']).map((option) => <option key={option}>{option}</option>)}</select></label>)}<button className="travel-save" type="submit">Save changes</button>{saved && <p className="profile-tool-success" role="status">Travel preferences updated.</p>}</form></section>
}

function VehiclesView({ onBack }) {
	const [vehicle, setVehicle] = useState(() => JSON.parse(localStorage.getItem('carpooling_vehicle') || 'null'))
	const [draft, setDraft] = useState(vehicle || { make: '', model: '', type: '' })
	const save = (event) => { event.preventDefault(); if (!draft.make.trim() || !draft.model.trim()) return; localStorage.setItem('carpooling_vehicle', JSON.stringify(draft)); setVehicle(draft) }
	return <section className="profile-tool-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Vehicles</h1>{vehicle && <div className="vehicle-saved"><strong>{vehicle.make} {vehicle.model}</strong><span>{vehicle.type || 'Personal car'}</span><button onClick={() => setVehicle(null)}>Remove vehicle</button></div>}<form className="about-you-form" onSubmit={save}><h2>{vehicle ? 'Edit your vehicle' : 'Add a vehicle'}</h2><label><span>Make</span><input value={draft.make} onChange={(event) => setDraft((current) => ({ ...current, make: event.target.value }))} placeholder="Honda, Hyundai, Maruti..." required /></label><label><span>Model</span><input value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} placeholder="Vehicle model" required /></label><label><span>Vehicle type</span><input value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Car" /></label><button className="profile-tool-primary" type="submit">Save vehicle</button></form><p className="profile-tool-note">Your vehicle make and model are shown to passengers. Your licence plate is kept private. Minivans are not allowed.</p></section>
}

const communicationChannels = [
	{ key: 'push', title: 'Push notifications', description: 'Get important information about your bookings, cancellations, and payments' },
	{ key: 'emails', title: 'Emails', description: 'Stay informed about your rides, account, and BlaBlaCar updates' },
	{ key: 'text', title: 'Text messages', description: 'Get important alerts about your account and booking activity, feature updates, and special offers' },
	{ key: 'calls', title: 'Phone calls', description: 'Get important alerts about your account and booking activity, feature updates, and special offers' },
]

function CommunicationPreferencesView({ onBack }) {
	const [channel, setChannel] = useState(null)
	const [phone, setPhone] = useState('')
	const [savedPhone, setSavedPhone] = useState('')
	const [preferences, setPreferences] = useState({
		push: { account: true, messages: true, marketing: true },
		emails: { messages: true, updates: true, surveys: true, marketing: true, ads: false },
	})

	const togglePreference = (group, key) => setPreferences((current) => ({ ...current, [group]: { ...current[group], [key]: !current[group][key] } }))
	const savePhone = (event) => {
		event.preventDefault()
		if (phone.trim()) setSavedPhone(phone.trim())
	}
	if (channel === 'text' || channel === 'calls') {
		const title = channel === 'text' ? 'Text messages' : 'Phone calls'
		return <section className="communication-page"><button className="communication-back" onClick={() => setChannel(null)} aria-label="Back">←</button><h1>{title}</h1>{savedPhone ? <div className="communication-saved"><strong>{savedPhone}</strong><button onClick={() => setSavedPhone('')}>Change phone number</button></div> : <><p>Add your phone number to get important alerts about your account and booking activity, feature updates, and special offers. You can adjust how and what you receive at any time through your communication preferences.</p><form className="communication-phone-form" onSubmit={savePhone}><label><span>India (+91)</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile phone" inputMode="tel" required /></label><button type="submit">Save phone number</button></form><button className="communication-later" onClick={() => setChannel(null)}>I’ll do it later <b>›</b></button></>}</section>
	}
	if (channel === 'push' || channel === 'emails') {
		const items = channel === 'push' ? [['account', 'Your account and booking activity', 'Get important information about your bookings, cancellations, and payments'], ['messages', 'Messages from members', 'Get notified when members message you about your upcoming carpool ride'], ['marketing', 'Marketing and promotions', 'Discover special offers and personalised recommendations from CarPooling']] : [['messages', 'Messages from members', 'Get notified when members message you about your upcoming carpool ride'], ['updates', 'CarPooling updates', 'Stay informed on the latest features and get tips on using CarPooling'], ['surveys', 'Surveys', 'Participate in research studies from CarPooling'], ['marketing', 'Marketing and promotions', 'Discover special offers and personalised recommendations from CarPooling'], ['ads', 'Third-party ads', 'Get special offers from CarPooling partners']]
		return <section className="communication-page"><button className="communication-back" onClick={() => setChannel(null)} aria-label="Back">←</button><h1>{channel === 'push' ? 'Push notifications' : 'Emails'}</h1>{channel === 'emails' && <p className="communication-email">Email notifications are sent to your verified account email.</p>}<div className="communication-options">{items.map(([key, title, description]) => <label className="communication-option" key={key}><input type="checkbox" checked={preferences[channel][key]} onChange={() => togglePreference(channel, key)} /><span><strong>{title}</strong><small>{description}</small></span></label>)}</div></section>
	}
	return <section className="communication-page"><h1>Communication preferences</h1><div className="communication-channel-list">{communicationChannels.map(({ key, title }) => <button key={key} onClick={() => setChannel(key)}>{title}<b>›</b></button>)}</div></section>
}

function PasswordView({ onBack }) {
	const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' })
	const [status, setStatus] = useState({ type: '', message: '' })
	const [saving, setSaving] = useState(false)
	const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
	const submit = async (event) => {
		event.preventDefault()
		if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) return setStatus({ type: 'error', message: 'Your new password must contain at least 8 characters, a letter, a number, and a special character.' })
		if (form.password !== form.confirmPassword) return setStatus({ type: 'error', message: 'Your new passwords do not match.' })
		setSaving(true)
		setStatus({ type: '', message: '' })
		try {
			const response = await changeUserPassword({ currentPassword: form.currentPassword, password: form.password })
			setForm({ currentPassword: '', password: '', confirmPassword: '' })
			setStatus({ type: 'success', message: response.data.message || 'Your password has been updated successfully.' })
		} catch (error) {
			setStatus({ type: 'error', message: error.response?.data?.message || 'Unable to update your password.' })
		} finally {
			setSaving(false)
		}
	}
	return <section className="password-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Change password</h1><p>It must have at least 8 characters, 1 letter, 1 number and 1 special character.</p><form className="password-form" onSubmit={submit}><input type="password" value={form.currentPassword} onChange={(event) => updateField('currentPassword', event.target.value)} placeholder="Current password" required /><input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="New password" required /><input type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Confirm new password" required /><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save new password'}</button></form>{status.message && <p className={`password-status ${status.type}`} role="status">{status.message}</p>}</section>
}

function PostalAddressView({ onBack }) {
	const [address, setAddress] = useState(() => localStorage.getItem('carpooling_postal_address') || '')
	const [draft, setDraft] = useState(address)
	const [editing, setEditing] = useState(false)
	const saveAddress = (event) => {
		event.preventDefault()
		const nextAddress = draft.trim()
		if (!nextAddress) return
		localStorage.setItem('carpooling_postal_address', nextAddress)
		setAddress(nextAddress)
		setEditing(false)
	}
	if (editing || !address) return <section className="postal-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>What’s your address?</h1><form className="postal-form" onSubmit={saveAddress}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Full address" autoFocus required /><button type="submit">Save address</button></form></section>
	return <section className="postal-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Postal address</h1><div className="postal-saved"><strong>{address}</strong><button onClick={() => setEditing(true)}>Edit address</button><button className="postal-remove" onClick={() => { localStorage.removeItem('carpooling_postal_address'); setAddress(''); setDraft('') }}>Remove address</button></div><p>We promise we’ll only use it to send you gifts and deals from us or our partners.</p></section>
}

function PayoutMethodsView({ onBack }) {
	const [method, setMethod] = useState(() => localStorage.getItem('carpooling_payout_method') || '')
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(method)
	const saveMethod = (event) => {
		event.preventDefault()
		if (!draft.trim()) return
		localStorage.setItem('carpooling_payout_method', draft.trim())
		setMethod(draft.trim())
		setEditing(false)
	}
	if (!method || editing) return <section className="account-resource-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>{method ? 'Edit payout method' : 'Payout methods'}</h1><p>Add a bank account or payout detail to receive money from completed rides.</p><form className="resource-form" onSubmit={saveMethod}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Bank account or UPI details" required /><button type="submit">Save payout method</button></form></section>
	return <section className="account-resource-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Payout methods</h1><div className="resource-saved"><strong>{method}</strong><button onClick={() => setEditing(true)}>Edit payout method</button><button className="resource-danger" onClick={() => { localStorage.removeItem('carpooling_payout_method'); setMethod(''); setDraft('') }}>Remove payout method</button></div></section>
}

function PayoutsView({ onBack }) {
	return <section className="account-empty-resource"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><div className="empty-search-art" aria-hidden="true"><div className="empty-search-ring" /><div className="empty-search-handle" /><i /><b /></div><h1>Your payouts will appear here.</h1><p>You don't have any payouts yet. Complete a ride as a driver with a passenger first.</p></section>
}

function PaymentMethodsView({ onBack }) {
	return <section className="account-resource-page"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><h1>Payment methods</h1><p>The payment methods you saved when booking a ride will appear here.</p></section>
}

function PaymentsRefundsView({ onBack }) {
	return <section className="account-empty-resource"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><div className="empty-search-art" aria-hidden="true"><div className="empty-search-ring" /><div className="empty-search-handle" /><i /><b /></div><h1>Looks like you haven't made any online payments in the last 2 years.</h1></section>
}

const termsSections = [
	['1. Purpose', 'BlaBlaCar operates a global travel platform for carpooling and, where available, bus and train bookings. The Platform connects drivers and passengers but BlaBlaCar is not a party to agreements between Members or with transport operators. By creating an account or confirming a booking, you acknowledge that you have read and accepted these Terms, the Privacy Policy, and applicable local law.'],
	['2. Definitions', 'Advert, Booking, Driver, Passenger, Member, Trip, Carpooling Trip, Cost Contribution, Seat, Services, Platform, Bus Operator, Rail Operator, Customer, Price, and User Account have the meanings given to them in these Terms.'],
	['3. Registration and account creation', 'Use of the Platform is reserved for people aged 18 or over. You must provide accurate information, keep it updated, protect your password, and maintain only one account. Accounts may be created by completing the registration form or using Facebook or Apple where available. BlaBlaCar may verify phone numbers and identity information.'],
	['4. Use of the Services', 'Drivers may publish trips they genuinely plan to make. Passengers may search and request seats through the Platform. Booking may be automatic or require driver approval. A request expires if the driver does not respond within the displayed timeframe. Bookings are nominative, although a Member may book for another person where the required details and authorisation are provided.'],
	['5. Financial conditions', 'Access, registration, and searching are free. A Driver’s Cost Contribution must only cover the genuine costs of the trip and must not create a profit. Service fees, subscriptions, online payments, and transport ticket prices apply only where shown on the relevant Platform and booking flow.'],
	['6. Non-commercial use', 'Drivers must use the Platform on a non-professional and non-commercial basis. Professional, taxi, VTC, or service vehicles and trips intended to generate profit are not permitted. BlaBlaCar may request vehicle or authorisation documents and may suspend accounts that appear to generate a benefit.'],
	['7. Cancellation policy', 'Cancellation and refund rules vary by country, payment method, and transport type. Driver cancellations may result in passenger refunds. Passenger refunds depend on when the cancellation occurs, and a passenger who does not show up after the permitted waiting period may receive no refund. Bus and train cancellations follow the relevant operator’s terms.'],
	['8. Behaviour and commitments', 'All users must provide truthful information, respect other Members, keep communications related to the trip, avoid harassment, discrimination, illegal content, weapons, drugs, and attempts to bypass the Platform. Drivers must hold a valid licence, insurance, registration, inspection, and a safe vehicle. Passengers must be punctual, respectful, reachable, and pay the agreed Cost Contribution.'],
	['9. Restrictions and account suspension', 'BlaBlaCar may remove content, limit access, suspend an account, or terminate the Terms for breaches, serious safety concerns, fraud prevention, repeated poor ratings, or activity that undermines the Platform. Members may close their account at any time through their Profile.'],
	['10. Personal data', 'Personal data is collected and processed as described in the Privacy Policy. Members should keep their information accurate and use the available privacy and communication controls.'],
	['11. Intellectual property', 'BlaBlaCar owns the Platform, software, databases, branding, and its published content. Members receive a personal, non-exclusive, non-transferable licence to use the Platform for private, non-commercial purposes. Members remain responsible for content they publish while granting BlaBlaCar the licence needed to operate the Services.'],
	['12. Role of BlaBlaCar', 'BlaBlaCar provides an online matching platform and does not own, operate, or supervise vehicles or trips. Members and transport operators are responsible for their own agreements, information, conduct, and performance.'],
	['13. Availability and functionality', 'BlaBlaCar aims to keep the Platform available but may suspend access for maintenance, updates, migration, technical failures, testing, or changes to features and Services.'],
	['14. Changes to these Terms', 'BlaBlaCar may update these Terms to reflect legal, technical, and commercial changes. Updated Terms are published with an effective date and, where required, communicated before they apply.'],
	['15. Law and disputes', 'Subject to mandatory consumer protections, the Terms are governed by the applicable local law described on the Platform. BlaBlaCar and users should first try to resolve disagreements amicably. Members may use the internal complaints process and any available out-of-court dispute resolution. For India, trip claims are subject to the applicable notice period and BlaBlaCar liability limits shown on the Indian Platform.'],
	['16. Help Centre and Contact Form', 'Help Centre: support.blablacar.com/en-in. Contact Form: support.blablacar.com/en-in/contact. Members should use these channels for support, reports, complaints, and data requests.'],
	['17. Legal notices', 'The Platform is published by the relevant BlaBlaCar entity for the country in which the service is offered. Legal entity, contact, hosting, and insurance information may vary by country and is displayed in the applicable local Terms.'],
	['18. European digital services regulation', 'Where applicable in the European Union, BlaBlaCar publishes information about active recipients, authority contact points, content moderation, and account or content decisions in accordance with the Digital Services Regulation.'],
	['19. Energy and carbon programmes', 'Where offered, regional carbon credits, energy certificates, or carpooling rewards are subject to the local programme rules, eligibility checks, verification, validity periods, and any applicable privacy or payment requirements.'],
]

function TermsAndConditionsView({ onBack }) {
	const jumpToSection = (event, sectionId) => {
		event.preventDefault()
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}
	return <section className="terms-page"><div className="terms-topbar"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><div><p className="eyebrow">LEGAL DOCUMENT</p><h1>Terms and Conditions</h1><p>Version applicable from June 15, 2026</p></div></div><div className="terms-layout"><nav className="terms-contents" aria-label="Terms contents"><strong>Contents</strong>{termsSections.map(([heading], index) => <a href={`#terms-${index + 1}`} key={heading} onClick={(event) => jumpToSection(event, `terms-${index + 1}`)}>{heading}</a>)}</nav><article className="terms-article"><p className="terms-intro">These Terms and Conditions govern access to and use of the BlaBlaCar Platform and Services. Please read them carefully before creating an account, publishing a ride, or booking a seat.</p>{termsSections.map(([heading, text], index) => <section id={`terms-${index + 1}`} key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<div className="terms-contact"><strong>Need help?</strong><p>Visit the Help Centre or Contact Form for questions, reports, and complaints.</p></div></article></div></section>
}

const privacySections = [
	['1. General', 'BlaBlaCar, whose registered office is at 84 avenue de la République, 75011 Paris, France, attaches great importance to privacy. This Privacy Policy explains how we process personal data collected through our website and mobile applications when you publish, search, compare, book, or purchase transport services. The applicable data controller may vary by country and service.'],
	['2. Information we collect', 'We collect information you provide directly, including your name, email, date of birth, password, phone number, profile photo, trip preferences, postal address, ratings, reviews, messages, reservations, publications, payment and banking details, support requests, location data, identity documents, insurance information, and energy-certificate data where applicable. We may also receive information from Facebook or Apple, devices, cookies, analytics tools, insurers, operators, and third-party platforms.'],
	['2.3. Retention of your data', 'Account data is generally archived five years after last use if the account remains open, or thirty days after account closure unless a negative review or report requires longer retention. Financial records may be kept for legal periods, content may be anonymised, logging data may be retained up to twelve months, calls up to one month, identity checks thirty days, and suspended-account data two or ten years depending on the breach. Data may remain archived for up to five years to manage legal disputes.'],
	['3. How we use your data', 'We use data to create and manage accounts, provide bookings and publications, process payments and payouts, personalise profiles, enable member communication and location features, support customers, prevent fraud, verify identity, send service and marketing communications, improve and secure the Platform, conduct research, respond to legal requests, defend rights, and prepare Energy Savings Certificate applications where applicable. Legal bases include contract performance, consent, legitimate interests, and legal obligations.'],
	['4. Who receives your data', 'Some profile and booking information is visible to Members and shared with travelling co-members. Bus and rail operators receive information needed to provide transport. Data may also be shared with BlaBlaCar group entities, authorities, courts, insurers, payment providers, identity-verification services, analytics providers, customer-service providers, social platforms, Google Maps, and other processors or partners when required to provide or improve the Services, comply with law, or when you request it.'],
	['5. Energy Savings Certificates', 'In eligible countries, data such as identity, vehicle, journey, location, payment, and declared pickup and drop-off information may be processed and shared with authorised partners to verify eligibility, prevent fraud, and create Energy Savings Certificate files.'],
	['6. Message and content moderation', 'Messages may be analysed by automated systems to prevent fraud, protect the community, support Members, enforce the Terms, and prevent attempts to bypass the booking system. Profile photos, biographies, comments, and other content may also be moderated. Account restrictions are reviewed by a person and are not based solely on automated systems.'],
	['7. Targeted advertising', 'We may use profile and browsing data for targeted advertising on social networks or third-party sites where permitted by law. You can object through your account preferences, the relevant social-network settings, cookie controls, or by contacting Customer Service.'],
	['8. International transfers', 'Personal data is generally stored in the European Union. If service providers are located elsewhere, transfers are made under applicable law and safeguards such as European Commission standard contractual clauses. Contact the Data Protection Officer for more information.'],
	['9. Your rights', 'You may request access, portability, rectification, erasure, restriction, or objection to processing, withdraw consent, object to direct marketing, and complain to a supervisory authority. You may also request human intervention and contest certain automated decisions. Contact dataprotection@blablacar.com to exercise your rights.'],
	['10. Cookies', 'Cookies and similar technologies support essential features, analytics, personalisation, advertising, and security. See the Cookie Policy and manage preferences through the available cookie settings.'],
	['11. Permissions', 'The application may request location, photo library, camera, and calendar permissions to search or publish trips, estimate arrival, track a driver before pickup, upload a profile photo, verify identity, and add bookings to a calendar. You can change permissions in your device settings.'],
	['12. Password confidentiality', 'You are responsible for keeping your password secret and must not share it with anyone.'],
	['13. Third-party links and social networks', 'The Platform may link to partner and third-party websites with their own privacy policies. Review those policies before providing personal data; BlaBlaCar is not responsible for their processing.'],
	['14. Changes to this Privacy Policy', 'We review and update this Privacy Policy from time to time. When necessary, we will inform you or seek consent. Check this page regularly for updates.'],
	['15. Contact', 'For privacy questions or data requests, contact the Data Protection Officer at dataprotection@blablacar.com or write to BlaBlaCar at 84 avenue de la République, 75011 Paris, France.'],
]

function PrivacyPolicyView({ onBack }) {
	const jumpToSection = (event, sectionId) => { event.preventDefault(); document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
	return <section className="terms-page privacy-page"><div className="terms-topbar"><button className="communication-back" onClick={onBack} aria-label="Back">←</button><div><p className="eyebrow">DATA PROTECTION</p><h1>Privacy Policy</h1><p>Version applicable as of 30 May 2026</p></div></div><div className="terms-layout"><nav className="terms-contents" aria-label="Privacy contents"><strong>Contents</strong>{privacySections.map(([heading], index) => <a href={`#privacy-${index + 1}`} key={heading} onClick={(event) => jumpToSection(event, `privacy-${index + 1}`)}>{heading}</a>)}</nav><article className="terms-article"><p className="terms-intro">This Privacy Policy explains how BlaBlaCar processes personal data collected and provided through the Platform, together with your rights and available privacy controls.</p>{privacySections.map(([heading, text], index) => <section id={`privacy-${index + 1}`} key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<div className="terms-contact"><strong>Data Protection Officer</strong><p>For requests or questions, contact dataprotection@blablacar.com.</p></div></article></div></section>
}

function ProfileEmptyPage({ page, onBack }) {
	const isRatings = page === 'ratings'
	const [ratingTab, setRatingTab] = useState('received')
	const title = isRatings ? 'Ratings' : 'Saved passengers'
	const message = isRatings ? (ratingTab === 'received' ? 'You haven’t received any ratings yet.' : 'You haven’t given any ratings yet.') : 'No saved passengers yet.'
	return <section className={`profile-page profile-empty-page ${isRatings ? 'ratings-page' : 'saved-passengers-page'}`}>
		<div className="profile-empty-content">
			{!isRatings && <button className="profile-back-button" onClick={onBack} aria-label="Back">←</button>}
			<h1>{title}</h1>
			{isRatings && <div className="ratings-tabs" role="tablist"><button className={ratingTab === 'received' ? 'active' : ''} onClick={() => setRatingTab('received')}>Received</button><button className={ratingTab === 'given' ? 'active' : ''} onClick={() => setRatingTab('given')}>Given</button></div>}
			<div className="empty-search-art" aria-hidden="true"><div className="empty-search-ring" /><div className="empty-search-handle" /><i /><b /></div>
			<h2>{message}</h2>
			{!isRatings && <p>Save frequent travellers when booking a ride to speed things up next time.</p>}
		</div>
	</section>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
