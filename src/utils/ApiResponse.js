export class ApiResponse {
  constructor(statusCode, result, message = 'Success') {
    this.statusCode = statusCode;
    this.result = result;
    this.message = message;
    this.success = statusCode < 400;
  }
}
