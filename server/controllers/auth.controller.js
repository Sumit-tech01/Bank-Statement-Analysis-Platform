import { registerUser, loginUser } from "../services/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const register = asyncHandler(async (req, res) => {
  const payload = req.validated?.body || req.body;
  const result = await registerUser(payload);

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const payload = req.validated?.body || req.body;
  const result = await loginUser(payload);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});
