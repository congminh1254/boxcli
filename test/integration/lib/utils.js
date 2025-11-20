'use strict';

const { nanoid } = require('nanoid');

/**
 * Generate a random name for test objects
 * @returns {string} Random name
 */
const randomName = () => `test-${nanoid()}`;

/**
 * Generate a random email for test users
 * @returns {string} Random email
 */
const randomEmail = () => `test-${nanoid()}@boxdevedition.com`;

/**
 * Delete a file permanently (move to trash then delete from trash)
 * @param {Object} client - Box SDK client
 * @param {string} fileID - File ID to delete
 * @returns {Promise<void>}
 */
const deleteFilePermanently = async (client, fileID) => {
	await client.files.delete(fileID);
	await client.files.deletePermanently(fileID);
};

/**
 * Delete a folder permanently (move to trash then delete from trash)
 * @param {Object} client - Box SDK client
 * @param {string} folderID - Folder ID to delete
 * @returns {Promise<void>}
 */
const deleteFolderPermanently = async (client, folderID) => {
	await client.folders.delete(folderID, { recursive: true });
	await client.folders.deletePermanently(folderID);
};

module.exports = {
	randomName,
	randomEmail,
	deleteFilePermanently,
	deleteFolderPermanently,
};
