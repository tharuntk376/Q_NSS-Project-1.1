const Talent = require("../../models/admin/Talent");

exports.createTalent = async (req, res) => {
  try {
    const talent = new Talent(req.body);
    await talent.save();
    res.status(201).json({
      success: true,
      message: "Talent created successfully",
      talent,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllTalents = async (req, res) => {
  try {
    const talents = await Talent.find();
    res.status(200).json({ success: true, message:"Talent fetched successfully", talents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTalentById = async (req, res) => {
  try {
    const talent = await Talent.findById(req.params.id);
    if (!talent) {
      return res
        .status(404)
        .json({ success: false, message: "Talent not found" });
    }
    res.status(200).json({ success: true, message:"Talent fetched successfully", talent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTalent = async (req, res) => {
  try {
    const talent = await Talent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!talent) {
      return res
        .status(404)
        .json({ success: false, message: "Talent not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Talent updated successfully", talent });
  } catch (error) {
    res.status(400).json({ success: false, message: "Already created — make another talent name" });
  }
};

exports.deleteTalent = async (req, res) => {
  try {
    const talent = await Talent.findByIdAndDelete(req.params.id);
    if (!talent) {
      return res
        .status(404)
        .json({ success: false, message: "Talent not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Talent deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
