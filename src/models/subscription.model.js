import mongoose, { Schema } from "mongoose";
/**
 * Subscription Schema
 * -------------------
 * This schema represents a relationship where one user subscribes to another user (channel).
 * It is similar to platforms like YouTube where users can subscribe to channels.
 */
const subscriptionSchema = new Schema(
  {
    /**
     * The user who is subscribing
     * (Follower / Subscriber)
    */
    subscriber: {                       
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    /**
     * The user (channel) being subscribed to
     * (Creator / Channel Owner)
     * Jis user ko subscribe kiya gaya hai
    */
    channel: {
      type: Schema.Types.ObjectId,      
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
