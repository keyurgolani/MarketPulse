'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isErrorResponse = isErrorResponse;
exports.isApiResponse = isApiResponse;
exports.isPaginatedResponse = isPaginatedResponse;
function isErrorResponse(response) {
  return (
    response &&
    typeof response.error === 'string' &&
    typeof response.statusCode === 'number'
  );
}
function isApiResponse(response) {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data !== undefined
  );
}
function isPaginatedResponse(response) {
  return (
    response &&
    Array.isArray(response.data) &&
    response.pagination &&
    typeof response.pagination.page === 'number'
  );
}
//# sourceMappingURL=api.js.map
