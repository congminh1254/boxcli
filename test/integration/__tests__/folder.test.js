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

describe('Folders CLI Integration Tests', function () {
	this.timeout(60_000);

	it('should create and get folder information using CLI', function () {
		const folderName = randomName();

		// Create folder
		const createOutput = execSync(
			`./bin/run folders:create 0 "${folderName}" --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const createdFolder = JSON.parse(createOutput);

		try {
			// Get folder information
			const getOutput = execSync(
				`./bin/run folders:get ${createdFolder.id} --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const folder = JSON.parse(getOutput);

			assert.equal(folder.id, createdFolder.id);
			assert.equal(folder.type, 'folder');
			assert.equal(folder.name, folderName);
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

	it('should create nested folder using CLI', function () {
		const parentFolderName = randomName();
		const childFolderName = randomName();

		// Create parent folder
		const createParentOutput = execSync(
			`./bin/run folders:create 0 "${parentFolderName}" --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const parentFolder = JSON.parse(createParentOutput);

		try {
			// Create child folder
			const createChildOutput = execSync(
				`./bin/run folders:create ${parentFolder.id} "${childFolderName}" --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const childFolder = JSON.parse(createChildOutput);

			try {
				// Get child folder information
				const getOutput = execSync(
					`./bin/run folders:get ${childFolder.id} --as-user=${context.testUser.id} --json`,
					{ cwd: process.cwd(), encoding: 'utf8' }
				);
				const folder = JSON.parse(getOutput);

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

	it('should update folder name using CLI', function () {
		const folderName = randomName();
		const newName = 'renamed-folder';

		// Create folder
		const createOutput = execSync(
			`./bin/run folders:create 0 "${folderName}" --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const createdFolder = JSON.parse(createOutput);

		try {
			// Update folder name
			const updateOutput = execSync(
				`./bin/run folders:update ${createdFolder.id} --name="${newName}" --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const updatedFolder = JSON.parse(updateOutput);

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

	it('should list folder items using CLI', function () {
		const parentFolderName = randomName();
		const childFolderName = randomName();

		// Create parent folder
		const createParentOutput = execSync(
			`./bin/run folders:create 0 "${parentFolderName}" --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const parentFolder = JSON.parse(createParentOutput);

		try {
			// Create child folder
			const createChildOutput = execSync(
				`./bin/run folders:create ${parentFolder.id} "${childFolderName}" --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const childFolder = JSON.parse(createChildOutput);

			try {
				// List items in parent folder
				const listOutput = execSync(
					`./bin/run folders:items ${parentFolder.id} --as-user=${context.testUser.id} --json`,
					{ cwd: process.cwd(), encoding: 'utf8' }
				);
				const items = JSON.parse(listOutput);

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
