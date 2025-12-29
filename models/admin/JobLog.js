// models/admin/JobLog.js
const mongoose = require("mongoose");

const jobLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyDetails",
      required: true,
    },
    object: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    isStopped: {
      type: Boolean,
      default: false,
    },
    endTime: {
      type: Date,
    },
    hoursWorked: {
      type: String,
      default: "0h 0m",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobLog", jobLogSchema);
