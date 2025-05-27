const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * RequestList Schema - Master database to keep list of requests
 *
 * This schema stores all request information including status, samples, and evaluation data.
 * It serves as the central repository for tracking laboratory testing requests.
 */
const RequestListSchema = new Schema(
  {
    // Core request identification
    requestNumber: {
      type: String,
      required: [true, 'Request number is required'],
      unique: true,
      trim: true,
      index: true
    },

    // Request status tracking
    requestStatus: {
      type: String,
      enum: ['draft', 'submitted', 'Pending Receive', 'in-progress', 'completed', 'rejected', 'terminated', 'cancelled'],
      default: 'draft',
      required: true,
      index: true
    },

    // Request details
    requestTitle: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    // Cost information
    useIoNumber: {
      type: Boolean,
      default: false,
      description: 'Whether to use IO number for this request'
    },
    ioCostCenter: {
      type: String,
      ref: 'Io',
      description: 'IO number reference for cost tracking'
    },
    requesterCostCenter: {
      type: String,
      description: 'Requester cost center if not using IO number'
    },

    // Priority settings
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
      required: true
    },
    urgentType: {
      type: String,
      description: 'Type of urgency if priority is urgent'
    },
    urgencyReason: {
      type: String,
      description: 'Justification for urgent request'
    },

    // Approval information
    approver: {
      name: {
        type: String,
        description: 'Full name of the approver'
      },
      email: {
        type: String,
        description: 'Email of the approver'
      }
    },

    // Document uploads
    urgentRequestDocument: {
      type: String,
      description: 'Path to uploaded urgent request memo (PDF/Word, max 10MB)'
    },

    // Sample and testing information (stored as JSON strings)
    jsonSampleList: {
      type: String,
      description: 'JSON string containing sample information'
    },
    jsonTestingList: {
      type: String,
      description: 'JSON string containing all testing list information'
    },

    // Results and evaluation
    datapool: {
      type: String,
      description: 'Path to testing results for this request'
    },
    returnSampleAddress: {
      type: String,
      description: 'Address for returning samples after testing'
    },

    // Evaluation information
    isEvaluated: {
      type: Boolean,
      default: false,
      description: 'Whether this request has been evaluated by the requester'
    },
    evaluationScore: {
      type: Number,
      min: 1,
      max: 5,
      description: 'Star rating from 1-5 given by the requester'
    },
    evaluationComment: {
      type: String,
      maxlength: [1000, 'Evaluation comment cannot exceed 1000 characters'],
      description: 'Comment provided by the requester during evaluation'
    },
    evaluationDate: {
      type: Date,
      description: 'Date when the evaluation was submitted'
    },

    // ASR project reference
    asrId: {
      type: String,
      description: 'Reference to ASR project if this is a sub-request'
    },
    isAsrRequest: {
      type: Boolean,
      default: false,
      description: 'Whether this request is part of an ASR project'
    },

    // Requester information
    requesterName: {
      type: String,
      required: true,
      description: 'Name of the person making the request'
    },
    requesterEmail: {
      type: String,
      required: true,
      ref: 'User',
      description: 'Email of the requester'
    },

    // On behalf information
    isOnBehalf: {
      type: Boolean,
      default: false,
      description: 'Whether this request is made on behalf of another person'
    },
    onBehalfOfName: {
      type: String,
      description: 'Name of the person on whose behalf the request is made'
    },
    onBehalfOfEmail: {
      type: String,
      description: 'Email of the person on whose behalf the request is made'
    },
    onBehalfOfCostCenter: {
      type: String,
      description: 'Cost center of the person on whose behalf the request is made'
    },

    // Support staff
    supportStaff: {
      type: String,
      description: 'Person from User database who supports this project'
    },

    // Important dates
    receiveDate: {
      type: Date,
      description: 'Date when this request was received by engineer'
    },
    completeDate: {
      type: Date,
      description: 'Date when this request was completed'
    },
    terminateDate: {
      type: Date,
      description: 'Date when this request was terminated'
    },
    cancelDate: {
      type: Date,
      description: 'Date when this request was cancelled'
    },

    // PPC member list
    ppcMemberList: {
      type: String,
      description: 'List of PPC members involved in this request'
    },

    // Tech sprint flag
    isTechsprint: {
      type: Boolean,
      default: false,
      description: 'Whether this request is part of a tech sprint'
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    collection: 'request_lists'
  }
);

// Add virtual for testing samples
RequestListSchema.virtual('testingSamples', {
  ref: 'TestingSampleList',
  localField: 'requestNumber',
  foreignField: 'requestNumber'
});

module.exports = mongoose.models.RequestList || mongoose.model('RequestList', RequestListSchema);