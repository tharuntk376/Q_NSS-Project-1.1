const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, },

  mobileNumber: { type: Number, required: true, },

  email: { type: String, required: true, },

  address: { type: String, required: true,},

  role: { type: String, required: true,},

  gender: { type: String, required: true,},

  joiningDate: { type: String, required: true,},

  specialTalents: { type: [String], default: [], required: true, },

  profileimages: { type: String, required: true },

},

{ timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
