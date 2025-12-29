const mongoose = require("mongoose");

const propertyTypeSchema = new mongoose.Schema(
    {
        property_type: {
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

module.exports = mongoose.model("PropertyType", propertyTypeSchema);
