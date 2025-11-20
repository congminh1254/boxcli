'use strict';

const BoxSDK = require('box-node-sdk').default;
const testConfig = require('./test-config.json');

const BOX_JWT_CONFIG_ENV_NAME = 'BOX_JWT_CONFIG';
const BOX_ADMIN_USER_ID_ENV_NAME = 'BOX_ADMIN_USER_ID';

/**
 * Get JWT config from file path specified in test-config.json
 * @returns {Object|null} JWT config object or null if not found
 */
function getJwtConfigFromFile() {
	let jwtFilePath = testConfig.jwt_file_path;
	if (!jwtFilePath) {
		return null;
	}
	 
	return require(jwtFilePath);
}

/**
 * Get JWT config from environment variable (base64 encoded)
 * @returns {Object|null} JWT config object or null if not found
 */
function getJwtConfigFromEnv() {
	let jwtConfigBase64 = process.env[BOX_JWT_CONFIG_ENV_NAME];
	if (!jwtConfigBase64) {
		return null;
	}
	const jwtConfig = Buffer.from(jwtConfigBase64, 'base64').toString('utf8');
	return JSON.parse(jwtConfig);
}

/**
 * Get JWT config from file or environment variable
 * @returns {Object} JWT config object
 * @throws {Error} If JWT config cannot be loaded
 */
function getJwtConfig() {
	let jwtConfig = getJwtConfigFromFile() || getJwtConfigFromEnv();
	if (!jwtConfig) {
		throw new Error(
			`JWT config cannot be loaded. Missing environment variable: ${BOX_JWT_CONFIG_ENV_NAME} or JWT config path in test-config.json file.`
		);
	}
	return jwtConfig;
}

/**
 * Get admin user ID from environment variable
 * @returns {string} Admin user ID
 * @throws {Error} If admin user ID cannot be loaded
 */
function getAdminUserIdFromEnv() {
	let adminUserId = process.env[BOX_ADMIN_USER_ID_ENV_NAME];
	if (!adminUserId) {
		return null;
	}
	return adminUserId;
}

/**
 * Get admin user ID from test-config.json
 * @returns {string|null} Admin user ID or null if not found
 */
function getAdminUserIdFromFile() {
	let adminUserId = testConfig.admin_user_id;
	if (!adminUserId) {
		return null;
	}
	return adminUserId;
}

/**
 * Get admin user ID from file or environment variable
 * @returns {string} Admin user ID
 * @throws {Error} If admin user ID cannot be loaded
 */
function getAdminUserId() {
	let adminUserId = getAdminUserIdFromFile() || getAdminUserIdFromEnv();
	if (!adminUserId) {
		throw new Error(
			`Admin user id cannot be loaded. Missing environment variable: ${BOX_ADMIN_USER_ID_ENV_NAME} or admin user id in test-config.json file.`
		);
	}
	return adminUserId;
}

/**
 * Get Box SDK app client (enterprise service account)
 * @returns {Object} Box SDK client
 */
function getAppClient() {
	let jwtConfig = getJwtConfig();
	let sdk = BoxSDK.getPreconfiguredInstance(jwtConfig);
	return sdk.getAppAuthClient('enterprise');
}

/**
 * Get Box SDK user client for a specific user
 * @param {string} userID - User ID to get client for
 * @returns {Object} Box SDK client
 */
function getUserClient(userID) {
	let jwtConfig = getJwtConfig();
	let sdk = BoxSDK.getPreconfiguredInstance(jwtConfig);
	return sdk.getAppAuthClient('user', userID);
}

/**
 * Get Box SDK client for admin user
 * @returns {Object} Box SDK client
 */
function getAdminClient() {
	let adminUserId = getAdminUserId();
	return getUserClient(adminUserId);
}

/**
 * Get enterprise ID from JWT config
 * @returns {string} Enterprise ID
 */
function getEnterpriseId() {
	return getJwtConfig().enterpriseID;
}

module.exports = {
	getAppClient,
	getUserClient,
	getAdminClient,
	getEnterpriseId,
	getAdminUserId,
};
