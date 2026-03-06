import { ApiError } from "../utils/api-error.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      return next(
        new ApiError(400, "Validation failed.", parsed.error.flatten())
      );
    }

    req.validated = parsed.data;
    return next();
  };
};
