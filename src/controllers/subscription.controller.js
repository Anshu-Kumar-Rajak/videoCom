import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getUserChannelSubscribers = asyncHandler(async (req, res, next) => {
  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID format");
  }

  // Fetch the channel (user) to verify it exists
  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Get all subscribers for this channel with aggregation
  const subscriberList = await Subscription.aggregate(
    [
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      // {
      //   $addFields: {
      //     subscriber: { $arrayElemAt: ["$subscriber", 0] },
      //   },
      // },
      // {
      //   $replaceRoot: { newRoot: "$subscriber" }, // $replaceRoot replaces the existing document with a new one. [field1, subscriber:{name, username, email}] is converted into [{name, username, email}]
      // }

      // Another method to get data in simple form

      {
        $unwind: "$subscriber",
      },
      {
        $project: {
          _id: 0,
          username: "$subscriber.username",
          fullName: "$subscriber.fullName",
          avatar: "$subscriber.avatar",
        },
      },
    ],
    { explain: true }
  ); // to be remove

  return res.status(200).json(
    new ApiResponse(200, "Subscribers fetched successfully", {
      subscriberList,
    })
  );
});

const getSubscribedChannels = asyncHandler(async (req, res, next) => {
  const { subscriberId } = req.params;

  if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "channel not found");
  }


  const subscribedList = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelSubscribed",
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channelSubscribed",
    },
    {
      $project: {
        username: "$channelSubscribed.username",
        fullName: "$channelSubscribed.fullName",
        avatar: "$channelSubscribed.avatar",
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, "subscribed channel is fetched successfully", {subscribedList})
  )


});

const toggleSubscription = asyncHandler(async(req,res,next)=>{
  const {channelId} = req.params;
  
})

export { getUserChannelSubscribers, getSubscribedChannels };
