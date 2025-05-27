const mongoose = require('mongoose');

const UserScoreSchema = new mongoose.Schema({
  // User identification
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    lowercase: true,
    trim: true,
    index: true,
    description: 'Email of the user who performed the evaluation'
  },

  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
    description: 'Name of the user'
  },

  // Score tracking
  totalEvaluations: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total number of evaluations performed by this user'
  },

  totalPoints: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total points earned from evaluations (sum of all star ratings)'
  },

  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    description: 'Average rating given by this user (totalPoints / totalEvaluations)'
  },

  // Last evaluation tracking
  lastEvaluationDate: {
    type: Date,
    description: 'Date of the last evaluation performed'
  },

  lastEvaluatedRequestId: {
    type: String,
    description: 'ID of the last request evaluated'
  },

  // Evaluation history (optional - for detailed tracking)
  evaluationHistory: [{
    requestId: {
      type: String,
      required: true,
      description: 'Request number that was evaluated'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      description: 'Star rating given (1-5)'
    },
    comment: {
      type: String,
      maxlength: 1000,
      description: 'Comment provided during evaluation'
    },
    evaluationDate: {
      type: Date,
      default: Date.now,
      description: 'Date when this evaluation was performed'
    }
  }]
}, {
  timestamps: true,
  collection: 'userscores'
});

// Indexes for better performance
UserScoreSchema.index({ userEmail: 1 }, { unique: true });
UserScoreSchema.index({ totalEvaluations: -1 });
UserScoreSchema.index({ averageRating: -1 });
UserScoreSchema.index({ lastEvaluationDate: -1 });

// Virtual for score (total evaluations count)
UserScoreSchema.virtual('score').get(function() {
  return this.totalEvaluations;
});

// Method to add new evaluation
UserScoreSchema.methods.addEvaluation = function(requestId, rating, comment = '') {
  // Check if this request was already evaluated by this user
  const existingEvaluation = this.evaluationHistory.find(evaluation => evaluation.requestId === requestId);

  if (existingEvaluation) {
    // Update existing evaluation
    existingEvaluation.rating = rating;
    existingEvaluation.comment = comment;
    existingEvaluation.evaluationDate = new Date();

    // Recalculate totals
    this.totalPoints = this.evaluationHistory.reduce((sum, evaluation) => sum + evaluation.rating, 0);
    this.averageRating = Math.round((this.totalPoints / this.totalEvaluations) * 100) / 100;
  } else {
    // Add new evaluation to history
    this.evaluationHistory.push({
      requestId,
      rating,
      comment,
      evaluationDate: new Date()
    });

    // Update totals for new evaluation
    this.totalEvaluations += 1;
    this.totalPoints += rating;
    this.averageRating = Math.round((this.totalPoints / this.totalEvaluations) * 100) / 100;
  }

  // Update last evaluation info
  this.lastEvaluationDate = new Date();
  this.lastEvaluatedRequestId = requestId;

  return this.save();
};

// Static method to get or create user score
UserScoreSchema.statics.getOrCreateUserScore = async function(userEmail, userName) {
  let userScore = await this.findOne({ userEmail });

  if (!userScore) {
    userScore = new this({
      userEmail,
      userName,
      totalEvaluations: 0,
      totalPoints: 0,
      averageRating: 0
    });
    await userScore.save();
  }

  return userScore;
};

// Static method to get user ranking
UserScoreSchema.statics.getUserRanking = async function(userEmail) {
  const userScore = await this.findOne({ userEmail });
  if (!userScore) return { rank: 0, total: 0 };

  const higherScores = await this.countDocuments({
    totalEvaluations: { $gt: userScore.totalEvaluations }
  });

  const totalUsers = await this.countDocuments({});

  return {
    rank: higherScores + 1,
    total: totalUsers,
    score: userScore.totalEvaluations
  };
};

module.exports = mongoose.models.UserScore || mongoose.model('UserScore', UserScoreSchema);
