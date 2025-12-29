const mongoose = require("mongoose");
const JobLog = require("../../models/admin/JobLog");
const CompletedJob = require("../../models/admin/CompletedJob");
const CompanyDetails = require("../../models/admin/Company_details");
const moment = require("moment-timezone");
const TIMEZONE = "Asia/Jakarta";

const formatDuration = (startTime, endTime) => {
  const diffMs = endTime - startTime;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatIndonesiaTime = (date) =>
  moment(date).tz(TIMEZONE).format("DD-MM-YYYY HH:mm");

exports.startJob = async (req, res) => {
  try {
    const { employeeId, companyId, objectId } = req.body;

    if (!employeeId || !companyId || !objectId) {
      return res.status(400).json({
        success: false,
        message: "employeeId, companyId, objectId are required",
      });
    }

    const companyCheck = await CompanyDetails.findOne({
      _id: companyId,
      "area.objects._id": objectId,
    });

    if (!companyCheck) {
      return res.status(400).json({
        success: false,
        message: "Invalid objectId: object not found in company areas",
      });
    }

    const existing = await JobLog.findOne({
      employee: employeeId,
      company: companyId,
      object: objectId,
      isStopped: false,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Job already running for this employee and object",
      });
    }

    const job = await JobLog.create({
      employee: employeeId,
      company: companyId,
      object: new mongoose.Types.ObjectId(objectId),
      startTime: new Date(),
    });

    return res.json({
      success: true,
      message: "Job started successfully",
      job,
    });
  } catch (error) {
    console.error("StartJob Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      details: error.message,
    });
  }
};

exports.stopJob = async (req, res) => {
  try {
    const { employeeId, objectId } = req.body;
    if (!employeeId || !objectId) {
      return res.status(400).json({
        success: false,
        message: "employeeId and objectId are required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(objectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid objectId",
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Images are required to stop the job",
      });
    }
    const job = await JobLog.findOne({
      employee: employeeId,
      object: objectId,
      isStopped: false,
    });
    if (!job) {
      return res.status(400).json({
        success: false,
        message: "Job not found or already stopped",
      });
    }
    const company = await CompanyDetails.findById(job.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }
    let areaName = "Unknown Area";
    let objectName = "Unknown Object";
    let shiftId = null;
    let shiftLabel = null;
    if (Array.isArray(company.area)) {
      for (const area of company.area) {
        if (!Array.isArray(area.objects)) continue;
        for (const obj of area.objects) {
          if (obj._id.toString() === objectId.toString()) {
            areaName = area.name || areaName;
            objectName = obj.objectName || objectName;
            shiftId = obj.shiftName;
            shiftLabel = obj.shiftName?.name || null;
            obj.employee = employeeId;
            break;
          }
        }
      }
      await CompanyDetails.updateOne(
        { _id: company._id },
        { $set: { area: company.area } },
        { runValidators: false }
      );
    }
    const startTimeUTC = job.startTime;
    const endTimeUTC = new Date();
    const hoursWorked = formatDuration(startTimeUTC, endTimeUTC);
    job.isStopped = true;
    job.endTime = endTimeUTC;
    job.hoursWorked = hoursWorked;
    await job.save();
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((file) => `uploads/history/${file.filename}`);
    }
    const completedJob = await CompletedJob.create({
      employee: employeeId,
      company: job.company,
      object: objectId,
      areaName,
      objectName,
      shiftName: shiftId,
      shiftLabel,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      hoursWorked,
      status: "completed",
      images: imagePaths,
    });
    return res.json({
      success: true,
      message: "Job stopped and images uploaded successfully",
      completedJob,
    });
  } catch (error) {
    console.error("StopJobWithImages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      details: error.message,
    });
  }
};

exports.submitImages = async (req, res) => {
  try {
    const { objectId } = req.body;

    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "objectId is required",
      });
    }

    const completedJob = await CompletedJob.findOne({ object: objectId }).sort({
      createdAt: -1,
    });

    if (!completedJob) {
      return res.status(404).json({
        success: false,
        message: "CompletedJob not found for this object",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    const imagePaths = req.files.map(
      (file) => `uploads/history/${file.filename}`
    );

    completedJob.images.push(...imagePaths);
    await completedJob.save();

    return res.json({
      success: true,
      message: "Images uploaded successfully",
      completedJob,
    });
  } catch (error) {
    console.error("SubmitImages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      details: error.message,
    });
  }
};

