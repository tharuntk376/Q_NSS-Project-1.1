const mongoose = require("mongoose")


const connectDatabase = () => {
    mongoose.connect(process.env.DB_URL).then((con) => {
        console.log("Mongo DB connected host : " + con.connection.host)
    })
}

module.exports = connectDatabase

//DB_URL=mongodb://localhost:27017/Q-NSS
//DB_URL=mongodb+srv://sarantabsquareinfo_db_user:IT9sAJJhrYjUGvkk@cluster0.xuhy8g0.mongodb.net/QNSS?appName=Cluster0