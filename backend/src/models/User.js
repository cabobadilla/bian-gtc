const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      apiUpdates: {
        type: Boolean,
        default: true
      }
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for user's API count
userSchema.virtual('apiCount', {
  ref: 'API',
  localField: '_id',
  foreignField: 'createdBy',
  count: true
});

// Method to get user's companies with details
userSchema.methods.getCompaniesWithDetails = async function() {
  await this.populate('companies');
  return this.companies;
};

// Method to check if user is admin of a company
userSchema.methods.isAdminOfCompany = async function(companyId) {
  const Company = mongoose.model('Company');
  const company = await Company.findById(companyId);
  return company && company.admins.includes(this._id);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 