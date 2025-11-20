# Integration Tests

This directory contains integration tests for the Box CLI that run against the actual Box API.

## Overview

The integration tests are based on the testing approach used in [box-node-sdk](https://github.com/box/box-node-sdk/tree/main/tests/integration_test). These tests create real Box resources (users, files, folders, etc.) and verify the CLI functionality against them.

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
├── context.js           # Authentication and client setup
├── lib/
│   └── utils.js        # Utility functions
├── objects/            # Test object factories
│   ├── box-test-file.js
│   ├── box-test-folder.js
│   └── box-test-user.js
├── resources/          # Test files for upload
│   └── test-file.txt
├── test-config.json    # Local configuration (not committed)
└── README.md
```

## Writing Integration Tests

Integration tests follow these patterns:

1. **Setup**: Create test users and resources in `beforeAll()`
2. **Test**: Execute test scenarios using Box SDK
3. **Cleanup**: Dispose of test resources in `afterAll()`

Example:

```javascript
const { getAppClient, getUserClient } = require('../context');
const { createBoxTestUser, clearUserContent } = require('../objects/box-test-user');

const context = {};

beforeAll(async () => {
  let appClient = getAppClient();
  let user = await createBoxTestUser(appClient);
  let userClient = getUserClient(user.id);
  context.user = user;
  context.client = userClient;
});

afterAll(async () => {
  await clearUserContent(context.client);
  await context.user.dispose();
});

describe('My Integration Tests', () => {
  test('should do something', async () => {
    // Test implementation
  });
});
```

## CI/CD Integration

The integration tests are configured to run in GitHub Actions when the required secrets are available:

- `BOX_JWT_CONFIG`: Base64-encoded JWT configuration
- `BOX_ADMIN_USER_ID`: Admin user ID

These secrets should be configured in the repository settings.

## Best Practices

1. **Always clean up**: Ensure all created resources are properly disposed in `afterAll()` hooks
2. **Use test helpers**: Utilize the object factories in `objects/` for consistent resource creation
3. **Isolate tests**: Each test should be independent and not rely on other tests
4. **Handle errors**: Use try/finally blocks to ensure cleanup even if tests fail
5. **Use unique names**: Test objects use random names to avoid conflicts

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
