import { useAuthContext } from "../context/AuthContext.jsx";

export const useAuth = () => {
  return useAuthContext();
};
