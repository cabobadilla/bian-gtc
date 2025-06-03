const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  industry: {
    type: String,
    enum: [
      'banking',
      'fintech',
      'insurance',
      'payments',
      'cryptocurrency',
      'other'
    ],
    default: 'other'
  },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
    default: 'small'
  },
  country: {
    type: String,
    trim: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowPublicAPIs: {
      type: Boolean,
      default: false
    },
    enableAnalytics: {
      type: Boolean,
      default: true
    },
    apiVersioning: {
      type: String,
      enum: ['semantic', 'date', 'numeric'],
      default: 'semantic'
    },
    defaultBianVersion: {
      type: String,
      default: 'v12'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    expiresAt: {
      type: Date
    },
    limits: {
      maxAPIs: {
        type: Number,
        default: 5
      },
      maxMembers: {
        type: Number,
        default: 3
      },
      aiEnrichments: {
        type: Number,
        default: 10
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Remove duplicate indexes - keeping only essential ones
// companySchema.index({ slug: 1 }); // REMOVED - already unique: true
companySchema.index({ 'members.user': 1 }); // Keep this one for queries
companySchema.index({ admins: 1 }); // Keep this one for queries

// Virtual for API count
companySchema.virtual('apiCount', {
  ref: 'API',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Method to check if user is member
companySchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString()) ||
         this.admins.includes(userId);
};

// Method to get user role in company
companySchema.methods.getUserRole = function(userId) {
  if (this.admins.includes(userId)) {
    return 'admin';
  }
  
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add member
companySchema.methods.addMember = function(userId, role = 'viewer') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
};

// Pre-save middleware to generate slug
companySchema.pre('save', function(next) {
  const isDebug = process.env.DEBUG === 'ON';
  
  if (isDebug) {
    console.log('🔧 [COMPANY MODEL] Pre-save middleware triggered:', {
      name: this.name,
      isModified_name: this.isModified('name'),
      currentSlug: this.slug
    });
  }
  
  if (this.isModified('name')) {
    const newSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    this.slug = newSlug;
    
    if (isDebug) {
      console.log('✅ [COMPANY MODEL] Slug generated:', {
        originalName: this.name,
        generatedSlug: newSlug
      });
    }
  }
  
  next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company; 