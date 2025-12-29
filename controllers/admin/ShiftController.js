const Shift = require("../../models/admin/ShiftModel");

exports.createShift = async (req, res) => {
  try {
    const shift = new Shift(req.body);
    await shift.save();
    res.status(201).json({
      success: true,
      message: "Shift created successfully",
      shift,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllShift = async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.status(200).json({ success: true, message:"Shift fetched successfully", shifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    }
    res.status(200).json({ success: true, message:"Shift fetched successfully", shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    }

    res.status(200).json({
      success: true,
      message: "Shift updated successfully",
      shift,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Already created — make another shift name" });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    }
    res.status(200).json({
      success: true,
      message: "Shift deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
