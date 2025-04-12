//utils/handleJwt.js

const jwt = require("jsonwebtoken");
const getProperties = require("../utils/handlePropertiesEngine")
const propertiesKey = getProperties()
const JWT_SECRET = process.env.JWT_SECRET

const tokenSign = (user) => {
    const sign = jwt.sign(
        {
            //_id: user._id,
            [propertiesKey.id]: user[propertiesKey.id],
            //role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: "1d",
        }
    )
    return sign
}

const verifyToken = (tokenJwt) => {
    try{
        return jwt.verify(tokenJwt, JWT_SECRET)
    }
    catch(err){
        console.log(err)
    }

}

module.exports = { tokenSign, verifyToken }
