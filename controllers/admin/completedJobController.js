const mongoose = require("mongoose");
const JobLog = require("../../models/admin/JobLog");
const CompletedJob = require("../../models/admin/CompletedJob");
const CompanyDetails = require("../../models/admin/Company_details");

exports.getCompletedJobsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const {
      fromDate,
      toDate,
      today,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const filter = { employee: employeeId };

    if (today === "true") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      filter.createdAt = { $gte: start, $lte: end };
    }

    else if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const completedJobs = await CompletedJob.find(filter)
      .populate("employee")
      .populate({
        path: "company",
        select:
          "company_name mobile_number email address contractStartDate contractEndDate",
        options: { autopopulate: false },
      })
      .sort({ [sortBy]: sortOrder });
    const groupedMap = new Map();

    completedJobs.forEach(job => {
      const area = job.areaName || "Unknown Area";

      if (!groupedMap.has(area)) {
        groupedMap.set(area, []);
      }
      groupedMap.get(area).push(job);
    });
    const groupedData = Array.from(groupedMap.entries()).map(
      ([areaName, jobs]) => ({
        areaName,
        totalJobs: jobs.length,
        jobs,
      })
    );
    const skip = (page - 1) * limit;
    const paginatedData = groupedData.slice(skip, skip + Number(limit));

    return res.json({
      success: true,
      message: "Completed jobs grouped by areaName",
      totalAreas: groupedData.length,
      page: Number(page),
      totalPages: Math.ceil(groupedData.length / limit),
      data: paginatedData,
    });
  } catch (error) {
    console.error("Get Completed Jobs By Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


exports.getAllCompletedJobs = async (req, res) => {
  try {
    const completedJobs = await CompletedJob.find()
      .populate("employee")
      .populate({
        path: "company",
        select:
          "company_name mobile_number email address contractStartDate contractEndDate",
        options: { autopopulate: false },
      })
      .sort({ createdAt: -1 });

    res.json(completedJobs);
  } catch (error) {
    console.error("Get All Completed Jobs Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};



// exports.getAllCompletedJobs = async (req, res) => {
//   try {
//     const completedJobs = await CompletedJob.find()
//       .populate("employee")
//       .populate("company")
//       .sort({ createdAt: -1 });

//     res.json(completedJobs);
//   } catch (error) {
//     console.error("Get All Completed Jobs Error:", error);
//     res.status(500).json({ error: "Server Error" });
//   }
// };


// exports.getCompletedJobsByEmployee = async (req, res) => {
//   try {
//     const { employeeId } = req.params;

//     const {
//       fromDate,
//       toDate,
//       today,
//       sortBy = "createdAt",
//       order = "desc",
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const filter = { employee: employeeId };

//     if (today === "true") {
//       const start = new Date();
//       start.setHours(0, 0, 0, 0);

//       const end = new Date();
//       end.setHours(23, 59, 59, 999);

//       filter.createdAt = { $gte: start, $lte: end };
//     }
  
//     else if (fromDate || toDate) {
//       filter.createdAt = {};
//       if (fromDate) filter.createdAt.$gte = new Date(fromDate);
//       if (toDate) filter.createdAt.$lte = new Date(toDate);
//     }

//     const sortOrder = order === "asc" ? 1 : -1;
//     const skip = (page - 1) * limit;

//     const completedJobs = await CompletedJob.find(filter)
//       .populate("employee")
//       .populate({
//         path: "company",
//         select:
//           "company_name mobile_number email address contractStartDate contractEndDate",
//         options: { autopopulate: false },
//       })

//       .sort({ [sortBy]: sortOrder })
//       .skip(skip)
//       .limit(Number(limit));

//     const total = await CompletedJob.countDocuments(filter);

//     return res.json({
//       success: true,
//       message: "Completed jobs retrieved successfully",
//       total,
//       page: Number(page),
//       totalPages: Math.ceil(total / limit),
//       data: completedJobs,
//     });
//   } catch (error) {
//     console.error("Get Completed Jobs By Employee Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };