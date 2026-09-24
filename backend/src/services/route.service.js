const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value) => value * Math.PI / 180;

const distanceMeters = (first, second) => {
	const latitudeDelta = toRadians(second.latitude - first.latitude);
	const longitudeDelta = toRadians(second.longitude - first.longitude);
	const firstLatitude = toRadians(first.latitude);
	const secondLatitude = toRadians(second.latitude);
	const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const coordinateDistance = (first, second) => distanceMeters(
	{ latitude: first[1], longitude: first[0] },
	{ latitude: second[1], longitude: second[0] },
);

const calculateRoute = async (origin, destination, stops = []) => {
	const locations = [origin, ...stops, destination];
	const coordinates = locations.map((location) => `${location.longitude},${location.latitude}`).join(';');
	const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`);
	if (!response.ok) throw new Error('Unable to calculate a road route right now.');
	const payload = await response.json();
	const route = payload.routes?.[0];
	if (!route?.geometry?.coordinates?.length) throw new Error('No road route was found for these locations.');
	return {
		distanceMeters: Math.round(route.distance),
		durationSeconds: Math.round(route.duration),
		geometry: route.geometry,
	};
};

const closestRoutePosition = (point, coordinates) => {
	let closest = { distanceMeters: Infinity, positionMeters: 0 };
	let travelledMeters = 0;
	for (let index = 1; index < coordinates.length; index += 1) {
		const start = coordinates[index - 1];
		const end = coordinates[index];
		const segmentLength = coordinateDistance(start, end);
		const denominator = ((end[0] - start[0]) ** 2) + ((end[1] - start[1]) ** 2) || 1;
		const ratio = Math.max(0, Math.min(1, (((point.longitude - start[0]) * (end[0] - start[0])) + ((point.latitude - start[1]) * (end[1] - start[1]))) / denominator));
		const projected = { longitude: start[0] + (end[0] - start[0]) * ratio, latitude: start[1] + (end[1] - start[1]) * ratio };
		const distance = distanceMeters(point, projected);
		if (distance < closest.distanceMeters) closest = { distanceMeters: distance, positionMeters: travelledMeters + segmentLength * ratio };
		travelledMeters += segmentLength;
	}
	return closest;
};

const routeMatch = (ride, pickup, dropoff, options = {}) => {
	const maxRouteDistanceMeters = Number.isFinite(options.maxRouteDistanceMeters) ? options.maxRouteDistanceMeters : 5000;
	const maxDetourMeters = Number.isFinite(options.maxDetourMeters) ? options.maxDetourMeters : 15000;
	const requestedSeats = Number.isFinite(options.requestedSeats) ? options.requestedSeats : 1;
	const coordinates = ride.routeGeometry?.coordinates || [];
	if (coordinates.length < 2) return { compatible: false, reason: 'missing-route-geometry', score: Number.MAX_SAFE_INTEGER };
	const pickupMatch = closestRoutePosition(pickup, coordinates);
	const dropoffMatch = closestRoutePosition(dropoff, coordinates);
	const orderValid = pickupMatch.positionMeters < dropoffMatch.positionMeters;
	const detourMeters = pickupMatch.distanceMeters + dropoffMatch.distanceMeters;
	const compatible = orderValid && pickupMatch.distanceMeters <= maxRouteDistanceMeters && dropoffMatch.distanceMeters <= maxRouteDistanceMeters && detourMeters <= maxDetourMeters && ride.availableSeats >= requestedSeats;
	return { compatible, pickupDistanceMeters: Math.round(pickupMatch.distanceMeters), dropoffDistanceMeters: Math.round(dropoffMatch.distanceMeters), detourMeters: Math.round(detourMeters), pickupPositionMeters: Math.round(pickupMatch.positionMeters), dropoffPositionMeters: Math.round(dropoffMatch.positionMeters), score: Math.round((pickupMatch.distanceMeters + dropoffMatch.distanceMeters) + (orderValid ? 0 : 1000000)) };
};

const findCompatibleRides = (rides, pickup, dropoff, options = {}) => rides
	.map((ride) => ({ ride, match: routeMatch(ride, pickup, dropoff, options) }))
	.filter(({ match }) => match.compatible)
	.sort((first, second) => first.match.score - second.match.score);

module.exports = { calculateRoute, routeMatch, findCompatibleRides, distanceMeters };