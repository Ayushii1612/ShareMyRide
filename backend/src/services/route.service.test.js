const test = require('node:test');
const assert = require('node:assert/strict');
const { routeMatch } = require('./route.service');

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
