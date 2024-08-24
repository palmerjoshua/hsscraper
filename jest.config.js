module.exports = {
    // Specifies the root directory of the project
    roots: ['<rootDir>/tests'],

    // Specifies which files Jest should look for
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],

    // Transpile JavaScript using Babel
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },

    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // Test environment (node, jsdom, etc.)
    testEnvironment: 'node',

    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // Automatically reset mock state before every test
    resetMocks: true,
};
