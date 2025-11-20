'use strict';

const assert = require('chai').assert;
const { getAppClient, getUserClient } = require('../context');
const { createBoxTestFolder } = require('../objects/box-test-folder');
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

describe('Folders Integration Tests', function () {
	this.timeout(60_000);

	it('should create and get folder information', async function() {
		let testFolder = await createBoxTestFolder(context.client);
		try {
			let folder = await context.client.folders.get(testFolder.id);
			assert.equal(folder.id, testFolder.id);
			assert.equal(folder.type, 'folder');
			assert.equal(folder.name, testFolder.name);
		} finally {
			await testFolder.dispose();
		}
	});

	it('should create nested folder', async function() {
		let parentFolder = await createBoxTestFolder(context.client);
		try {
			let childFolder = await createBoxTestFolder(
				context.client,
				parentFolder.id
			);
			try {
				let folder = await context.client.folders.get(childFolder.id);
				assert.equal(folder.id, childFolder.id);
				assert.equal(folder.type, 'folder');
				assert.equal(folder.parent.id, parentFolder.id);
			} finally {
				await childFolder.dispose();
			}
		} finally {
			await parentFolder.dispose();
		}
	});

	it('should update folder information', async function() {
		let testFolder = await createBoxTestFolder(context.client);
		try {
			const newName = 'renamed-folder';
			let updatedFolder = await context.client.folders.update(
				testFolder.id,
				{
					name: newName,
				}
			);
			assert.equal(updatedFolder.name, newName);
		} finally {
			await testFolder.dispose();
		}
	});

	it('should list folder items', async function() {
		let testFolder = await createBoxTestFolder(context.client);
		try {
			// Create a subfolder
			let childFolder = await createBoxTestFolder(
				context.client,
				testFolder.id
			);
			try {
				let items = await context.client.folders.get(testFolder.id, {
					fields: 'item_collection',
				});
				assert.equal(items.item_collection.entries.length, 1);
				assert.equal(items.item_collection.entries[0].id, childFolder.id);
			} finally {
				await childFolder.dispose();
			}
		} finally {
			await testFolder.dispose();
		}
	});
});
