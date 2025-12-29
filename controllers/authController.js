const Employee = require("../models/admin/Employee");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key_123";
const JWT_EXPIRES_IN = "1d";


// Generate JWT token
const generateToken = (employee) => {
  return jwt.sign(
    { id: employee._id, name: employee.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Register Employee
exports.register = async (req, res) => {
  try {
    const { name, email, mobileNumber, address, role, gender, joiningDate, specialTalents, profileimages
    } = req.body;

    if (!name || !email || !mobileNumber || !address || !role || !gender || !joiningDate || !specialTalents || !profileimages
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Array.isArray(specialTalents) || !Array.isArray(profileimages)) {
      return res.status(400).json({ message: "specialTalents and profileimages must be arrays" });
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const employee = await Employee.create({
      name, email, mobileNumber, address, role, gender, joiningDate, specialTalents, profileimages
    });

    const token = generateToken(employee);

    res.status(201).json({
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        mobileNumber: employee.mobileNumber,
        address: employee.address,
        role: employee.role,
        // jobCode: employee.jobCode,
        gender: employee.gender,
        joiningDate: employee.joiningDate,
        specialTalents: employee.specialTalents,
        profileimages: employee.profileimages
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login Employee using mobileNumber + OTP (123456)
exports.login = async (req, res) => {
  try {

    // defensive: ensure farmData exists
    const farmData = req.farmData || {};
    const mobileNumber = farmData.mobileNumber;
    const otp = farmData.otp;

    if (!mobileNumber || !otp) {
      return res.status(400).json({ message: "Mobile number and OTP are required" });
    }

    const employee = await Employee.findOne({ mobileNumber });
    if (!employee) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (otp !== "123456") {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate JWT token
    const token = generateToken(employee);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        mobileNumber: employee.mobileNumber,
        role: employee.role,
        // jobCode: employee.jobCode,
        specialTalents: employee.specialTalents,
        profileimages: employee.profileimages
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};