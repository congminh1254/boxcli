'use strict';

const fs = require('node:fs');
const path = require('node:path');
const utils = require('../lib/utils');

/**
 * Create a test file from a local file path
 * @param {Object} client - Box SDK client
 * @param {string} filePath - Path to local file to upload
 * @param {string} fileName - Name for the file in Box (optional, defaults to random name)
 * @param {string} parentID - Parent folder ID (defaults to '0' for root)
 * @returns {Promise<Object>} File object with dispose method
 */
async function createBoxTestFile(
	client,
	filePath,
	fileName = null,
	parentID = '0'
) {
	let name = fileName || `${utils.randomName()}${path.extname(filePath)}`;
	let stream = fs.createReadStream(filePath);
	let file = await client.files.uploadFile(parentID, name, stream);
	file.dispose = async function () {
		await client.files.delete(file.id);
		await client.files.deletePermanently(file.id);
	};
	return file;
}

module.exports = {
	createBoxTestFile,
};
