const authService = require('../services/authService');
const { sendUnauthorizedResponse } = require('../utils/responseHandler');

async function authMiddleware(req, res, next) {
  const { username, password } = req.body;

  try {
    const user = await authService.authenticateUser(username, password);
    const token = authService.generateToken(user);
    req.user = user; 
    req.token = token;
    next();
  } catch (error) {
    return sendUnauthorizedResponse(res, error.message);
  }
}

module.exports = authMiddleware;
