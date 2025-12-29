const PropertyType = require("../../models/admin/PropertyType");

exports.createPropertyType = async (req, res) => {
  try {
    const propertyType = new PropertyType(req.body);
    await propertyType.save();
    res.status(201).json({
      success: true,
      message: "Property Type created successfully",
      propertyType,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllPropertyTypes = async (req, res) => {
  try {
    const propertyTypes = await PropertyType.find();
    res.status(200).json({ success: true,message:"Property fetched successfully", propertyTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPropertyTypeById = async (req, res) => {
  try {
    const propertyType = await PropertyType.findById(req.params.id);
    if (!propertyType) {
      return res
        .status(404)
        .json({ success: false, message: "Property Type not found" });
    }
    res.status(200).json({ success: true,message:"Property fetched successfully", propertyType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePropertyType = async (req, res) => {
  try {
    const propertyType = await PropertyType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!propertyType) {
      return res
        .status(404)
        .json({ success: false, message: "Property Type not found" });
    }
    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      propertyType,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletePropertyType = async (req, res) => {
  try {
    const propertyType = await PropertyType.findByIdAndDelete(req.params.id);
    if (!propertyType) {
      return res
        .status(404)
        .json({ success: false, message: "Property Type not found" });
    }
    res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
