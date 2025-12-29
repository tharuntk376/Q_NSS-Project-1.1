const mongoose = require("mongoose");

const frequencySchema = new mongoose.Schema(
  {
    frequency_type: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Frequency", frequencySchema);
