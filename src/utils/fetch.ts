// This file provides fetch API for Node.js environments
import nodeFetch from 'node-fetch';

// For Node.js < 18, we need to make fetch globally available 
if (!globalThis.fetch) {
  // @ts-ignore - TypeScript doesn't know we're adding fetch to globalThis
  globalThis.fetch = nodeFetch;
  // @ts-ignore
  globalThis.Headers = nodeFetch.Headers;
  // @ts-ignore
  globalThis.Request = nodeFetch.Request;
  // @ts-ignore
  globalThis.Response = nodeFetch.Response;
}

export default nodeFetch;
