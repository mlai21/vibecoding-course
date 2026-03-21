export class HttpError extends Error {
  constructor(status, message, details = null, code = 'HTTP_ERROR') {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export function badRequest(message, details = null) {
  return new HttpError(400, message, details, 'BAD_REQUEST');
}

export function notFound(message = 'Resource not found') {
  return new HttpError(404, message, null, 'NOT_FOUND');
}
