const mongoose = require('mongoose');

const bianReferenceAPISchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  descriptionES: {
    type: String,
    trim: true
  },
  serviceDomain: {
    type: String,
    required: true,
    index: true
  },
  serviceOperations: [{
    name: String,
    description: String,
    descriptionES: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    path: String
  }],
  functionalPattern: {
    type: String,
    enum: [
      'Service Domain',
      'Control Record',
      'Operational Control',
      'Analytical Control',
      'Support Control'
    ]
  },
  bianVersion: {
    type: String,
    default: 'v12.0'
  },
  openApiSpec: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  tags: [String],
  businessCapabilities: [String],
  dataEntities: [String],
  useCases: [{
    title: String,
    description: String,
    descriptionES: String,
    example: String
  }],
  relatedDomains: [String],
  complexity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  popularity: {
    type: Number,
    default: 0
  },
  searchKeywords: [String],
  metadata: {
    category: String,
    industry: [String],
    compliance: [String],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Text search index
bianReferenceAPISchema.index({
  name: 'text',
  description: 'text',
  searchKeywords: 'text',
  'serviceOperations.name': 'text',
  'serviceOperations.description': 'text'
});

// Compound indexes for efficient queries
bianReferenceAPISchema.index({ serviceDomain: 1, isActive: 1 });
bianReferenceAPISchema.index({ functionalPattern: 1, complexity: 1 });
bianReferenceAPISchema.index({ popularity: -1, isActive: 1 });

// Instance methods
bianReferenceAPISchema.methods.getEnrichedDescription = function(language = 'en') {
  return language === 'es' && this.descriptionES ? this.descriptionES : this.description;
};

bianReferenceAPISchema.methods.incrementPopularity = function() {
  this.popularity += 1;
  return this.save();
};

// Static methods
bianReferenceAPISchema.statics.searchByKeyword = function(keyword, options = {}) {
  const {
    serviceDomain,
    complexity,
    limit = 20,
    sort = 'popularity'
  } = options;

  const query = {
    $text: { $search: keyword },
    isActive: true
  };

  if (serviceDomain) query.serviceDomain = serviceDomain;
  if (complexity) query.complexity = complexity;

  const sortOptions = {};
  if (sort === 'popularity') {
    sortOptions.popularity = -1;
  } else if (sort === 'relevance') {
    sortOptions.score = { $meta: 'textScore' };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort(sortOptions)
    .limit(limit);
};

bianReferenceAPISchema.statics.findByServiceDomain = function(domain) {
  return this.find({ 
    serviceDomain: domain, 
    isActive: true 
  }).sort({ popularity: -1 });
};

bianReferenceAPISchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ popularity: -1 })
    .limit(limit);
};

module.exports = mongoose.model('BIANReferenceAPI', bianReferenceAPISchema); 