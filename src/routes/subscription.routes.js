import { Router } from "express";
import {getUserChannelSubscribers, getSubscribedChannels} from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.route("/getSubscribers/:channelId").get(getUserChannelSubscribers);
subscriptionRouter.route("/getSubscribers/:channelId").get(getSubscribedChannels);

export default subscriptionRouter;