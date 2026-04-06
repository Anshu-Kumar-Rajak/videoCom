import {Router} from 'express';
import {registerUser, loginUser, logoutUser, refreshAccessToken} from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import {verifyJWT} from '../middlewares/auth.middleware.js';

const userRouter = Router();

userRouter.route('/register').post(
    upload.fields([ //fields() method is used to specify that we are expecting multiple files with different field names. In this case, we are expecting two files: one with the field name "avatar" and another with the field name "coverImage". Each file can have a maximum count of 1, meaning only one file can be uploaded for each field.
        {
            name: "avatar", 
            maxCount: 1
        },
        {
            name: "coverImage", 
            maxCount: 1
        }
    ]),
    registerUser
);

userRouter.route('/login').post(loginUser);
userRouter.route('/logout').post(verifyJWT,logoutUser);
userRouter.route('/refresh-token').post(refreshAccessToken);

export default userRouter;