const moment = require('moment');

exports.isFriday = (dateStr) => {
  // Check if date is Friday
  return moment(dateStr, 'YYYY-MM-DD').day() === 5;
};
