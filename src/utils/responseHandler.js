function sendResponse(res, statusCode, message, data = null) {
    return res.status(statusCode).json({ message, data });
}

function sendSuccessResponse(res, message, data = null) {
    return res.status(200).json({ message, data });
}

function sendBadRequestError(res, message = 'Bad request') {
    return sendResponse(res, 400, message);
}

function sendUnauthorizedResponse(res, message = 'Unauthorized') {
    return sendResponse(res, 401, message);
}
  
  module.exports = {
    sendResponse,
    sendSuccessResponse,
    sendBadRequestError,
    sendUnauthorizedResponse
  };
  