exports.getCompanyByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const completedJobsRaw = await CompletedJob.find({ employee: employeeId })
      .populate("employee")
      .populate("company")
      .sort({ createdAt: -1 });

    const completedObjectIds = new Set(
      completedJobsRaw.map((j) => j.object?.toString()).filter(Boolean)
    );

    const completedJobs = completedJobsRaw.map((job) => {
      const jobObj = job.toObject();
      let areaDetails = null;
      let objectDetails = null;

      if (jobObj.company?.area) {
        for (const area of jobObj.company.area) {
          for (const obj of area.objects || []) {
            if (obj._id.toString() === job.object.toString()) {
              areaDetails = { _id: area._id, name: area.name };
              objectDetails = obj;
              break;
            }
          }
        }
      }

      return { ...jobObj, areaDetails, objectDetails };
    });

    const allCompanies = await CompanyDetails.find()
      .populate("factoryName", "property_type")
      .populate({
        path: "area.objects",
        populate: [
          { path: "frequency" },
          { path: "employee" },
          { path: "serviceType" },
          { path: "shiftName" },
          { path: "specialTalent" },
        ],
      });

    const activeAndFutureJobs = allCompanies
      .map((company) => {
        const comp = company.toObject();
        comp.area = (comp.area || [])
          .map((area) => ({
            ...area,
            objects: (area.objects || []).filter((obj) => {
              return !completedObjectIds.has(obj._id.toString());
            }),
          }))
          .filter((area) => area.objects.length > 0);

        return comp;
      })
      .filter((c) => c.area.length > 0);

    return res.status(200).json({
      success: true,
      completedJobs,
      activeJobs: activeAndFutureJobs,
    });
  } catch (error) {
    console.error("getCompanyByEmployeeId Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      details: error.message,
    });
  }
};

// exports.stopJob = async (req, res) => {
//   try {
//     const { employeeId, objectId} = req.body;

//     if (!employeeId || !objectId) {
//       return res.status(400).json({
//         success: false,
//         message: "employeeId and objectId are required",
//       });
//     }

//     const job = await JobLog.findOne({
//       employee: employeeId,
//       object: new mongoose.Types.ObjectId(objectId),
//       isStopped: false,
//     });

//     if (!job) {
//       return res.status(400).json({
//         success: false,
//         message: "Job not found or already stopped",
//       });
//     }

//     const company = await CompanyDetails.findById(job.company);
//     if (!company) {
//       return res.status(404).json({
//         success: false,
//         message: "Company not found",
//       });
//     }

//     let areaName = "Unknown Area";
//     let objectName = "Unknown Object";

//     if (Array.isArray(company.area)) {
//       for (const area of company.area) {
//         if (!Array.isArray(area.objects)) continue;

//         for (const obj of area.objects) {
//           if (obj._id.toString() === objectId.toString()) {
//             areaName = area.name || areaName;
//             objectName = obj.objectName || objectName;
//             obj.employee = employeeId;
//             break;
//           }
//         }
//       }

//       await CompanyDetails.updateOne(
//         { _id: company._id },
//         { $set: { area: company.area } },
//         { runValidators: false }
//       );
//     }

//     // UTC dates (for DB)
//     const startTimeUTC = job.startTime;
//     const endTimeUTC = new Date();

//     // Duration
//     const hoursWorked = formatDuration(startTimeUTC, endTimeUTC);

//     // Save JobLog
//     job.isStopped = true;
//     job.endTime = endTimeUTC;
//     job.hoursWorked = hoursWorked;
//     await job.save();

//     const completedJob = await CompletedJob.create({
//       employee: employeeId,
//       company: job.company,
//       object: new mongoose.Types.ObjectId(objectId), // 🔥 FIX
//       areaName,
//       objectName,
//       startTime: startTimeUTC,
//       endTime: endTimeUTC,
//       hoursWorked,
//       status: "completed",
//     });

//     return res.json({
//       success: true,
//       message: "Job stopped and moved to Completed Jobs",
//       completedJob,
//     });
//   } catch (error) {
//     console.error("StopJob Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//       details: error.message,
//     });
//   }
// };
