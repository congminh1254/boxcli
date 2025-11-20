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

	it('should upload and get file information using CLI', function () {
		const testFilePath = path.join(__dirname, '../resources/test-file.txt');

		// Upload file
		const uploadOutput = execSync(
			`./bin/run files:upload "${testFilePath}" --parent-id=${context.testFolder.id} --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const uploadedFile = JSON.parse(uploadOutput);

		try {
			// Get file information
			const getOutput = execSync(
				`./bin/run files:get ${uploadedFile.id} --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const file = JSON.parse(getOutput);

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

	it('should update file name using CLI', function () {
		const testFilePath = path.join(__dirname, '../resources/test-file.txt');

		// Upload file
		const uploadOutput = execSync(
			`./bin/run files:upload "${testFilePath}" --parent-id=${context.testFolder.id} --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const uploadedFile = JSON.parse(uploadOutput);

		try {
			const newName = 'renamed-file.txt';

			// Update file name
			const updateOutput = execSync(
				`./bin/run files:update ${uploadedFile.id} --name="${newName}" --as-user=${context.testUser.id} --json`,
				{ cwd: process.cwd(), encoding: 'utf8' }
			);
			const updatedFile = JSON.parse(updateOutput);

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

	it('should download file using CLI', function () {
		const testFilePath = path.join(__dirname, '../resources/test-file.txt');
		const downloadPath = path.join(os.tmpdir(), `downloaded-${Date.now()}.txt`);

		// Upload file
		const uploadOutput = execSync(
			`./bin/run files:upload "${testFilePath}" --parent-id=${context.testFolder.id} --as-user=${context.testUser.id} --json`,
			{ cwd: process.cwd(), encoding: 'utf8' }
		);
		const uploadedFile = JSON.parse(uploadOutput);

		try {
			// Download file
			execSync(
				`./bin/run files:download ${uploadedFile.id} --destination="${downloadPath}" --as-user=${context.testUser.id}`,
				{ cwd: process.cwd(), stdio: 'pipe' }
			);

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
