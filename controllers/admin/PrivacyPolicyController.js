const PrivacyPolicy = require("../../models/admin/PrivacyPolicyModel");

exports.createPrivacyPolicy = async (req, res) => {
  try {
    const { privacy_policy } = req.body;

    const policy = await PrivacyPolicy.create({
      privacy_policy,
      privacy_policy_file: req.file ? req.file.path : null,
    });

    res.status(201).json({
      success: true,
      message: "Privacy policy created successfully",
      data: {
        ...policy.toObject(),
        privacy_policy_file: policy.privacy_policy_file
          ? `${req.protocol}://${req.get("host")}/${policy.privacy_policy_file}`
          : null,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPrivacyPolicies = async (req, res) => {
  try {
    const policies = await PrivacyPolicy.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: policies.map(policy => ({
        ...policy.toObject(),
        privacy_policy_file: policy.privacy_policy_file
          ? `${req.protocol}://${req.get("host")}/${policy.privacy_policy_file}`
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPrivacyPolicyById = async (req, res) => {
  try {
    const policy = await PrivacyPolicy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Privacy policy not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...policy.toObject(),
        privacy_policy_file: policy.privacy_policy_file
          ? `${req.protocol}://${req.get("host")}/${policy.privacy_policy_file}`
          : null,
      },
      message: "Privacy policy fetched successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.privacy_policy_file = req.file.path;
    }

    const policy = await PrivacyPolicy.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Privacy policy not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Privacy policy updated successfully",
      data: {
        ...policy.toObject(),
        privacy_policy_file: policy.privacy_policy_file
          ? `${req.protocol}://${req.get("host")}/${policy.privacy_policy_file}`
          : null,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePrivacyPolicy = async (req, res) => {
  try {
    const policy = await PrivacyPolicy.findByIdAndDelete(req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: "Privacy policy not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Privacy policy deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
