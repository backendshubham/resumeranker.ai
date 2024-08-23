const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  resumeJson: {
    type: Object,
    required: true
  },
  jd: {
    type: String,
    required: true
  },
  result: {
    type: Object,
    required: true,
  }
});

const Resume = mongoose.model('Resumes', resumeSchema);

module.exports = Resume;