const mongoose = require("mongoose");

const PrivacyPolicySchema = new mongoose.Schema(
  {
    privacy_policy: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    privacy_policy_file: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          return /\.(pdf|doc|docx|txt)$/i.test(value);
        },
        message:
          "Only PDF, Word (.doc, .docx), and TXT files are allowed",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PrivacyPolicy", PrivacyPolicySchema);
