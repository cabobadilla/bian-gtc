const mongoose = require('mongoose');

const apiVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true
  },
  openApiSpec: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  changelog: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const apiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: [
      'customer-management',
      'account-management', 
      'payment-processing',
      'lending',
      'risk-management',
      'compliance',
      'analytics',
      'other'
    ],
    default: 'other'
  },
  bianDomains: [{
    domain: {
      type: String,
      required: true
    },
    serviceOperations: [String]
  }],
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'deprecated'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'company', 'public'],
    default: 'private'
  },
  currentVersion: {
    type: String,
    default: '1.0.0'
  },
  versions: [apiVersionSchema],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    lastAccessed: {
      type: Date
    }
  },
  aiEnrichment: {
    isEnriched: {
      type: Boolean,
      default: false
    },
    enrichedAt: {
      type: Date
    },
    originalPrompt: {
      type: String
    },
    enrichmentVersion: {
      type: String,
      default: '1.0'
    }
  },
  collaboration: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowSuggestions: {
      type: Boolean,
      default: true
    },
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['viewer', 'editor', 'admin'],
        default: 'viewer'
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  baseReference: {
    type: {
      type: String,
      enum: ['bian', 'template', 'scratch'],
      default: 'scratch'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BIANReferenceAPI'
    },
    referenceName: {
      type: String
    },
    createdFromReference: {
      type: Date
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes
apiSchema.index({ company: 1, slug: 1 }, { unique: true });
apiSchema.index({ company: 1, status: 1 });
apiSchema.index({ createdBy: 1 });
apiSchema.index({ tags: 1 });
apiSchema.index({ 'bianDomains.domain': 1 });

// Virtual for current version spec
apiSchema.virtual('currentVersionSpec').get(function() {
  const currentVer = this.versions.find(v => v.version === this.currentVersion);
  return currentVer ? currentVer.openApiSpec : null;
});

// Method to add new version
apiSchema.methods.addVersion = function(version, openApiSpec, changelog, userId) {
  // Check if version already exists
  const existingVersion = this.versions.find(v => v.version === version);
  if (existingVersion) {
    throw new Error('Version already exists');
  }

  this.versions.push({
    version,
    openApiSpec,
    changelog,
    createdBy: userId,
    isActive: true
  });

  this.currentVersion = version;
  return this.save();
};

// Method to get version by number
apiSchema.methods.getVersion = function(version) {
  return this.versions.find(v => v.version === version);
};

// Method to check if user can edit
apiSchema.methods.canUserEdit = function(userId) {
  return this.createdBy.toString() === userId.toString() ||
         this.collaboration.collaborators.some(c => 
           c.user.toString() === userId.toString() && 
           ['editor', 'admin'].includes(c.role)
         );
};

// Method to increment view count
apiSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastAccessed = new Date();
  return this.save();
};

// Pre-save middleware to generate slug
apiSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Pre-save middleware to ensure first version
apiSchema.pre('save', function(next) {
  if (this.isNew && this.versions.length === 0) {
    this.versions.push({
      version: this.currentVersion,
      openApiSpec: {
        openapi: '3.0.3',
        info: {
          title: this.name,
          version: this.currentVersion,
          description: this.description || 'API generated with BIAN standards'
        },
        paths: {}
      },
      createdBy: this.createdBy,
      isActive: true
    });
  }
  next();
});

const API = mongoose.model('API', apiSchema);

module.exports = API; 