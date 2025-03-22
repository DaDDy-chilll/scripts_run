const mongoose = require('mongoose');
const membershipStatusPlugin = require('../plugins/membership.plugin');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const { PACKAGE_STATUS } = require('../constants/app.constants');

const PatientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    hn: {
      type: Number,
      unique: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    allergies: {
      type: [String],
    },
    weight: {
      value: {
        type: Number, // in kg
      },
      unit: {
        type: String, // in kg
      },
    },
    height: {
      value: {
        type: Number, // in cm
      },
      unit: {
        type: String, // in cm
      },
    },
    anthropometry_date_for_weight: {
      type: Date, // date measured weight
    },
    anthropometry_date_for_height: {
      type: Date, // date measured height
    },
    past_diagnosis: {
      type: String,
    },
    past_history: {
      type: String,
    },
    consultant: {
      type: String,
    },
    caretaker: {
      type: String,
    },
    caretaker_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Caretaker',
    },
    contact_numbers: {
      type: [String],
      required: true,
    },
    // determine based on sale data
    last_customer_type: {
      type: String,
    },
    // determine based on sale data
    last_purchased_date: {
      type: Date,
    },
    use_nw_hn: {
      type: Boolean,
      default: false,
    },
    dob: {
      type: Date,
      required: true,
    },
    expiration_date: {
      type: Date,
    },
    address: {
      sr: {
        p_code: String,
        name: String,
      },
      township: {
        p_code: String,
        name: String,
      },
    },
    g6pd: {
      type: Boolean,
    },
    imageUrls: [
      {
        imageUrl: String,
      },
    ],
    avatar: {
      url: String,
      key: String,
    },
    is_app_user: {
      type: Boolean,
      default: false,
    },
    app_user: {
      type: mongoose.Types.ObjectId,
      ref: 'AppUser',
    },
    symptoms: {
      type: Array,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

PatientSchema.plugin(membershipStatusPlugin);
PatientSchema.plugin(mongooseLeanVirtuals);

PatientSchema.virtual('last_subscription', {
  ref: 'PackageSubscription',
  localField: '_id',
  foreignField: 'child',
  options: { sort: { createdAt: -1 } },
  justOne: true,
});

module.exports = mongoose.model('Patient', PatientSchema);
