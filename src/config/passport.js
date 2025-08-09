import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GithubStrategy } from 'passport-github2';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';

try {
  passport.serializeUser((user, next) => {
    next(null, user._id);
  });

  passport.deserializeUser(async (id, next) => {
    try {
      const user = await User.findById(id);
      if (user) next(null, user);
      else next(new ApiError(400, 'User not found'), null);
    } catch (error) {
      next(new ApiError(500, 'Internal error ' + error.message), null);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (_, __, profile, next) => {
        const user = await User.findOne({ email: profile._json.email });
        if (user) {
          // user is exists and check google loginType
          if (user.loginType !== 'GOOGLE')
            next(
              new ApiError(
                404,
                'You have previously registered using ' +
                  user.loginType?.toLowerCase() +
                  '. Please use the ' +
                  user.loginType?.toLowerCase() +
                  ' login option to access your account.'
              ),
              null
            );
          else next(null, user);
        } else {
          // create new user
          const createUser = await User.create({
            email: profile._json.email,
            password: profile._json.sub,
            avatar: profile._json.picture,
            username: profile._json.email?.split('@')[0],
            isEmailVerify: true,
            role: 'USER',
            loginType: 'GOOGLE',
          });
          if (createUser) next(null, createUser);
          else
            next(new ApiError(500, 'Error while registering the user'), null);
        }
      }
    )
  );
} catch (error) {
  console.error('PASSPORT ERROR: ', error.message);
}
