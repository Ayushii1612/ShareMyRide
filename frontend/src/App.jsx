import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { logout } from './features/auth/authSlice.js'

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

function HomePage() {
	const dispatch = useDispatch()
	const user = useSelector((state) => state.auth.user)
	const [from, setFrom] = useState('')
	const [to, setTo] = useState('')
	const [date, setDate] = useState('')
	const [passengers, setPassengers] = useState(1)
	const [notice, setNotice] = useState('')
	const [showOffer, setShowOffer] = useState(false)
	const [showAccount, setShowAccount] = useState(false)

	const submitSearch = (event) => {
		event.preventDefault()
		if (!from || !to) {
			setNotice('Choose a departure and destination to find a ride.')
			return
		}
		setNotice(`Searching rides from ${from} to ${to}${date ? ` on ${date}` : ''} for ${passengers} passenger${passengers > 1 ? 's' : ''}.`)
	}

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
					<button onClick={() => jumpTo('help')}>Help Centre</button>
					<button className="nav-offer" onClick={() => setShowOffer(true)}>Offer a ride <span>↗</span></button>
						<div className="account-menu-wrap">
							<button className="avatar" onClick={() => setShowAccount((visible) => !visible)} aria-label="Open account menu" aria-expanded={showAccount}>◉</button>
							{showAccount && <div className="account-menu">
								{user ? <>
									<p>Hi, {user.firstName}</p>
									<button onClick={() => { setShowAccount(false); setNotice('Your rides will appear here once you book or publish a ride.') }}>♧ <span>Your rides</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setNotice('Your inbox will appear here when you start a conversation.') }}>◌ <span>Inbox</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setNotice('Profile settings will be available here.') }}>◎ <span>Profile</span><b>›</b></button>
									<button onClick={() => { setShowAccount(false); setNotice('Payment history will appear here.') }}>▣ <span>Payments &amp; refunds</span><b>›</b></button>
									<button className="account-logout" onClick={() => { dispatch(logout()); setShowAccount(false); setNotice('You have been logged out.') }}>⊗ <span>Log out</span><b>›</b></button>
								</> : <>
									<p>Welcome to CarPooling</p>
									<a href="/login" onClick={() => setShowAccount(false)}>Log in <span>›</span></a>
									<a href="/register" onClick={() => setShowAccount(false)}>Sign up <span>›</span></a>
								</>}
							</div>}
						</div>
				</nav>
			</header>

			<main>
				<section className="hero-section">
					<div className="hero-copy">
						<p className="eyebrow">THE ROAD IS BETTER TOGETHER</p>
						<h1>Go farther.<br /><em>Share the ride.</em></h1>
						<p className="hero-text">Find friendly rides going your way, or turn your empty seats into shared travel costs.</p>
					</div>
					<div className="hero-image image-one" role="img" aria-label="Friends enjoying a road trip" />
					<form className="search-panel" onSubmit={submitSearch}>
						<label><span>From</span><input value={from} onChange={(event) => setFrom(event.target.value)} placeholder="City or place" /></label>
						<span className="swap">↔</span>
						<label><span>To</span><input value={to} onChange={(event) => setTo(event.target.value)} placeholder="City or place" /></label>
						<label className="date-field"><span>Departure</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
						<label className="passenger-field"><span>Passengers</span><select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))}><option value={1}>1 passenger</option><option value={2}>2 passengers</option><option value={3}>3 passengers</option><option value={4}>4 passengers</option></select></label>
						<button className="search-button" type="submit">Search <span>→</span></button>
					</form>
					{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
				</section>

				<section className="benefits" id="why">
					<article><span className="benefit-icon">↗</span><h2>Travel everywhere</h2><p>Explore cities and quiet corners with rides going your way.</p></article>
					<article><span className="benefit-icon">₹</span><h2>Prices like nowhere</h2><p>Share the cost of your journey and keep more for the destination.</p></article>
					<article><span className="benefit-icon">✓</span><h2>Ride with confidence</h2><p>Verified profiles and reviews help you choose your next travel companion.</p></article>
				</section>

				<section className="routes-band">
					<div className="section-heading light"><p className="eyebrow">FIND YOUR NEXT JOURNEY</p><h2>Top carpool routes</h2></div>
					<div className="route-grid">{popularRoutes.map(([origin, destination]) => <button className="route-card" key={origin} onClick={() => { setFrom(origin); setTo(destination); jumpTo('search') }}><span>{origin} <b>→</b> {destination}</span><strong>↗</strong></button>)}</div>
					<button className="light-button" onClick={() => jumpTo('search')}>Explore all routes <span>→</span></button>
				</section>

				<section className="story-section" id="search">
					<div className="story-image image-two" role="img" aria-label="Driver in a car" />
					<div className="story-copy"><p className="eyebrow">NEVER MISS A CARPOOL</p><h2>Your next seat is closer than you think.</h2><p>Set your route once and discover a growing network of people heading in the same direction. Simple plans, shared costs, better journeys.</p><button className="primary-button" onClick={() => jumpTo('search')}>Find a ride <span>→</span></button></div>
				</section>

				<section className="share-banner"><p className="eyebrow">FOR DRIVERS WITH ROOM TO SPARE</p><h2>Share your ride.<br />Cut your costs.</h2><p>Turn your empty seats into lower travel costs. Publish your route and meet people on the way.</p><button className="light-button" onClick={() => setShowOffer(true)}>Offer a ride <span>→</span></button></section>

				<section className="story-section reverse"><div className="story-image image-three" role="img" aria-label="Happy driver at a fuel station" /><div className="story-copy"><p className="eyebrow">THE CARPOOLING DIFFERENCE</p><h2>More than a ride. A better way to move.</h2><p>Every shared trip means one less car on the road, a lighter cost for everyone, and a little more connection between the places we call home.</p></div></section>

				<section className="quote-section"><div><p className="eyebrow">REAL PEOPLE. REAL JOURNEYS.</p><h2>“Carpooling makes the long way feel like the right way.”</h2><p className="quote-author">Aarav, from Pune</p></div><div className="quote-image image-four" role="img" aria-label="Passenger smiling in a car" /></section>

				<section className="help-section" id="help"><div className="section-heading"><p className="eyebrow">A LITTLE HELP ALONG THE WAY</p><h2>Carpool Help Centre</h2></div><div className="faq-grid">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div><button className="primary-button" onClick={() => setNotice('Help Centre articles are being prepared for your first trip.')}>Read our Help Centre <span>→</span></button></section>

				<section className="app-banner"><div><p className="eyebrow">YOUR JOURNEYS, IN YOUR POCKET</p><h2>Enjoy a better travel experience with the CarPooling app.</h2><p>Keep your rides, messages, and tickets together wherever you go.</p><div className="store-buttons"><button> <span>Download on the<br /><b>App Store</b></span></button><button>▶ <span>GET IT ON<br /><b>Google Play</b></span></button></div></div><div className="phone-mockup"><div className="phone-screen"><span>Upcoming ride</span><strong>Pune → Mumbai</strong><small>Tomorrow · 08:30</small><div className="ticket-line" /><span>Seat confirmed</span></div></div></section>
			</main>

			<footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><i /> <b /></span><strong>CarPooling</strong><p>Travel together. Spend smarter.</p></div><div><h3>Travel with carpool</h3><button onClick={() => { setFrom('Mumbai'); setTo('Pune'); jumpTo('search') }}>Mumbai → Pune</button><button onClick={() => { setFrom('Bengaluru'); setTo('Chittoor'); jumpTo('search') }}>Bengaluru → Chittoor</button><button onClick={() => jumpTo('search')}>Popular carpool rides</button></div><div><h3>Find out more</h3><button onClick={() => jumpTo('why')}>How it works</button><button onClick={() => jumpTo('help')}>Help Centre</button><button onClick={() => setNotice('Contact support at hello@carpooling.app')}>Contact us</button></div><div><h3>Follow the journey</h3><p className="socials">◎　𝕏　▶　◎</p></div><div className="footer-bottom"><span>Terms and Conditions</span><span>© 2026 CarPooling</span></div></footer>

			{showOffer && <div className="modal-backdrop" onClick={() => setShowOffer(false)}><div className="offer-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowOffer(false)} aria-label="Close">×</button><p className="eyebrow">SHARE YOUR EMPTY SEATS</p><h2>Ready to offer a ride?</h2><p>Sign in to publish your route, set a price per seat, and meet your passengers.</p><button className="primary-button" onClick={() => { setShowOffer(false); setNotice('The ride publishing form will open after sign in.') }}>Continue <span>→</span></button></div></div>}
		</div>
	)
}

function App() { return <BrowserRouter><Routes><Route path="/" element={<HomePage />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /></Routes></BrowserRouter> }

export default App
