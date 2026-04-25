const mongoose = require('mongoose');

// mongoose throws if you query with a non-ObjectId string like "demo-001"
// so I check upfront and return null for those cases
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// controllers call this and bail early if null — keeps queries clean
function safeUserId(id) {
  return isValidObjectId(id) ? id : null;
}

module.exports = { isValidObjectId, safeUserId };
