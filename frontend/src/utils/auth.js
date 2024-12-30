import jwt_decode from "jwt-decode";

export const getAdminIdFromToken = () => {
  const token = localStorage.getItem("authToken");
  if (token) {
    const decoded = jwt_decode(token); // Decode the JWT token
    return decoded.id; // Use the correct field (`id`) from the payload
  }
  return null;
};
