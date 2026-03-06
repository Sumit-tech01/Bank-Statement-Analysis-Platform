import { asyncHandler } from "../utils/async-handler.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});
