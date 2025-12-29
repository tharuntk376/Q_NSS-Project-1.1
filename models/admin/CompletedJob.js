const mongoose = require("mongoose");

const completedJobSchema = new mongoose.Schema(
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
    object: { type: mongoose.Schema.Types.ObjectId, required: true },
    areaName: { type: String, required: true },
    objectName: { type: String, required: true },
    shiftName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    shiftLabel: String,
    startTime: { type: Date },
    endTime: { type: Date },
    hoursWorked: { type: String },
    status: { type: String, enum: ["completed"], default: "completed" },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompletedJob", completedJobSchema);
