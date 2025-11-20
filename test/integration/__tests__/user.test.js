'use strict';

const { test } = require('@oclif/test');
const assert = require('chai').assert;
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');
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
	execSync(
		`./bin/run configure:environments:add "${tempConfigPath}" --name="${context.envName}" --set-as-current`,
		{ cwd: process.cwd(), stdio: 'pipe' }
	);

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

	test
		.stdout()
		.command(['users:get', () => context.testUser.id, '--json'])
		.it('should get user information using CLI', (ctx) => {
			const user = JSON.parse(ctx.stdout);
			assert.equal(user.id, context.testUser.id);
			assert.equal(user.type, 'user');
			assert.equal(user.name, context.testUser.name);
		});

	test
		.stdout()
		.command([
			'users:update',
			() => context.testUser.id,
			'--name=Updated Test User',
			'--json',
		])
		.it('should update user information using CLI', (ctx) => {
			const updatedUser = JSON.parse(ctx.stdout);
			assert.equal(updatedUser.name, 'Updated Test User');
		});

	test
		.stdout()
		.command(['users', '--json'])
		.it('should list users using CLI', (ctx) => {
			const users = JSON.parse(ctx.stdout);
			assert.isArray(users.entries);
			assert.isTrue(users.entries.length > 0);
		});
});
