const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

async function authenticateUser(username, password) {
  try {
    const user = await User.findOne({ username });

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error('Invalid password');
    }

    return { _id: user._id, username: user.username, email: user.email };
  } catch (error) {
    throw error;
  }
}

function generateToken(user) {
  const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '1h' 
  });
  return token;
}

async function hashPassword(password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10); 
      return hashedPassword;
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

module.exports = {
  authenticateUser,
  generateToken,
  hashPassword
};
