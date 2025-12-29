const Frequency = require("../../models/admin/Frequency");

exports.createFrequency = async (req, res) => {
  try {
    const frequency = new Frequency(req.body);
    await frequency.save();
    res.status(201).json({
      success: true,
      message: "Frequency created successfully",
      frequency,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllFrequencies = async (req, res) => {
  try {
    const frequencies = await Frequency.find();
    res.status(200).json({ success: true,message:"Frequancy fetched successfully", frequencies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFrequencyById = async (req, res) => {
  try {
    const frequency = await Frequency.findById(req.params.id);
    if (!frequency) {
      return res
        .status(404)
        .json({ success: false, message: "Frequency not found" });
    }
    res.status(200).json({ success: true,message:"Frequancy fetched successfully", frequency });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFrequency = async (req, res) => {
  try {
    const frequency = await Frequency.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!frequency) {
      return res
        .status(404)
        .json({ success: false, message: "Frequency not found" });
    }
    res.status(200).json({
      success: true,
      message: "Frequency updated successfully",
      frequency,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteFrequency = async (req, res) => {
  try {
    const frequency = await Frequency.findByIdAndDelete(req.params.id);
    if (!frequency) {
      return res
        .status(404)
        .json({ success: false, message: "Frequency not found" });
    }
    res.status(200).json({
      success: true,
      message: "Frequency deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
