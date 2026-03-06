import { asyncHandler } from "../utils/async-handler.js";
import { listUsers } from "../services/user.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const query = req.validated?.query || req.query;
  const data = await listUsers({
    page: Number(query.page || 1),
    limit: Number(query.limit || 20),
  });

  res.status(200).json({
    success: true,
    data,
  });
});
