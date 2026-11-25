// jest.setup.js

const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom lacks the WHATWG stream / messaging globals that undici needs at import time
const { ReadableStream, WritableStream, TransformStream } = require("node:stream/web");
const { MessageChannel, MessagePort } = require("node:worker_threads");
const { Blob, File } = require("node:buffer");
Object.assign(global, { ReadableStream, WritableStream, TransformStream, MessageChannel, MessagePort });
if (!global.Blob) global.Blob = Blob;
if (!global.File && File) global.File = File;

// Enable Node 18+ fetch API for Jest
require("undici");

// Import testing library
import '@testing-library/jest-dom';

// Browser APIs used by animation/scroll-reveal components that jsdom does not implement
if (typeof window !== "undefined") {
  class MockObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  if (!window.IntersectionObserver) { window.IntersectionObserver = MockObserver; global.IntersectionObserver = MockObserver; }
  if (!window.ResizeObserver) { window.ResizeObserver = MockObserver; global.ResizeObserver = MockObserver; }
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    });
  }
}
