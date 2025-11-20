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

describe('Folders CLI Integration Tests', function () {
	this.timeout(60_000);

	test
		.stdout()
		.command([
			'folders:create',
			'0',
			() => randomName(),
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should create and get folder information using CLI', async (ctx) => {
			const createdFolder = JSON.parse(ctx.stdout);

			try {
				// Get folder information
				const getOutput = await test
					.stdout()
					.command([
						'folders:get',
						createdFolder.id,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const folder = JSON.parse(getOutput.stdout);
				assert.equal(folder.id, createdFolder.id);
				assert.equal(folder.type, 'folder');
				assert.equal(folder.name, createdFolder.name);
			} finally {
				// Clean up folder
				try {
					execSync(
						`./bin/run folders:delete ${createdFolder.id} --recursive --force --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// Folder might already be deleted
				}
			}
		});

	test
		.stdout()
		.command([
			'folders:create',
			'0',
			() => randomName(),
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should create nested folder using CLI', async (ctx) => {
			const parentFolder = JSON.parse(ctx.stdout);

			try {
				// Create child folder
				const childFolderName = randomName();
				const createChildOutput = await test
					.stdout()
					.command([
						'folders:create',
						parentFolder.id,
						childFolderName,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const childFolder = JSON.parse(createChildOutput.stdout);

				try {
					// Get child folder information
					const getOutput = await test
						.stdout()
						.command([
							'folders:get',
							childFolder.id,
							`--as-user=${context.testUser.id}`,
							'--json',
						])
						.run();

					const folder = JSON.parse(getOutput.stdout);
					assert.equal(folder.id, childFolder.id);
					assert.equal(folder.type, 'folder');
					assert.equal(folder.parent.id, parentFolder.id);
				} finally {
					// Clean up child folder
					try {
						execSync(
							`./bin/run folders:delete ${childFolder.id} --recursive --force --as-user=${context.testUser.id}`,
							{ cwd: process.cwd(), stdio: 'pipe' }
						);
					} catch {
						// Folder might already be deleted
					}
				}
			} finally {
				// Clean up parent folder
				try {
					execSync(
						`./bin/run folders:delete ${parentFolder.id} --recursive --force --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// Folder might already be deleted
				}
			}
		});

	test
		.stdout()
		.command([
			'folders:create',
			'0',
			() => randomName(),
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should update folder name using CLI', async (ctx) => {
			const createdFolder = JSON.parse(ctx.stdout);
			const newName = 'renamed-folder';

			try {
				// Update folder name
				const updateOutput = await test
					.stdout()
					.command([
						'folders:update',
						createdFolder.id,
						`--name=${newName}`,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const updatedFolder = JSON.parse(updateOutput.stdout);
				assert.equal(updatedFolder.name, newName);
			} finally {
				// Clean up folder
				try {
					execSync(
						`./bin/run folders:delete ${createdFolder.id} --recursive --force --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// Folder might already be deleted
				}
			}
		});

	test
		.stdout()
		.command([
			'folders:create',
			'0',
			() => randomName(),
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should list folder items using CLI', async (ctx) => {
			const parentFolder = JSON.parse(ctx.stdout);

			try {
				// Create child folder
				const childFolderName = randomName();
				const createChildOutput = await test
					.stdout()
					.command([
						'folders:create',
						parentFolder.id,
						childFolderName,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const childFolder = JSON.parse(createChildOutput.stdout);

				try {
					// List items in parent folder
					const listOutput = await test
						.stdout()
						.command([
							'folders:items',
							parentFolder.id,
							`--as-user=${context.testUser.id}`,
							'--json',
						])
						.run();

					const items = JSON.parse(listOutput.stdout);
					assert.isArray(items.entries);
					assert.equal(items.entries.length, 1);
					assert.equal(items.entries[0].id, childFolder.id);
				} finally {
					// Clean up child folder
					try {
						execSync(
							`./bin/run folders:delete ${childFolder.id} --recursive --force --as-user=${context.testUser.id}`,
							{ cwd: process.cwd(), stdio: 'pipe' }
						);
					} catch {
						// Folder might already be deleted
					}
				}
			} finally {
				// Clean up parent folder
				try {
					execSync(
						`./bin/run folders:delete ${parentFolder.id} --recursive --force --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// Folder might already be deleted
				}
			}
		});
});
