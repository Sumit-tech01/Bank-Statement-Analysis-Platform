import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const signToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

const sanitizeUser = (user) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    throw new ApiError(409, "Email already registered.");
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: "user",
  });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const passwordMatched = await user.comparePassword(password);

  if (!passwordMatched) {
    throw new ApiError(401, "Invalid email or password.");
  }

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
};
