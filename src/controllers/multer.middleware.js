import multer from "multer"; // multer is a middleware for handling multipart/form-data, which is primarily used for uploading files. It makes it easy to handle file uploads in Node.js applications. In this code, we are using multer to handle the uploading of video files to our server before they are uploaded to Cloudinary.


const storage = multer.diskStorage({ // diskStorage is a method provided by multer that allows us to specify the storage engine for uploaded files. In this case, we are using the disk storage engine, which saves the uploaded files to the local file system.
    destination: function (req,file,cb){
        cb(null, './public/temp') // cb is a callback function that takes an error and the destination path as arguments. In this case, we are passing null for the error and 'public/temp' as the destination path where the uploaded files will be stored temporarily before being uploaded to Cloudinary.
    },
    filename: function (req,file,cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Math.round(Math.random() * 1E9) is used to generate a random number between 0 and 1E9 to ensure uniqueness
        cb(null, file.originalname.split('.')[0] + '-' + uniqueSuffix + "-" + file.originalname.split('.')[1]) // cb is a callback function that takes an error and the filename as arguments. In this case, we are passing null for the error and a unique filename that consists of the original filename (without the extension), a unique suffix, and the original file extension.   
    }
})

export const upload = multer({ 
    storage, // storage is the storage engine we defined earlier that specifies where the uploaded files will be stored and how they will be named.
})

