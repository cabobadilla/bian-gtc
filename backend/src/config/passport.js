const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://bian-api-backend.onrender.com/api/auth/google/callback'
    : 'http://localhost:10000/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  const isDebug = process.env.DEBUG === 'ON' || process.env.NODE_ENV === 'development';
  
  try {
    if (isDebug) {
      console.log('=== GOOGLE STRATEGY DEBUG ===');
      console.log('Profile ID:', profile.id);
      console.log('Profile email:', profile.emails?.[0]?.value);
      console.log('Profile name:', profile.displayName);
      console.log('Access token length:', accessToken?.length);
      console.log('MongoDB connection state:', require('mongoose').connection.readyState);
    }

    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      if (isDebug) {
        console.log('Existing user found:', user._id);
      }
      
      // Update user information
      user.name = profile.displayName;
      user.email = profile.emails[0].value;
      user.avatar = profile.photos[0].value;
      user.lastLogin = new Date();
      await user.save();
      
      if (isDebug) {
        console.log('User updated successfully');
      }
      
      return done(null, user);
    }

    if (isDebug) {
      console.log('Creating new user...');
    }

    // Create new user
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
      role: 'user',
      lastLogin: new Date()
    });

    await user.save();
    
    if (isDebug) {
      console.log('New user created:', user._id);
    }
    
    done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      mongoState: require('mongoose').connection.readyState,
      profile: profile ? {
        id: profile.id,
        email: profile.emails?.[0]?.value
      } : 'No profile'
    });
    done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport; 