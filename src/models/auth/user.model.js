import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 50,
        },
        email: {
            type: String,
            lowercase: true,
            required: true,
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 5,
            trim: true,
        },
        role: {
            type: String,
            enum: ['customer', 'admin', 'seller'],
            default: 'customer',
            required: [true, 'Role is required'],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        favorite: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        phoneNumber: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
            default: 'https://avatar.iran.liara.run/public',
        }, // cloudinary url
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        loginType: {
            type: String,
            enum: ['GOOGLE', 'GITHUB', 'EMAIL_PASSWORD'],
            default: 'EMAIL_PASSWORD',
        },
        isEmailVerify: {
            type: Boolean,
            default: false,
        },
        refreshToken: String,
        forgotPasswordToken: String,
        forgotPasswordExpiry: Date,
        emailVerificationToken: String,
        emailVerificationExpiry: Date,
    },
    { timestamps: true }
);

// Pre-save middleware to hash the password before saving it to the database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare the provided password with the stored hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate an access token on short time for the user
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            role: this.role,
        },
        process.env.SECRET_TOKEN,
        {
            expiresIn: '1d',
        }
    );
};

// Method to generate a refresh token on long time for the user
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ _id: this._id }, process.env.SECRET_TOKEN, {
        expiresIn: '7d',
    });
};

//  Method responsible for generating tokens for email verification, password reset etc.
userSchema.methods.generateTemporaryToken = async () => {
    const unHashedToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto
        .createHash('sha256')
        .update(unHashedToken)
        .digest('hex');
    const tokenExpiry = Date.now() + 20 * 60 * 1000; // 20 minutes

    return (hashedToken, tokenExpiry, unHashedToken);
};

export const User = mongoose.model('User', userSchema);
