// 1st Method
// const asyncHandler = (fn)=> async (req,res,next)=> {
//     try{
//         await fn(req,res,next);
//     }
//     catch(error){
//         next(error);
//     }
// }

// 2nd Method
const asyncHandler = (fn)=> (req,res,next)=>{
    Promise.resolve(fn(req,res,next)).catch((err)=>next(err));
}

export default asyncHandler;