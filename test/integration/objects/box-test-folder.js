'use strict';

const utils = require('../lib/utils');

/**
 * Create a test folder
 * @param {Object} client - Box SDK client
 * @param {string} parentID - Parent folder ID (defaults to '0' for root)
 * @returns {Promise<Object>} Folder object with dispose method
 */
async function createBoxTestFolder(client, parentID = '0') {
	let folder = await client.folders.create(parentID, utils.randomName());
	folder.dispose = async function () {
		await client.folders.delete(folder.id, { recursive: true });
		await client.folders.deletePermanently(folder.id);
	};
	return folder;
}

module.exports = {
	createBoxTestFolder,
};
