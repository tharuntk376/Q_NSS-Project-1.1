const express = require("express");
const app = express();
const cors = require('cors');

const dotenv = require('dotenv');
const path = require('path');
const connectDatabase = require('./config/connectDatabase');
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });
  
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/admin/employee');
const talentRoutes = require('./routes/admin/talents');
const shiftRoutes = require('./routes/admin/shift_section');
const serviceRoutes = require('./routes/admin/Service');
const frequencyRoutes = require('./routes/admin/frequencyRoutes');
const propertytypeRoutes = require('./routes/admin/propertyTypeRoutes');
const companydetailsRoutes = require('./routes/admin/companyDetailsRoutes');
const jobRoutes = require("./routes/admin/jobRoutes");
const completedJobRoutes = require("./routes/admin/completedJobRoutes");
const privacyPolicy = require("./routes/admin/PrivacyPolicyRoutes");
const { send } = require("process");
require("dotenv").config();

connectDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://nss.tsitcloud.com",
      "https://tsitfilemanager.in",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use('/api/auth', authRoutes)
app.use('/api', employeeRoutes)
app.use('/api', talentRoutes)
app.use('/api', shiftRoutes)
app.use('/api', serviceRoutes)
app.use('/api', frequencyRoutes)
app.use('/api', propertytypeRoutes)
app.use('/api', companydetailsRoutes)
app.use('/api', jobRoutes)
app.use("/api", completedJobRoutes);
app.use("/api", privacyPolicy);

app.listen(process.env.PORT, (req,res) => {
    console.log(`Server started ${process.env.PORT} in ${process.env.NODE_ENV}`)
})
app.get("/", (req, res) => {
  res.send("👋 Hello! This message is coming from Node.js server");
});

