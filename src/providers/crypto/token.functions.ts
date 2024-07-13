import * as jwt from 'jsonwebtoken';
export const getExpiryDate = (token: string): number => {
  try {
    // Decode the token
    const decodedToken = jwt.decode(token) as jwt.JwtPayload;
    // Check if the token has an expiration claim and if it has expired
    if (decodedToken && decodedToken?.exp) {
      return decodedToken?.exp;
    }
    return -1;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return -1; // Assume the token is expired if there is an error decoding it
  }
};
