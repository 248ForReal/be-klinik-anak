const response = (status_code, data, message, res) => {
    res.status(status_code).json({
        ResponseData:{
        status_code: status_code,
        data,
        message,}
    })
}

module.exports = response; 