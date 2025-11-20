# Integration Tests

This directory contains integration tests for the Box CLI that run against the actual Box API using CLI commands.

## Overview

The integration tests verify the CLI functionality by running actual Box CLI commands (e.g., `box users:get`, `box files:upload`) against the real Box API. These tests create real Box resources (users, files, folders, etc.) using the command-line interface to simulate user actions.

## Setup

### Prerequisites

1. A Box Custom App with Server Authentication (JWT) configured
2. The app must have:
   - **App Access Level**: App + Enterprise Access
   - **Application Scopes**: All scopes enabled
   - **Advanced Features**: 
     - "Make API calls using the as-user header" enabled
     - "Generate user access tokens" enabled
3. The app must be authorized by an enterprise admin

### Configuration

There are two ways to configure the integration tests:

#### Option 1: Environment Variables (Recommended for CI/CD)

Set the following environment variables:

- `BOX_JWT_CONFIG`: Base64-encoded JWT configuration JSON (from Box Developer Console)
- `BOX_ADMIN_USER_ID`: ID of an admin user in the enterprise

To encode your JWT config file:

```bash
base64 -i path_to_jwt_config.json
```

Then set the environment variables:

```bash
export BOX_JWT_CONFIG="<base64-encoded-jwt-config>"
export BOX_ADMIN_USER_ID="<admin-user-id>"
```

#### Option 2: Configuration File (For Local Development)

1. Download your JWT configuration from the Box Developer Console (Configuration > App Settings)
2. Update `test/integration/test-config.json`:

```json
{
  "jwt_file_path": "/path/to/your/jwt-config.json",
  "admin_user_id": "your-admin-user-id"
}
```

**Note**: Keep your JWT configuration file outside of the repository to avoid accidentally committing credentials. The `jwt_file_path` should point to a location outside the project directory.

## Running Integration Tests

### Run all integration tests:

```bash
npm run test:integration
```

### Run specific test file:

```bash
npm run test:integration -- test/integration/__tests__/user.test.js
```

## Test Structure

```
test/integration/
├── __tests__/           # Integration test files
│   ├── file.test.js
│   ├── folder.test.js
│   └── user.test.js
├── context.js           # Authentication configuration helpers
├── lib/
│   └── utils.js        # Utility functions
├── resources/          # Test files for upload
│   └── test-file.txt
├── test-config.json    # Local configuration (not committed)
└── README.md
```

## Writing Integration Tests

Integration tests follow these patterns:

1. **Setup**: Configure CLI environment and create test users in `before()`
2. **Test**: Execute CLI commands using `execSync()` to simulate user actions
3. **Cleanup**: Delete test resources and clean up environment in `after()`

Example:

```javascript
const { execSync } = require('node:child_process');
const { getJwtConfig } = require('../context');
const { randomName } = require('../lib/utils');

const context = {};

before(async function () {
  // Set up CLI environment with JWT config
  const jwtConfig = getJwtConfig();
  const tempConfigPath = path.join(os.tmpdir(), `box-jwt-${Date.now()}.json`);
  fs.writeFileSync(tempConfigPath, JSON.stringify(jwtConfig, null, 2));
  
  execSync(
    `./bin/run configure:environments:add "${tempConfigPath}" --name="test-env" --set-as-current`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
  
  // Create test user using CLI
  const userName = randomName();
  const output = execSync(
    `./bin/run users:create "${userName}" --json`,
    { cwd: process.cwd(), encoding: 'utf8' }
  );
  context.testUser = JSON.parse(output);
});

after(async function () {
  // Clean up using CLI commands
  execSync(`./bin/run users:delete ${context.testUser.id} --force`, { stdio: 'pipe' });
  execSync(`./bin/run configure:environments:delete "test-env"`, { stdio: 'pipe' });
});

describe('My Integration Tests', function () {
  it('should perform user operation', function () {
    // Run CLI command
    const output = execSync(
      `./bin/run users:get ${context.testUser.id} --json`,
      { cwd: process.cwd(), encoding: 'utf8' }
    );
    const user = JSON.parse(output);
    assert.equal(user.id, context.testUser.id);
  });
});
```

## CI/CD Integration

The integration tests are configured to run in GitHub Actions when the required secrets are available:

- `BOX_JWT_CONFIG`: Base64-encoded JWT configuration
- `BOX_ADMIN_USER_ID`: Admin user ID

These secrets should be configured in the repository settings.

## Best Practices

1. **Always clean up**: Ensure all created resources are properly deleted using CLI commands in `after()` hooks
2. **Isolate tests**: Each test should be independent and not rely on other tests
3. **Handle errors**: Use try/catch blocks to ensure cleanup even if tests fail
4. **Use unique names**: Test objects use random names to avoid conflicts
5. **Test CLI output**: Parse JSON output from CLI commands to verify results
6. **Simulate user actions**: Run actual CLI commands as a user would, rather than calling SDK functions directly

## Troubleshooting

### "JWT config cannot be loaded"

- Verify `BOX_JWT_CONFIG` environment variable is set correctly
- Or ensure `jwt_file_path` in `test-config.json` points to a valid JWT config file

### "Admin user id cannot be loaded"

- Verify `BOX_ADMIN_USER_ID` environment variable is set
- Or ensure `admin_user_id` in `test-config.json` is set

### Tests timeout

- Increase the timeout in `.mocharc.yml` if needed
- Check network connectivity to Box API
- Verify your JWT app is properly authorized

### Permission errors

- Ensure your Box app has all necessary scopes enabled
- Verify the app is authorized by an enterprise admin
- Check that "Make API calls using the as-user header" is enabled
