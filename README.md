# CarPooling

A full-stack ride-sharing and carpool platform inspired by Uber/Ola-style trip matching. The application allows passengers to search for rides using precise pickup and drop-off locations, while drivers can publish planned routes, set seat availability, and price per seat. The platform includes authentication, profile/account management, help center content, route matching, and a scalable Node.js + React architecture.

## Project Overview

CarPooling is a monorepo application that consists of:

- Frontend: React + Vite + Redux Toolkit
- Backend: Node.js + Express + MongoDB + Mongoose
- Real route matching: OSRM-based route geometry and route compatibility logic
- User features: signup/login, profile management, ride publishing/searching, payments and payout sections, help center, chat, reviews, and notifications

The product is designed around the core requirement of matching rides by exact pickup and drop-off locations, not just general city-to-city route names.

## Tech Stack

### Frontend
- React 19
- Vite
- Redux Toolkit
- React Router
- Axios
- Tailwind CSS
- Custom CSS for UI layout and styling

### Backend
- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT authentication
- CORS
- dotenv
- Nodemailer
- Socket.IO
- Cloudinary-ready configuration

### Core Logic / integrations
- OpenStreetMap Nominatim for geocoding and reverse geocoding
- OSRM (Open Source Routing Machine) for road route calculation
- Custom ride compatibility logic for pickup/drop-off matching

## Project Structure

```text
carpooling-app/
├── README.md
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── cloudinary.js
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── admin.controller.js
│   │   │   ├── auth.controller.js
│   │   │   ├── booking.controller.js
│   │   │   ├── chat.controller.js
│   │   │   ├── notification.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── review.controller.js
│   │   │   ├── ride.controller.js
│   │   │   └── user.controller.js
│   │   ├── jobs/
│   │   │   └── rideStatus.cron.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   ├── upload.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── models/
│   │   │   ├── Booking.js
│   │   │   ├── Conversation.js
│   │   │   ├── Message.js
│   │   │   ├── Notification.js
│   │   │   ├── Review.js
│   │   │   ├── Ride.js
│   │   │   ├── User.js
│   │   │   └── Vehicle.js
│   │   ├── routes/
│   │   │   ├── admin.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── booking.routes.js
│   │   │   ├── chat.routes.js
│   │   │   ├── notification.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── review.routes.js
│   │   │   ├── ride.routes.js
│   │   │   └── user.routes.js
│   │   ├── services/
│   │   │   ├── email.service.js
│   │   │   ├── notification.service.js
│   │   │   ├── payment.service.js
│   │   │   ├── route.service.js
│   │   │   ├── route.service.test.js
│   │   │   ├── sms.service.js
│   │   │   └── ...
│   │   ├── sockets/
│   │   │   ├── chat.socket.js
│   │   │   └── index.js
│   │   ├── utils/
│   │   │   ├── apiError.js
│   │   │   ├── apiResponse.js
│   │   │   ├── asyncHandler.js
│   │   │   └── generateToken.js
│   │   ├── validators/
│   │   │   ├── auth.validator.js
│   │   │   ├── booking.validator.js
│   │   │   ├── review.validator.js
│   │   │   └── ride.validator.js
│   │   └── ...
│   └── .env
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── api/
│       │   ├── auth.api.js
│       │   ├── axiosInstance.js
│       │   ├── booking.api.js
│       │   ├── chat.api.js
│       │   ├── notification.api.js
│       │   ├── payment.api.js
│       │   ├── review.api.js
│       │   └── ride.api.js
│       ├── app/
│       │   └── store.js
│       ├── components/
│       │   ├── booking/
│       │   ├── chat/
│       │   ├── common/
│       │   ├── layout/
│       │   ├── review/
│       │   └── ride/
│       ├── features/
│       │   ├── auth/
│       │   ├── bookings/
│       │   ├── chat/
│       │   ├── notifications/
│       │   └── rides/
│       ├── hooks/
│       ├── pages/
│       │   ├── AdminDashboard.jsx
│       │   ├── Chat.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── MyRides.jsx
│       │   ├── Profile.jsx
│       │   ├── PublishRide.jsx
│       │   ├── Register.jsx
│       │   ├── ResetPassword.jsx
│       │   ├── RideDetails.jsx
│       │   ├── SearchResults.jsx
│       │   └── ...
│       ├── routes/
│       │   ├── AppRoutes.jsx
│       │   └── ProtectedRoute.jsx
│       └── utils/
└── docs/
    ├── API.md
    └── DB_SCHEMA.md
```

## Main Features

### User authentication
- Register / login / forgot password / reset password
- JWT-based authentication middleware
- Role-based structure for users and admin flows

### Ride publishing
- Driver can publish a ride with:
  - exact pickup location
  - exact drop-off location
  - route geometry from OSRM
  - departure time
  - available seats
  - price per seat

### Ride searching
- Passenger enters exact pickup and drop-off points
- Ride API checks exact route compatibility
- Matching algorithm determines:
  - route order validity
  - pickup distance from route
  - drop-off distance from route
  - total detour allowance
  - available seats

