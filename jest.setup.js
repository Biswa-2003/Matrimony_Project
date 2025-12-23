// jest.setup.js

const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Enable Node 18+ fetch API for Jest
require("undici");

// Import testing library
import '@testing-library/jest-dom';
