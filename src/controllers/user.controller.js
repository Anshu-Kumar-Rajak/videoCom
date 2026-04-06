import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccesstoken();
    const refreshToken = user.generateAccesstoken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res, next) => {
  const { username, fullName, email, password } = req.body;

  if (
    [username, fullName, email, password].some(
      (field) => !field || field?.trim() === ""
    ) // some() method is used to check if any of the fields are empty or contain only whitespace. If any field is invalid, it returns true and the condition is satisfied, throwing an ApiError with a 400 status code and a message indicating that all fields are required.
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }], // [email : email, username : username]
  });

  if (existedUser) {
    throw new ApiError(400, "User already exist with this email or username");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path; // optional chaining to safely access the avatar file path
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path; // optional chaining to safely access the cover image file path

  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadFileOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadFileOnCloudinary(coverImageLocalPath)
    : "";

  // const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    username,
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // Exclude password and refresh token from the response

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "Email and username are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }], // find a user that matches either the provided email or username using the $or operator in the query. This allows users to log in using either their email or username.
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { refreshToken, accessToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const options = {
    // options object is created to configure the behavior of the cookies that will be set in the response. It includes the following properties:

    httpOnly: true, // httpOnly flag is set to true to prevent client-side JavaScript from accessing the cookie, enhancing security against cross-site scripting (XSS) attacks.
    secure: true, // secure flag is set to true to ensure that the cookie is only sent over HTTPS connections, providing an additional layer of security by encrypting the data during transmission.
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User logged in successfully", {
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      refreshToken: null, // refreshToken field is set to null in the database for the authenticated user, effectively invalidating any existing refresh tokens and preventing further token refreshes until the user logs in again.
    },
    new: true, // new option is set to true to return the updated user document after the update operation is performed. This allows us to confirm that the refresh token has been successfully cleared from the user's record in the database.
  });

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, "User logged out successfully", {}));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }
  
  try {
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  
    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized request");
    }
  
    const user = await User.findById(decodedToken._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if (token !== user.refereshToken) {
      throw new ApiError(401, "refresh Token is expiried, please login again");
    }
  
    const { accessToken, refereshToken } = await user.generateAccessTokenAndRefreshToken(user._id);
  
    user.refreshToken = refereshToken;
    await user.save({ validateBeforeSave: false });
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refereshToken, options)
    .json(
      new ApiResponse(200, "Access token refreshed successfully", {
        accessToken,
        refereshToken,
      })
    );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
