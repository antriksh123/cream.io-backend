const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User.js')
const mongoose = require('mongoose')
const passwordValidator = require('password-validator')
const emailValidator = require('email-validator')
const auth = require('../middleware/auth')

// Dot env
const dotenv = require('dotenv')
dotenv.config()

// Custom Password Specifications
// Username Schema
const usernameSchema = new passwordValidator()
usernameSchema.is().min(3).is().max(18).is().not().spaces()

// Password Schema
const passwordSchema = new passwordValidator()
passwordSchema.is().min(8).is().max(100).has().uppercase().has().lowercase().has().digits().is().not().spaces()

const userRouter = express.Router()

userRouter.post('/signup', async (req, res) => {
    const { username, email, password, passwordConfirmation } = req.body

    // Validation: all fields are filled
    if (!username || !email || !password || !passwordConfirmation) {
        return res.status(400).json({ 
            "msg": "Fill all the fields."
        })
    }

    // Validation: username is valid
    if (usernameSchema.validate(username, { list: true }).length !== 0) {
        return res.status(400).json({ 
            "msg": "Username is invalid."
        })
    }

    // Validation: email is valid
    if (!emailValidator.validate(email)) {
        return res.status(400).json({ 
            "msg": "Email is invalid."
        })
    }

    // Validation: password is valid
    if (passwordSchema.validate(password, { list: true }).length !== 0) {
        return res.status(400).json({ 
            "msg": "Password is invalid."
        })
    }

    // Validation: password is confirmed
    if (password !== passwordConfirmation) {
        return res.status(400).json({ 
            "msg": "Confirmation password needs to match the password."
        })
    }

    // Check for existing user with email
    const existingUserWithEmail = await User.findOne({ email })
    if (existingUserWithEmail)
        return res.status(400).json({ "msg": "A user already exists with this email." })

    // Check for existing user with username
    const existingUserWithUsername = await User.findOne({ username })
    if (existingUserWithUsername)
        return res.status(400).json({ "msg": "A user already exists with this username." })
    
    // Generating salt
    const salt = bcrypt.genSalt()
    .then(salt => {
        // Hashing password with bcrypt
        const hashedPassword = bcrypt.hash(password, salt)
        .then(hash => {
            const newUser = new User({
                username,
                email,
                password: hash
            })
            // Saving the user
            newUser.save()
            .then(savedUser => res.status(200).json({ savedUser }))
        })
        .catch(err => console.log(err))
    })
    .catch(err => console.log(err))
})

userRouter.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body

        // Validate
        if (!username || !password) {
            return res.status(400).json({ "msg": "Fill all the fields." })
        }

        const user = await User.findOne({ username })
        if (!user) {
            return res.status(400).json({ "msg": "No account is registered with this username" })
        }
    
        // Compare hashed password with plain text password
        const match = await bcrypt.compare(password, user.password)
    
        if (!match) {
            return res.status(400).json({ "msg": "Invalid credentials." })
        }
    
        // Create JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        return res.json({ token, user: { "id": user._id, "username": user.username, "email": user.email } })
    }
    catch (e) {
        console.log(e)
    }
})

userRouter.post("/isTokenValid", async (req, res) => {
    const token = req.headers["x-auth-token"]
    if (!token) return res.json(false)
    
    const verifiedToken = jwt.verify(token, process.env.JWT_SECRET)
    if (!verifiedToken) return res.json(false)
    
    const user = await User.findById(verifiedToken.id)
    if (!user) return res.json(false)

    return res.json(true)
})

// Getting one user
userRouter.get("/users/user", auth, async (req, res) => {
    const user = await User.findById(req.user)
    res.json({
        "username": user.username,
        "email": user.email,
        "id": user._id
    })
})

module.exports = userRouter