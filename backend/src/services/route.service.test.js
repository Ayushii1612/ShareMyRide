const test = require('node:test');
const assert = require('node:assert/strict');
const { routeMatch, findCompatibleRides, isFutureDeparture } = require('./route.service');

const ride = (availableSeats = 2) => ({
	availableSeats,
	routeGeometry: {
		type: 'LineString',
		coordinates: [[0, 0], [1, 0], [2, 0]],
	},
});

test('matches pickup and drop in route order', () => {
	const result = routeMatch(ride(), { latitude: 0, longitude: 0.5 }, { latitude: 0, longitude: 1.5 }, { maxRouteDistanceMeters: 1000, maxDetourMeters: 5000 });
	assert.equal(result.compatible, true);
	assert.equal(result.orderValid, undefined);
});

test('rejects a passenger travelling in reverse order', () => {
	const result = routeMatch(ride(), { latitude: 0, longitude: 1.5 }, { latitude: 0, longitude: 0.5 }, { maxRouteDistanceMeters: 1000, maxDetourMeters: 5000 });
	assert.equal(result.compatible, false);
});

test('rejects pickup too far from the route', () => {
	const result = routeMatch(ride(), { latitude: 1, longitude: 0.5 }, { latitude: 0, longitude: 1.5 }, { maxRouteDistanceMeters: 5000, maxDetourMeters: 50000 });
	assert.equal(result.compatible, false);
});

test('rejects a full ride', () => {
	const result = routeMatch(ride(0), { latitude: 0, longitude: 0.5 }, { latitude: 0, longitude: 1.5 }, { maxRouteDistanceMeters: 1000, maxDetourMeters: 5000 });
	assert.equal(result.compatible, false);
});

test('returns every compatible ride in score order', () => {
	const rides = [ride(2), ride(2), ride(1)];
	const matches = findCompatibleRides(rides, { latitude: 0, longitude: 0.5 }, { latitude: 0, longitude: 1.5 }, { requestedSeats: 2, maxRouteDistanceMeters: 1000, maxDetourMeters: 5000 });
	assert.equal(matches.length, 2);
	assert.deepEqual(matches.map(({ ride }) => ride), rides.slice(0, 2));
});

test('filters rides that cannot provide the requested passenger count', () => {
	const matches = findCompatibleRides([ride(1), ride(2)], { latitude: 0, longitude: 0.5 }, { latitude: 0, longitude: 1.5 }, { requestedSeats: 2, maxRouteDistanceMeters: 1000, maxDetourMeters: 5000 });
	assert.equal(matches.length, 1);
	assert.equal(matches[0].ride.availableSeats, 2);
});

test('excludes rides whose departure time has already passed', () => {
	const now = new Date('2026-09-25T17:00:00');
	assert.equal(isFutureDeparture(new Date('2026-09-25T13:00:00'), now), false);
	assert.equal(isFutureDeparture(new Date('2026-09-25T16:30:00'), now), false);
	assert.equal(isFutureDeparture(new Date('2026-09-25T18:00:00'), now), true);
	assert.equal(isFutureDeparture(new Date('2026-09-26T13:00:00'), now), true);
});
