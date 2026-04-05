import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

export const verifyJWT = asyncHandler(async(req, res, next) =>{
    const token = req.cookies?.accessToken || req.headers('Authorization')?.replace('Bearer ', ''); // We are trying to retrieve the JWT token from either the cookies (accessToken) or the Authorization header (Bearer token). The optional chaining operator (?.) is used to safely access the properties without throwing an error if they are undefined.

    if(!token){
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // We are using the jwt.verify() method to verify the token using the secret key stored in the environment variable ACCESS_TOKEN_SECRET. If the token is valid, it will return the decoded token payload.

    if(!decodedToken){
        throw new ApiError(401, "Unauthorized request")
    }

    const user = await User.findById(decodedToken.userId?.select("-password -refreshToken")); // We are querying the database to find the user associated with the decoded token's userId. The select() method is used to exclude the password and refreshToken fields from the returned user object for security reasons.

    if(!user){
        throw new ApiError(401, "Unauthorized request")
    }

    req.user = user;
    next();
})