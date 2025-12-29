const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');

const objectSchema = new mongoose.Schema({

  objectName: { type: String, required: true },

  frequency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Frequency',
    required: true,
    autopopulate: true,
  },

  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    autopopulate: true,
  },

  serviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    autopopulate: true,
  },

  shiftName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true,
    autopopulate: true,
  },

  specialTalent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Talent',
    required: true,
    autopopulate: true,
  },

  property_multi_images: [
    {
      type: String,
    },
  ],

});

// Apply autopopulate plugin
objectSchema.plugin(autopopulate);

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  objects: {
    type: [objectSchema],
    autopopulate: { maxDepth: 1 }
  }
});

const companyDetailsSchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true, trim: true },

    mobile_number: { type: String, required: true, trim: true },

    email: { type: String, required: true, trim: true, lowercase: true },

    address: { type: String, required: true, trim: true },

    contractStartDate: { type: Date },

    contractEndDate: { type: Date },

    factoryName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PropertyType',
      autopopulate: true,
    },

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    document: { type: String },
    shiftTiming: {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },

    area: [areaSchema],

    property_images: [{ type: String }],

  },

  { timestamps: true }

);

companyDetailsSchema.plugin(autopopulate);

module.exports = mongoose.model('CompanyDetails', companyDetailsSchema);
