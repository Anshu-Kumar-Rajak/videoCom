import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
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
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      //new: true, // new option is set to true to return the updated user document after the update operation is performed. This allows us to confirm that the refresh token has been successfully cleared from the user's record in the database.

      returnDocument: "after", // returnDocument option is set to "after" to specify that the updated document should be returned after the update operation is completed. This is an alternative to using new: true and serves the same purpose of returning the updated user document with the refresh token cleared.
    }
  );

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

    const { accessToken, refereshToken } =
      await user.generateAccessTokenAndRefreshToken(user._id);

    user.refreshToken = refereshToken;
    await user.save({ validateBeforeSave: false });
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
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

const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const ispasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!ispasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }
  user.password = req.body.password;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "Password changed successfully", {}));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Current user retrieved successfully", req.user)
    );
});

const updateProfile = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "User profile updated successfully", user));
});

const updateAvatar = asyncHandler(async (req, res, next) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  const avatar = await uploadFileOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar uploaded successfully", user));
});

const updateCoverImage = asyncHandler(async (req, res, next) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is required");
  }

  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(500, "Error while uploading cover image");
  }

  const user = await User.findByIdAndDelete(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cover image uploaded successfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username,
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribeTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribeToCount: {
          $size: "$subscribeTo",
        },
        isSubscrribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        createdAt: 1,
        subscribersCount: 1,
        subscribeToCount: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Channel profile retrieved successfully", channel[0])
    );
});

const getWatchHistory = asyncHandler(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), //req.user._id is usually a string, while MongoDB stores _id as an ObjectId. In aggregation ($match), there is no automatic type casting, so we convert it using: new mongoose.Types.ObjectId(req.user._id)
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    email: 1,
                    fullName: 1,
                    avatar: 1,
                    coverImage: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user.length) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history retrieved successfully",
        user[0].watchHistory
      )
    );
});

// const addToWatchHistory = asyncHandler(async (req, res, next) => {
//   const { videoId } = req.body;

//   if (!videoId?.trim()) {
//     throw new ApiError(400, "Video ID is required");
//   }

//   // Validate if the video exists
//   const video = await Video.findById(videoId);
//   if (!video) {
//     throw new ApiError(404, "Video not found");
//   }

//   // Add video ID to watch history using $addToSet to prevent duplicates
//   const user = await User.findByIdAndUpdate(
//     req.user._id,
//     {
//       $addToSet: {
//         watchHistory: videoId,
//       },
//     },
//     { new: true }
//   ).select("-password -refreshToken");

//   if (!user) {
//     throw new ApiError(404, "User not found");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, "Video added to watch history successfully", user)
//     );
// });

// const addToWatchHistory = asyncHandler(async (req, res, next) => {
//   const { videoId } = req.body;

//   // ✅ Validate input
//   if (!videoId) {
//     throw new ApiError(400, "Video ID is required");
//   }

//   // ✅ Validate ObjectId
//   if (!mongoose.Types.ObjectId.isValid(videoId)) {
//     throw new ApiError(400, "Invalid video ID");
//   }

//   // ✅ Check if video exists
//   const video = await Video.findById(videoId);
//   if (!video) {
//     throw new ApiError(404, "Video not found");
//   }

//   // 🔥 Step 1: Remove if already exists (avoid duplicates)
//   await User.findByIdAndUpdate(req.user._id, {
//     $pull: { watchHistory: videoId }
//   });

//   // 🔥 Step 2: Add to top (latest first)
//   const user = await User.findByIdAndUpdate(
//     req.user._id,
//     {
//       $push: {
//         watchHistory: {
//           $each: [videoId],
//           $position: 0
//         }
//       }
//     },
//     {
//       returnDocument: "after"
//     }
//   ).select("-password -refreshToken");

//   // ✅ Check user exists
//   if (!user) {
//     throw new ApiError(404, "User not found");
//   }

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       "Video added to watch history successfully",
//       user
//     )
//   );
// });


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateProfile,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
