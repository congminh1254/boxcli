'use strict';

const utils = require('../lib/utils');

/**
 * Create a test user
 * @param {Object} appClient - Box SDK app client
 * @returns {Promise<Object>} User object with dispose method
 */
async function createBoxTestUser(appClient) {
	let user = await appClient.enterprise.addAppUser(utils.randomName());
	user.dispose = async function () {
		await appClient.users.delete(user.id, { force: true });
	};
	return user;
}

/**
 * Clear all content from a user's account (files, folders, and trash)
 * @param {Object} client - Box SDK client for the user
 * @returns {Promise<void>}
 */
async function clearUserContent(client) {
	// Delete all items from root folder
	let items = await client.folders.get(0, { limit: 1000 });
	 
	for (let item of items.item_collection.entries) {
		await (item.type === 'folder' ? client.folders.delete(item.id, { recursive: true }) : client.files.delete(item.id));
	}
	
	// Clear trash
	let trashed = await client.trash.get();
	for (let item of trashed.entries) {
		if (item.type === 'file') {
			await client.files.deletePermanently(item.id);
		} else if (item.type === 'folder') {
			await client.folders.deletePermanently(item.id);
		}
	}
	 
}

module.exports = {
	createBoxTestUser,
	clearUserContent,
};
