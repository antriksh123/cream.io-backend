const express = require('express')
const Call = require('../models/Call.js')

const callRouter = express.Router()

callRouter.post('/create-call', (req, res) => {
    const { adminId } = req.body
    const newCall = new Call({
        adminId
    })
    newCall.save()
    .then(savedCall => {
        return res.status(200).json({ savedCall })
    })
})

module.exports = callRouter