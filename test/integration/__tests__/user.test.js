'use strict';

const assert = require('chai').assert;
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { getJwtConfig } = require('../context');
const { randomName } = require('../lib/utils');

const context = {};

before(async function () {
	this.timeout(60_000);

	// Set up a temporary JWT config file and environment
	const jwtConfig = getJwtConfig();
	const tempConfigPath = path.join(os.tmpdir(), `box-jwt-${Date.now()}.json`);
	fs.writeFileSync(tempConfigPath, JSON.stringify(jwtConfig, null, 2));
	context.tempConfigPath = tempConfigPath;
	context.envName = `test-env-${Date.now()}`;

	// Add environment to CLI
	try {
		execSync(
			`./bin/run configure:environments:add "${tempConfigPath}" --name="${context.envName}" --set-as-current`,
			{ cwd: process.cwd(), stdio: 'pipe' }
		);
	} catch (error) {
		console.error('Failed to configure environment:', error.message);
		throw error;
	}

	// Create a test user for the tests
	const userName = randomName();
	const createUserOutput = execSync(
		`./bin/run users:create "${userName}" --json`,
		{ cwd: process.cwd(), encoding: 'utf8' }
	);
	context.testUser = JSON.parse(createUserOutput);
});

after(async function () {
	this.timeout(60_000);

	// Delete test user
	if (context.testUser) {
		try {
			execSync(
				`./bin/run users:delete ${context.testUser.id} --force`,
				{ cwd: process.cwd(), stdio: 'pipe' }
			);
		} catch {
			// User might already be deleted
		}
	}

	// Remove the environment from CLI
	try {
		execSync(
			`./bin/run configure:environments:delete "${context.envName}"`,
			{ cwd: process.cwd(), stdio: 'pipe' }
		);
	} catch {
		// Environment might not exist
	}

	// Clean up temp config file
	if (context.tempConfigPath && fs.existsSync(context.tempConfigPath)) {
		fs.unlinkSync(context.tempConfigPath);
	}
});

describe('Users CLI Integration Tests', function () {
	this.timeout(60_000);

	it('should get user information using CLI', function () {
		const output = execSync(
			`./bin/run users:get ${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);

		const user = JSON.parse(output);
		assert.equal(user.id, context.testUser.id);
		assert.equal(user.type, 'user');
		assert.equal(user.name, context.testUser.name);
	});

	it('should update user information using CLI', function () {
		const newName = 'Updated Test User';
		const output = execSync(
			`./bin/run users:update ${context.testUser.id} --name="${newName}" --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);

		const updatedUser = JSON.parse(output);
		assert.equal(updatedUser.name, newName);

		// Verify the update
		const verifyOutput = execSync(
			`./bin/run users:get ${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const user = JSON.parse(verifyOutput);
		assert.equal(user.name, newName);
	});

	it('should list users using CLI', function () {
		const output = execSync(`./bin/run users --json`, {
			cwd: process.cwd(),
			encoding: 'utf8',
		});

		const users = JSON.parse(output);
		assert.isArray(users.entries);
		assert.isTrue(users.entries.length > 0);
	});
});
