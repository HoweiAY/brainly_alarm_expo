// query-string 7.x requires decode-uri-component as CommonJS, but every patched
// release (0.5.x) is ESM-only. Re-export its default export as CommonJS so the
// CJS caller gets a callable function.
const decodeUriComponent = require("decode-uri-component");

module.exports = decodeUriComponent.default ?? decodeUriComponent;
