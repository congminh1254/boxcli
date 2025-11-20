'use strict';

const assert = require('chai').assert;
const { getAppClient, getUserClient } = require('../context');
const {
	createBoxTestUser,
	clearUserContent,
} = require('../objects/box-test-user');

const context = {};

before(async function () {
	this.timeout(60_000);
	let appClient = getAppClient();
	let user = await createBoxTestUser(appClient);
	let userClient = getUserClient(user.id);
	context.user = user;
	context.appClient = appClient;
	context.client = userClient;
});

after(async function () {
	this.timeout(60_000);
	await clearUserContent(context.client);
	await context.user.dispose();
	context.user = null;
});

describe('Users Integration Tests', function () {
	this.timeout(60_000);

	it('should get user information', async function() {
		let userInfo = await context.client.users.get('me');
		assert.equal(userInfo.id, context.user.id);
		assert.equal(userInfo.type, 'user');
		assert.equal(userInfo.name, context.user.name);
	});

	it('should get user by id', async function() {
		let userInfo = await context.appClient.users.get(context.user.id);
		assert.equal(userInfo.id, context.user.id);
		assert.equal(userInfo.type, 'user');
		assert.equal(userInfo.name, context.user.name);
	});

	it('should update user information', async function() {
		const newName = 'Updated Test User';
		let updatedUser = await context.appClient.users.update(context.user.id, {
			name: newName,
		});
		assert.equal(updatedUser.name, newName);

		// Verify the update
		let userInfo = await context.appClient.users.get(context.user.id);
		assert.equal(userInfo.name, newName);
	});
});