### Route matching logic
The app does not just compare city names; it uses location coordinates and route geometry. The matching logic calculates the nearest route projection and checks whether:

- pickup and drop-off fall on the same route direction
- pickup precedes drop-off in route order
- the detour is within a tolerance
- the route is still feasible with available seats

This is the core functionality that makes the ride experience feel closer to real-world ride-sharing apps like Uber and Ola.

### Profile and account features
The frontend includes account sections for:
- profile overview
- account settings
- communication preferences
- password changes
- postal address
- payouts
- payments and refunds
- privacy policy and terms
- verification and trust sections

### Help centre and support
The app includes a help center with category-based article navigation and article feedback flow.

### Booking, chat, reviews, payments
The backend is structured for:
- bookings
- payments
- notifications
- chat messages and conversations
- ride reviews
- admin management

## Environment Variables

Create a `.env` file inside the `backend` folder for configuration.

Example:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/carpooling
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Notes:
- `MONGO_URI` is optional; if omitted, it defaults to `mongodb://127.0.0.1:27017/carpooling`
- `JWT_SECRET` should be a secure random value in production
- Email credentials are only required if you enable password reset or notification email features

## Running the Application

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the backend

```bash
cd backend
npm run dev
```

This starts the Express server and connects to MongoDB.

### 4. Start the frontend

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Open the frontend in the browser at:

```text
http://localhost:5173
```

The backend runs at:

```text
http://localhost:5000
```

## Backend API Overview

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`

### Rides
- `POST /api/rides/route` - calculate route between two or more locations
- `POST /api/rides/search` - search rides by exact pickup/drop-off and date
- `POST /api/rides` - create a new published ride (requires auth)
- `GET /api/rides/:id` - fetch a specific ride

### Additional backend modules
The project also includes routes and controllers for:
- bookings
- reviews
- notifications
- payment flows
- chat and real-time messaging
- admin operations

## Frontend App Structure

### Key files
- `frontend/src/App.jsx` - main landing page, home search flow, profile UI, help center, ride creation modal
- `frontend/src/api/ride.api.js` - ride API client
- `frontend/src/pages/Home.jsx` - home screen section
- `frontend/src/pages/PublishRide.jsx` - ride publishing UI
- `frontend/src/pages/Profile.jsx` - user profile and account screens
- `frontend/src/app/store.js` - Redux store

### Redux slices
- `frontend/src/features/auth/authSlice.js`
- `frontend/src/features/rides/rideSlice.js`
- `frontend/src/features/bookings/bookingSlice.js`
- `frontend/src/features/chat/chatSlice.js`
- `frontend/src/features/notifications/notificationSlice.js`

## Ride Matching Flow

A typical search flow works like this:

1. Passenger enters pickup and drop-off addresses
2. Each point is geocoded to latitude/longitude
3. The frontend sends the exact coordinates to the backend
4. The backend loads all upcoming published rides
5. Each ride route is compared to the passenger route using route geometry
6. Matching is validated by:
   - route order
   - proximity to the route
   - detour threshold
   - seat availability
7. Compatible rides are returned to the frontend sorted by best match

This logic is implemented in:
- `backend/src/services/route.service.js`
- `backend/src/controllers/ride.controller.js`
- `backend/src/models/Ride.js`

## Database Model Notes

MongoDB is used for persistence. The main ride schema stores:
- driver reference
- origin location
- destination location
- stops
- departure time
- available seats
- price per seat
- route metadata
- route geometry coordinates
- status

The route geometry is used to evaluate the real road path taken by a driver.

## Testing

Backend route tests are included for the ride-matching logic.

Run:

```bash
cd backend
npm test
```

Current test coverage includes:
- pickup and drop-off in correct route order
- invalid reverse-order ride
- pickup too far from the route
- full ride rejection

## Build and Production Check

Frontend production build:

```bash
cd frontend
npm run build
```

This validates that the Vite app compiles successfully for production.

## Notes and Considerations

- The app currently uses OpenStreetMap Nominatim for address suggestions and geocoding in the frontend.
- The route calculation uses OSRM to compute real road geometry.
- This project is structured as a working MVP / prototype and is ready for extension with real map UI, wallet integration, payment gateways, and production deployment tools.
- A root-level package.json is intentionally not used because the app is split into separate backend and frontend projects.

## Suggested Next Enhancements

- Real map integration with Leaflet or Mapbox
- Ride booking and acceptance workflows
- Payment gateway integration
- Notification delivery improvements
- Admin dashboard for moderation and reporting
- Real-time chat improvements with Socket.IO
- Advanced filtering by time, price, and driver rating

## License

This project is created for learning and project development purposes. Update the license if you are preparing for production deployment or public distribution.

## Summary

CarPooling is a complete ride-sharing project that includes a modern frontend, a Node.js API, MongoDB data models, route-aware ride matching, authentication, and a user-facing experience focused on real-life pickup and drop-off coordination. The architecture is structured to scale further with bookings, payments, reviews, admin tooling, and production deployment.
