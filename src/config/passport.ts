import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { ENV } from "./env";
import { User } from "../models/user.model";

passport.use(
  new GoogleStrategy(
    {
      clientID: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      callbackURL: ENV.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if email already registered normally
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link google account to existing user
            user.googleId = profile.id;
            user.isEmailVerified = true;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user from Google
        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email || "",
          isEmailVerified: true,
          role: "user",
        });

        return done(null, newUser);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;
