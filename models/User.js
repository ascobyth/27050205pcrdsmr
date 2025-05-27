const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define Role enum equivalent
const Role = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  ATCManager: 'ATCManager',
  RequesterManager: 'RequesterManager',
  Requester: 'Requester',
  EngineerResearcher: 'EngineerResearcher',
  SeniorEngineerSeniorResearcher: 'SeniorEngineerSeniorResearcher',
  Technician: 'Technician',
  TechnicianAssistant: 'TechnicianAssistant'
};

// User schema definition
const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true
    },
    position: {
      type: String
    },
    division: {
      type: String
    },
    department: {
      type: String
    },
    costCenter: {
      type: String
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.Requester
    },
    isActive: {
      type: Boolean,
      default: true
    },
    capabilities: [{
      type: Schema.Types.ObjectId,
      ref: 'Capability'
    }],
    approvers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    onBehalfAccess: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Points system for evaluations
    points: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Points earned from evaluating requests'
    },

    // Score system - number of evaluations done by user
    score: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Number of evaluations done by this user'
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    collection: 'users'
  }
);

// Add virtual for requests
UserSchema.virtual('requests', {
  ref: 'Request',
  localField: 'email',
  foreignField: 'requesterEmail'
});

// Export the Role enum and User model
module.exports = {
  Role,
  User: mongoose.models.User || mongoose.model('User', UserSchema)
};
