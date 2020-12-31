const mongoose = require('mongoose')

const schema = mongoose.Schema

const callSchema = new schema({
    adminId: {
        type: String
    }
})

const Call = mongoose.model('Call', callSchema)
module.exports = Call