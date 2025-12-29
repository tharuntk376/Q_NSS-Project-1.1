const Employee = require('../../models/admin/Employee');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_123';
const JWT_EXPIRES_IN = '1d';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/employees/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const fileTypes = /jpeg|jpg|png/;
    const mimeType = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

const generateToken = (employee) => {
  return jwt.sign(
    { id: employee._id, name: employee.name, email: employee.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

exports.createEmployee = [
  upload.single('profileimages'),
  async (req, res) => {
    try {
      const employeeData = req.body;
      if (req.file) {
        employeeData.profileimages = `/uploads/employees/${req.file.filename}`;
      }

      if (employeeData.specialTalents) {
        try {
          const parsed = JSON.parse(employeeData.specialTalents);
          if (Array.isArray(parsed)) {
            employeeData.specialTalents = parsed.map(t => t.trim());
          }
        } catch (err) {
          employeeData.specialTalents = employeeData.specialTalents
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        }
      } else {
        employeeData.specialTalents = [];
      }

      const employee = new Employee(employeeData);
      await employee.save();

      res.status(201).json({ success: true, message: 'Employee created successfully', employee });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
];

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({ success: true,message: 'Employee fetched Successfully', employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, message: 'Employee fetched successfully', employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEmployee = [
  upload.single('image'),
  async (req, res) => {
    try {
      const updatedData = req.body;

      if (req.file) {
        updatedData.image = `/uploads/employees/${req.file.filename}`;
      }

      const employee = await Employee.findByIdAndUpdate(req.params.id, updatedData, { new: true });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      res.status(200).json({ success: true, message: 'Employee updated successfully', employee });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
];

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
