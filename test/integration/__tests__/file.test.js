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

	// Create a test folder
	const folderName = randomName();
	const createFolderOutput = execSync(
		`./bin/run folders:create 0 "${folderName}" --as-user=${context.testUser.id} --json`,
		{ cwd: process.cwd(), encoding: 'utf8' }
	);
	context.testFolder = JSON.parse(createFolderOutput);
});

after(async function () {
	this.timeout(60_000);

	// Delete test folder
	if (context.testFolder) {
		try {
			execSync(
				`./bin/run folders:delete ${context.testFolder.id} --recursive --force --as-user=${context.testUser.id}`,
				{ cwd: process.cwd(), stdio: 'pipe' }
			);
		} catch {
			// Folder might already be deleted
		}
	}

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

describe('Files CLI Integration Tests', function () {
	this.timeout(60_000);

	test
		.stdout()
		.command([
			'files:upload',
			path.join(__dirname, '../resources/test-file.txt'),
			`--parent-id=${() => context.testFolder.id}`,
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should upload and get file information using CLI', async (ctx) => {
			const uploadedFile = JSON.parse(ctx.stdout);

			try {
				// Get file information using test framework
				const getOutput = await test
					.stdout()
					.command([
						'files:get',
						uploadedFile.id,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const file = JSON.parse(getOutput.stdout);
				assert.equal(file.id, uploadedFile.id);
				assert.equal(file.type, 'file');
				assert.equal(file.name, uploadedFile.name);
			} finally {
				// Clean up file
				try {
					execSync(
						`./bin/run files:delete ${uploadedFile.id} --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// File might already be deleted
				}
			}
		});

	test
		.stdout()
		.command([
			'files:upload',
			path.join(__dirname, '../resources/test-file.txt'),
			`--parent-id=${() => context.testFolder.id}`,
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should update file name using CLI', async (ctx) => {
			const uploadedFile = JSON.parse(ctx.stdout);

			try {
				const newName = 'renamed-file.txt';

				// Update file name
				const updateOutput = await test
					.stdout()
					.command([
						'files:update',
						uploadedFile.id,
						`--name=${newName}`,
						`--as-user=${context.testUser.id}`,
						'--json',
					])
					.run();

				const updatedFile = JSON.parse(updateOutput.stdout);
				assert.equal(updatedFile.name, newName);
			} finally {
				// Clean up file
				try {
					execSync(
						`./bin/run files:delete ${uploadedFile.id} --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// File might already be deleted
				}
			}
		});

	test
		.stdout()
		.command([
			'files:upload',
			path.join(__dirname, '../resources/test-file.txt'),
			`--parent-id=${() => context.testFolder.id}`,
			`--as-user=${() => context.testUser.id}`,
			'--json',
		])
		.it('should download file using CLI', async (ctx) => {
			const uploadedFile = JSON.parse(ctx.stdout);
			const downloadPath = path.join(os.tmpdir(), `downloaded-${Date.now()}.txt`);

			try {
				// Download file
				await test
					.command([
						'files:download',
						uploadedFile.id,
						`--destination=${downloadPath}`,
						`--as-user=${context.testUser.id}`,
					])
					.run();

				// Verify file was downloaded
				assert.isTrue(fs.existsSync(downloadPath));

				// Clean up downloaded file
				if (fs.existsSync(downloadPath)) {
					fs.unlinkSync(downloadPath);
				}
			} finally {
				// Clean up uploaded file
				try {
					execSync(
						`./bin/run files:delete ${uploadedFile.id} --as-user=${context.testUser.id}`,
						{ cwd: process.cwd(), stdio: 'pipe' }
					);
				} catch {
					// File might already be deleted
				}
			}
		});
});
