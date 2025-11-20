'use strict';

const assert = require('chai').assert;
const path = require('node:path');
const { getAppClient, getUserClient } = require('../context');
const { createBoxTestFile } = require('../objects/box-test-file');
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
	let folder = await createBoxTestFolder(userClient);
	context.user = user;
	context.appClient = appClient;
	context.client = userClient;
	context.folder = folder;
});

after(async function () {
	this.timeout(60_000);
	await context.folder.dispose();
	await clearUserContent(context.client);
	await context.user.dispose();
	context.folder = null;
	context.user = null;
});

describe('Files Integration Tests', function () {
	this.timeout(60_000);

	it('should upload and get file information', async function() {
		let testFile = await createBoxTestFile(
			context.client,
			path.join(__dirname, '../resources/test-file.txt')
		);
		try {
			let file = await context.client.files.get(testFile.id);
			assert.equal(file.id, testFile.id);
			assert.equal(file.type, 'file');
			assert.equal(file.name, testFile.name);
		} finally {
			await testFile.dispose();
		}
	});

	it('should upload file to specific folder', async function() {
		let testFile = await createBoxTestFile(
			context.client,
			path.join(__dirname, '../resources/test-file.txt'),
			'test-upload.txt',
			context.folder.id
		);
		try {
			let file = await context.client.files.get(testFile.id);
			assert.equal(file.id, testFile.id);
			assert.equal(file.type, 'file');
			assert.equal(file.parent.id, context.folder.id);
		} finally {
			await testFile.dispose();
		}
	});

	it('should get file with custom fields', async function() {
		let testFile = await createBoxTestFile(
			context.client,
			path.join(__dirname, '../resources/test-file.txt')
		);
		try {
			let file = await context.client.files.get(testFile.id, {
				fields: 'name,type',
			});
			assert.equal(file.id, testFile.id);
			assert.equal(file.type, 'file');
			assert.equal(file.name, testFile.name);
			assert.isUndefined(file.size);
		} finally {
			await testFile.dispose();
		}
	});

	it('should update file information', async function() {
		let testFile = await createBoxTestFile(
			context.client,
			path.join(__dirname, '../resources/test-file.txt')
		);
		try {
			const newName = 'renamed-file.txt';
			let updatedFile = await context.client.files.update(testFile.id, {
				name: newName,
			});
			assert.equal(updatedFile.name, newName);
		} finally {
			await testFile.dispose();
		}
	});
});
