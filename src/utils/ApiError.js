class ApiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong",
        errors=[], 
        stack=""
    ){
        super(message); // Call the parent constructor to set the message property
        this.message = message; // Set the message property explicitly
        this.statusCode = statusCode;
        this.data=null;
        this.success=false;
        this.errors = errors;
        if(stack){
            this.stack = stack;
        }
        else{
            Error.captureStackTrace(this, this.constructor); // Error.captureStackTrace is used to create a stack trace for the error, excluding the constructor function from the trace/ The first argument is the error object (this), and the second argument is the constructor function (this.constructor) to exclude from the stack trace. This helps in providing a cleaner stack trace when the error is thrown.
        }
    }
}

export {ApiError}