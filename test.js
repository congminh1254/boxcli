const fs = require('fs');
const path = require('path');

const original_error = 'Expired Auth: Auth code or refresh token has expired\'';
const replaced_error = 'Expired Auth: Auth code or refresh token has expired\'; console.log(JSON.stringify(response));';

const file = path.join(__dirname, 'node_modules/box-node-sdk/lib/util/errors.js');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(original_error, replaced_error);
fs.writeFileSync(file, content, 'utf8');