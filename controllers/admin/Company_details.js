const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const JobLog = require("../../models/admin/JobLog");
const CompanyDetails = require("../../models/admin/Company_details");
const CompletedJob = require("../../models/admin/CompletedJob");

const uploadDir = "uploads/customers/";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const mimeType = fileTypes.test(file.mimetype);
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  if (mimeType && extname) return cb(null, true);
  cb(new Error("Only image files are allowed."));
};

const uploadFields = multer({ storage, fileFilter }).fields([
  { name: "property_images", maxCount: 1 },
  { name: "property_multi_images", maxCount: 10 },
]);

// Helper: return YYYY-MM-DD in UTC
function toDateStringUTC(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Converts admin-defined frequency into unit + interval
function resolveFrequency(freqDoc) {
  if (!freqDoc || !freqDoc.frequency_type) return null;

  const text = freqDoc.frequency_type.toLowerCase().trim();

  // Check for one-time/once
  if (
    text.includes("once") ||
    text.includes("one-time") ||
    text.includes("one time")
  ) {
    return { interval: 0, unit: "once" };
  }

  // Extract number from frequency text (e.g., "Every 2 months" → 2, "Monthly" → 1)
  const numMatch = text.match(/\d+/);
  let interval = numMatch ? parseInt(numMatch[0]) : 1;

  // Check for specific patterns
  if (text.includes("per") && text.includes("month")) {
    // "Per 2 monthly" or "Per 3 months"
    return { interval, unit: "month" };
  }

  if (text.includes("every")) {
    // "Every 2 hours", "Every 3 days", "Every 2 weeks", "Every 2 months"
    if (text.includes("hour")) return { interval, unit: "hour" };
    if (text.includes("day")) return { interval, unit: "day" };
    if (text.includes("week")) return { interval, unit: "week" };
    if (text.includes("month")) return { interval, unit: "month" };
  }

  // Check for standard frequencies without numbers
  if (text.includes("hour")) return { interval: 1, unit: "hour" };
  if (text.includes("daily")) return { interval: 1, unit: "day" };
  if (text.includes("weekly")) return { interval: 1, unit: "week" };
  if (text.includes("monthly")) return { interval: 1, unit: "month" };
  // Default fallback
  return { interval: 1, unit: "day" };
}

// Get current cycle number based on frequency (FIXED FOR HOURLY)
function getCurrentCycle(startDate, currentDate, interval, unit) {
  const start = new Date(startDate);
  const current = new Date(currentDate);

  // For one-time jobs
  if (interval === 0) return 0;

  let diff = 0;

  switch (unit) {
    case "hour":
      // Calculate hours difference
      diff = (current - start) / (1000 * 60 * 60);
      break;
    case "day":
      // Calculate days difference
      diff = (current - start) / (1000 * 60 * 60 * 24);
      break;
    case "week":
      // Calculate weeks difference
      diff = (current - start) / (1000 * 60 * 60 * 24 * 7);
      break;
    case "month":
      // Calculate months difference more accurately
      const yearDiff = current.getFullYear() - start.getFullYear();
      const monthDiff = current.getMonth() - start.getMonth();
      diff = yearDiff * 12 + monthDiff;

      // Adjust for days within the month
      const dayDiff = current.getDate() - start.getDate();
      if (dayDiff < 0) {
        diff -= 1;
        // Add fractional month
        const daysInPrevMonth = new Date(
          current.getFullYear(),
          current.getMonth(),
          0
        ).getDate();
        diff += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
      }
      break;
    default:
      diff = 0;
  }

  // Cycle calculation: Floor division by interval
  return Math.floor(diff / interval);
}

// Get cycle number for a specific date (FIXED FOR HOURLY)
function getCycleForDate(startDate, targetDate, interval, unit) {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  if (interval === 0) return 0;

  let diff = 0;

  switch (unit) {
    case "hour":
      diff = (target - start) / (1000 * 60 * 60);
      break;
    case "day":
      diff = (target - start) / (1000 * 60 * 60 * 24);
      break;
    case "week":
      diff = (target - start) / (1000 * 60 * 60 * 24 * 7);
      break;
    case "month":
      const yearDiff = target.getFullYear() - start.getFullYear();
      const monthDiff = target.getMonth() - start.getMonth();
      diff = yearDiff * 12 + monthDiff;

      // Adjust for days within the month
      const dayDiff = target.getDate() - start.getDate();
      if (dayDiff < 0) {
        diff -= 1;
        const daysInPrevMonth = new Date(
          target.getFullYear(),
          target.getMonth(),
          0
        ).getDate();
        diff += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
      }
      break;
    default:
      diff = 0;
  }

  return Math.floor(diff / interval);
}

// Calculate next due date/time
function getNextDueTime(startDate, currentDate, interval, unit) {
  const start = new Date(startDate);
  const current = new Date(currentDate);

  if (interval === 0) return null; // One-time job

  const currentCycle = getCurrentCycle(start, current, interval, unit);
  const nextCycle = currentCycle + 1;

  let nextDue = new Date(start);

  switch (unit) {
    case "hour":
      nextDue.setHours(start.getHours() + nextCycle * interval);
      break;
    case "day":
      nextDue.setDate(start.getDate() + nextCycle * interval);
      break;
    case "week":
      nextDue.setDate(start.getDate() + nextCycle * interval * 7);
      break;
    case "month":
      nextDue.setMonth(start.getMonth() + nextCycle * interval);
      break;
  }

  return nextDue;
}

function getNextDueFromLastCompleted(lastCompleted, interval, unit) {
  const next = new Date(lastCompleted);

  switch (unit) {
    case "hour":
      next.setHours(next.getHours() + interval);
      break;
    case "day":
      next.setDate(next.getDate() + interval);
      break;
    case "week":
      next.setDate(next.getDate() + interval * 7);
      break;
    case "month":
      next.setMonth(next.getMonth() + interval);
      break;
  }

  return next;
}

// Format time difference nicely
function formatTimeDiff(start, end, unit) {
  const diffMs = end - start;

  switch (unit) {
    case "hour":
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 1) {
        const minutes = Math.floor(diffHours * 60);
        return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      }
      const hours = Math.floor(diffHours);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    case "day":
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? "s" : ""}`;
    case "week":
      const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      return `${weeks} week${weeks !== 1 ? "s" : ""}`;
    case "month":
      // Approximate months
      const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      return `${months} month${months !== 1 ? "s" : ""}`;
    default:
      return "";
  }
}

// Helper function to add interval to date
function addIntervalToDate(date, interval, unit) {
  const newDate = new Date(date);

  switch (unit) {
    case "hour":
      newDate.setHours(newDate.getHours() + interval);
      break;
    case "day":
      newDate.setDate(newDate.getDate() + interval);
      break;
    case "week":
      newDate.setDate(newDate.getDate() + interval * 7);
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + interval);
      // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
      if (newDate.getDate() !== date.getDate()) {
        newDate.setDate(0); // Last day of previous month
      }
      break;
  }

  return newDate;
}

// Helper function to get date difference in specific units
function getDateDiffInUnits(date1, date2, unit) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2 - d1;

  switch (unit) {
    case "hour":
      return diffMs / (1000 * 60 * 60);
    case "day":
      return diffMs / (1000 * 60 * 60 * 24);
    case "week":
      return diffMs / (1000 * 60 * 60 * 24 * 7);
    case "month":
      const yearDiff = d2.getFullYear() - d1.getFullYear();
      const monthDiff = d2.getMonth() - d1.getMonth();
      return yearDiff * 12 + monthDiff;
    default:
      return 0;
  }
}

function formatDateForDisplay(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

exports.getEmployeeCalendar = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { companyId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid employee id" });
    }

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid companyId is required" });
    }

    const currentDate = new Date();

    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth() + 1;

    const monthStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const todayStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      0,
      0,
      0,
      0
    );
    const completedJobs = await CompletedJob.find({
      employee: employeeId,
      endTime: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    }).select("object endTime -_id");

    const completedMap = new Map();
    completedJobs.forEach((job) => {
      if (!job.object) return;
      const dateStr = toDateStringUTC(job.endTime);
      const objId = job.object.toString();
      completedMap.set(objId + "_" + dateStr, true);
    });

    const processingJobs = await JobLog.find({
      employee: employeeId,
      stopTime: { $exists: false },
      startTime: { $gte: todayStart },
    }).select("object -_id");

    const processingSet = new Set();
    processingJobs.forEach((job) => {
      if (job.object) {
        processingSet.add(job.object.toString());
      }
    });

    // Fetch specific company by ID
    const company = await CompanyDetails.findOne({
      _id: companyId,
    })
      .populate("factoryName", "property_type")
      .populate({
        path: "area.objects.frequency area.objects.employee area.objects.serviceType",
      });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const comp = company.toObject();
    const contractStart = comp.contractStartDate
      ? new Date(comp.contractStartDate)
      : null;
    const contractEnd = comp.contractEndDate
      ? new Date(comp.contractEndDate)
      : null;

    // Check if employee is assigned to this company
    let isEmployeeAssigned = false;
    (comp.area || []).forEach((area) => {
      (area.objects || []).forEach((obj) => {
        if (
          obj.employee &&
          obj.employee._id &&
          obj.employee._id.toString() === employeeId
        ) {
          isEmployeeAssigned = true;
        }
      });
    });

    if (!isEmployeeAssigned) {
      return res.status(403).json({
        success: false,
        message: "Employee is not assigned to this company",
      });
    }

    const calendarDays = [];
    const jobsByDate = new Map(); // dateStr -> array of jobs

    // Helper function to add job to date map
    function addJobToDate(dateStr, jobData) {
      if (!jobsByDate.has(dateStr)) {
        jobsByDate.set(dateStr, []);
      }
      jobsByDate.get(dateStr).push(jobData);
    }

    // Process the company and its objects
    // Skip if contract dates don't overlap with current month
    if (
      !(contractEnd && contractEnd < monthStart) &&
      !(contractStart && contractStart > monthEnd)
    ) {
      // Process each area and object
      (comp.area || []).forEach((area) => {
        (area.objects || []).forEach((obj) => {
          // Check if this object is assigned to the requested employee
          if (
            !obj.employee ||
            !obj.employee._id ||
            obj.employee._id.toString() !== employeeId
          )
            return;

          const objId = obj._id.toString();
          const freq = obj.frequency ? resolveFrequency(obj.frequency) : null;

          if (!freq) return; // Skip if no valid frequency

          // Determine actual start date for this object
          let objectStartDate = contractStart;
          if (obj.serviceStartDate) {
            objectStartDate = new Date(obj.serviceStartDate);
          } else if (obj.createdAt) {
            objectStartDate = new Date(obj.createdAt);
          } else if (comp.createdAt) {
            objectStartDate = new Date(comp.createdAt);
          }

          if (!objectStartDate) return; // Skip if no start date

          // Adjust objectStartDate to start of day
          objectStartDate.setHours(0, 0, 0, 0);

          // For one-time jobs
          if (freq.interval === 0 || freq.unit === "once") {
            // Only add if one-time job date is within the month
            const jobDate = new Date(objectStartDate);
            jobDate.setHours(0, 0, 0, 0);

            if (jobDate >= monthStart && jobDate <= monthEnd) {
              const dateStr = toDateStringUTC(jobDate);
              addJobToDate(dateStr, {
                objectId: objId,
                objectName: obj.objectName,
                frequency: obj.frequency?.frequency_type || "Once",
                isOneTime: true,
                areaName: area.name,
                serviceType: obj.serviceType?.service_type,
              });
            }
            return;
          }

          // For recurring jobs, generate all job dates in the month
          let currentJobDate = new Date(objectStartDate);

          // Move to first job date on or after month start
          if (currentJobDate < monthStart) {
            // Calculate how many intervals to skip
            const diff = getDateDiffInUnits(
              currentJobDate,
              monthStart,
              freq.unit
            );
            const intervalsToSkip = Math.ceil(diff / freq.interval);
            currentJobDate = addIntervalToDate(
              currentJobDate,
              intervalsToSkip * freq.interval,
              freq.unit
            );
          }

          // Generate all job dates within the month
          while (
            currentJobDate <= monthEnd &&
            currentJobDate <= (contractEnd || monthEnd)
          ) {
            const dateStr = toDateStringUTC(currentJobDate);

            addJobToDate(dateStr, {
              objectId: objId,
              objectName: obj.objectName,
              frequency: obj.frequency?.frequency_type || "Recurring",
              frequencyUnit: freq.unit,
              frequencyInterval: freq.interval,
              areaName: area.name,
              serviceType: obj.serviceType?.service_type,
            });

            // Move to next interval
            currentJobDate = addIntervalToDate(
              currentJobDate,
              freq.interval,
              freq.unit
            );
          }
        });
      });
    }

    // Now generate simplified calendar days array
    const currentDay = new Date(monthStart);
    while (currentDay <= monthEnd) {
      const dateStr = toDateStringUTC(currentDay);
      const isToday = dateStr === toDateStringUTC(currentDate);
      const isPast = currentDay < todayStart;

      const dayJobs = jobsByDate.get(dateStr) || [];

      // Process each job for this day to determine status
      const processedJobs = dayJobs.map((job) => {
        const jobCompleted = completedMap.has(job.objectId + "_" + dateStr);
        const isProcessing = processingSet.has(job.objectId);

        let jobColor = "gray";
        let jobStatus = "pending";

        if (jobCompleted) {
          jobColor = "green";
          jobStatus = "completed";
        } else if (isProcessing) {
          jobColor = "blue";
          jobStatus = "processing";
        } else if (isPast) {
          jobColor = "red";
          jobStatus = "overdue";
        } else if (isToday) {
          jobColor = "orange";
          jobStatus = "due-today";
        } else {
          jobColor = "yellow";
          jobStatus = "upcoming";
        }

        // Return only essential data
        return {
          objectName: job.objectName,
          frequency: job.frequency,
          status: jobStatus,
          color: jobColor,
          areaName: job.areaName,
          serviceType: job.serviceType,
        };
      });

      // Only add day if it has jobs
      if (processedJobs.length > 0) {
        calendarDays.push({
          date: dateStr,
          dayNumber: currentDay.getDate(),
          isToday: isToday,
          jobs: processedJobs,
        });
      }

      // Move to next day
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Prepare company contract info
    const companyInfo = {
      companyId: comp._id,
      companyName: comp.company_name,
      contractStart: contractStart ? contractStart.toISOString() : null,
      contractEnd: contractEnd ? contractEnd.toISOString() : null,
      contractStatus: getContractStatus(
        contractStart,
        contractEnd,
        currentDate
      ),
      contractDaysRemaining: contractEnd
        ? Math.ceil((contractEnd - currentDate) / (1000 * 60 * 60 * 24))
        : null,
      address: comp.address,
      mobileNumber: comp.mobile_number,
      email: comp.email,
      totalJobsThisMonth: calendarDays.reduce(
        (total, day) => total + day.jobs.length,
        0
      ),
    };

    return res.status(200).json({
      success: true,
      message: "Calendar data fetched successfully",
      month: targetMonth,
      year: targetYear,
      monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleString(
        "en-US",
        { month: "long" }
      ),
      days: calendarDays,
      company: companyInfo,
      colorLegend: {
        green: "Completed",
        red: "Overdue",
        orange: "Due Today",
        yellow: "Upcoming",
        blue: "Processing",
        gray: "No Jobs",
      },
    });
  } catch (error) {
    console.error("getEmployeeCalendar Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to determine contract status
function getContractStatus(contractStart, contractEnd, currentDate) {
  if (!contractStart || !contractEnd) return "no-contract";

  const start = new Date(contractStart);
  const end = new Date(contractEnd);
  const now = new Date(currentDate);

  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

// Helper function to determine contract status

// function getContractStatus(contractStart, contractEnd, currentDate) {
//   if (!contractStart || !contractEnd) return 'no-contract';

//   const start = new Date(contractStart);
//   const end = new Date(contractEnd);
//   const now = new Date(currentDate);

//   if (now < start) return 'upcoming';
//   if (now > end) return 'expired';
//   return 'active';
// }

// Also update the helper function for hourly cycles

function getCurrentCycle(startDate, currentDate, interval, unit) {
  const start = new Date(startDate);
  const current = new Date(currentDate);

  // For one-time jobs
  if (interval === 0) return 0;

  let diff = 0;

  switch (unit) {
    case "hour":
      // For hourly: calculate from start of the day
      const dayStart = new Date(start);
      dayStart.setHours(0, 0, 0, 0);
      diff = (current - dayStart) / (1000 * 60 * 60);
      break;
    case "day":
      diff = (current - start) / (1000 * 60 * 60 * 24);
      break;
    case "week":
      diff = (current - start) / (1000 * 60 * 60 * 24 * 7);
      break;
    case "month":
      const yearDiff = current.getFullYear() - start.getFullYear();
      const monthDiff = current.getMonth() - start.getMonth();
      diff = yearDiff * 12 + monthDiff;

      // Adjust for days within the month
      const dayDiff = current.getDate() - start.getDate();
      if (dayDiff < 0) {
        diff -= 1;
        const daysInPrevMonth = new Date(
          current.getFullYear(),
          current.getMonth(),
          0
        ).getDate();
        diff += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
      }
      break;
    default:
      diff = 0;
  }

  return Math.floor(diff / interval);
}

exports.createCompanydetails = [
  uploadFields,
  async (req, res) => {
    try {
      const companyData = { ...req.body };

      ["area", "shiftTiming", "location"].forEach((field) => {
        if (companyData[field]) {
          try {
            companyData[field] = JSON.parse(companyData[field]);
          } catch (err) {
            return res
              .status(400)
              .json({ success: false, message: `Invalid JSON for ${field}` });
          }
        }
      });

      if (
        req.files &&
        req.files["property_images"] &&
        req.files["property_images"][0]
      ) {
        companyData.property_images = [
          `/uploads/customers/${req.files["property_images"][0].filename}`,
        ];
      }

      if (req.files && req.files["property_multi_images"] && companyData.area) {
        const multiFiles = req.files["property_multi_images"];
        let fileIndex = 0;

        companyData.area.forEach((area) => {
          if (!Array.isArray(area.objects)) return;

          area.objects.forEach((obj) => {
            const count = Number(obj.newImagesCount) || 0;

            const newImages = [];
            for (let i = 0; i < count && fileIndex < multiFiles.length; i++) {
              const file = multiFiles[fileIndex++];
              newImages.push(`/uploads/customers/${file.filename}`);
            }

            const existing = Array.isArray(obj.existingImages)
              ? obj.existingImages
              : [];

            obj.property_multi_images = [...existing, ...newImages];
            delete obj.newImagesCount;
            delete obj.existingImages;
          });
        });
      }

      const company = await CompanyDetails.create(companyData);

      const populatedCompany = await CompanyDetails.findById(company._id)
        .populate("factoryName", "property_type")
        .populate({
          path: "area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent",
        })
        .exec();

      res.status(201).json({
        success: true,
        message: "Company created successfully",
        company: populatedCompany,
      });
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
];

exports.getAllCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const filters = { ...req.query };
    delete filters.page;
    delete filters.limit;

    for (let key in filters) {
      filters[key] = { $regex: filters[key], $options: "i" }; // case-sensitive
    }

    const total = await CompanyDetails.countDocuments(filters);
    const companies = await CompanyDetails.find(filters)
      .skip(skip)
      .limit(limit)
      .populate("factoryName", "property_type")
      .populate({
        path: "area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent",
      })
      .exec();

    res.status(200).json({
      message: "Successfully fetched all companies",
      success: true,
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
      companies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await CompanyDetails.findById(req.params.id)
      .populate("factoryName", "property_type")
      .populate({
        path: "area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent",
      })
      .exec();

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      message: "Successfully fetched company",
      company,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActiveJobsByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.id;
    

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid employee id" });
    }

    const currentDate = new Date();
    const currentDateStr = toDateStringUTC(currentDate);

    const completedJobs = await CompletedJob.find({
      employee: employeeId,
      endTime: { $exists: true },
    });

    const completedTodayMap = new Map();
    const allTimeCompletedMap = new Map();

    completedJobs.forEach((job) => {
      if (!job.object) return;
      const jobEndTime = job.endTime;
      const jobDateStr = toDateStringUTC(jobEndTime);
      allTimeCompletedMap.set(job.object.toString(), jobEndTime);
      if (jobDateStr === currentDateStr) {
        completedTodayMap.set(job.object.toString(), jobEndTime);
      }
    });

    const processingJobs = await JobLog.find({
      employee: employeeId,
      isStopped: false,
    });

    const processingMap = new Map();
    processingJobs.forEach((job) => {
      if (!job.object) return;
      processingMap.set(job.object.toString(), job.startTime);
    });

    const stoppedJobs = await JobLog.find({
      employee: employeeId,
      isStopped: true,
    });

    const stoppedMap = new Map();
    stoppedJobs.forEach((job) => {
      if (!job.object) return;
      stoppedMap.set(job.object.toString(), job.stopTime || true);
    });

    const allCompanies = await CompanyDetails.find({
      $or: [
        { contractEndDate: { $gte: currentDate } },
        { contractEndDate: { $exists: false } },
        { contractEndDate: null },
      ],
    })
      .populate("factoryName", "property_type")
      .populate({
        path: "area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent",
      });

    const activeJobs = [];

    for (const company of allCompanies) {
      const comp = company.toObject();
      const contractStart = comp.contractStartDate
        ? new Date(comp.contractStartDate)
        : null;
      const contractEnd = comp.contractEndDate
        ? new Date(comp.contractEndDate)
        : null;

      let adjustedContractEnd = contractEnd;

      const hasHourlyFrequency = (comp.area || []).some((area) =>
        (area.objects || []).some(
          (obj) =>
            obj.frequency &&
            obj.frequency.frequency_type &&
            obj.frequency.frequency_type.toLowerCase().includes("hour")
        )
      );

      if (hasHourlyFrequency && contractEnd && contractStart) {
        adjustedContractEnd = new Date(contractEnd);
        adjustedContractEnd.setHours(23, 59, 59, 999);
      }

      comp.contractStatus = adjustedContractEnd
        ? adjustedContractEnd >= currentDate
          ? "active"
          : "expired"
        : "no-contract";

      comp.daysUntilExpiry = adjustedContractEnd
        ? Math.ceil(
            (adjustedContractEnd.getTime() - currentDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      comp.isContractExpired = adjustedContractEnd
        ? adjustedContractEnd < currentDate
        : false;

      const areasWithDue = [];

      (comp.area || []).forEach((area) => {
        const dueObjects = [];

        (area.objects || []).forEach((obj) => {
          if (
            !obj.employee ||
            !obj.employee._id ||
            obj.employee._id.toString() !== employeeId
          )
            return;

          const objIdStr = obj._id.toString();
          const lastCompleted = allTimeCompletedMap.get(objIdStr);
          const isProcessing = processingMap.has(objIdStr);

          let shouldShowJob = true;

          if (obj.frequency && obj.frequency.frequency_type) {
            const freq = resolveFrequency(obj.frequency);

            if (freq) {
              if (freq.unit === "hour") {
                const serviceStartDate =
                  obj.serviceStartDate ||
                  contractStart ||
                  comp.createdAt ||
                  currentDate;
                const startDate = new Date(serviceStartDate);
                const contractStartDay = new Date(startDate);
                contractStartDay.setHours(0, 0, 0, 0);

                const contractEndDay = new Date(startDate);
                contractEndDay.setHours(23, 59, 59, 999);

                if (
                  currentDate < contractStartDay ||
                  currentDate > contractEndDay
                ) {
                  shouldShowJob = false;
                }
              } else if (
                adjustedContractEnd &&
                currentDate > adjustedContractEnd
              ) {
                shouldShowJob = false;
              }
            }
          }

          if (!shouldShowJob) return;

          if (lastCompleted) {
            const lastCompletedDateStr = toDateStringUTC(
              new Date(lastCompleted)
            );
            if (lastCompletedDateStr === currentDateStr && !isProcessing) {
              return;
            }
          }
          let jobStatus = "pending";

          if (isProcessing) {
            jobStatus = "processing";
          } else if (lastCompleted) {
            jobStatus = "completed";
          }

          let isDueForService = false;
          let dueReason = "";
          let currentCycle = 0;
          let lastCompletedCycle = -1;

          if (obj.frequency && obj.frequency.frequency_type) {
            const freq = resolveFrequency(obj.frequency);
            const serviceStartDate =
              obj.serviceStartDate ||
              contractStart ||
              comp.createdAt ||
              currentDate;

            const nextDueTime =
              lastCompleted && freq && freq.interval > 0
                ? getNextDueFromLastCompleted(
                    lastCompleted,
                    freq.interval,
                    freq.unit
                  )
                : null;

            // Completed job must stay hidden until nextDueTime
            if (lastCompleted && nextDueTime && currentDate < nextDueTime) {
              return; // ⬅️ THIS NOW WORKS
            }
            // 🔔 JOB RE-ACTIVATED AFTER COMPLETION (ALL FREQUENCIES)
            if (lastCompleted && nextDueTime && currentDate >= nextDueTime) {
              console.log("🔁 JOB RE-APPEARED IN ACTIVE JOBS", {
                objectName: obj.objectName,
                frequency: freq.unit,
                lastCompleted: new Date(lastCompleted).toISOString(),
                nextDueTime: nextDueTime.toISOString(),
                currentTime: currentDate.toISOString(),
                reason: "Next frequency cycle started",
              });
            }

            if (!freq) {
              if (!lastCompleted) {
                isDueForService = true;
                dueReason = "One-time service due (never completed)";
              }
            } else if (freq.interval === 0 || freq.unit === "once") {
              if (!lastCompleted) {
                isDueForService = true;
                dueReason = "One-time service pending";
              }
            } else {
              const serviceStartDate =
                obj.serviceStartDate ||
                contractStart ||
                comp.createdAt ||
                currentDate;
              const startDate = new Date(serviceStartDate);

              if (freq.unit === "hour") {
                const dayStart = new Date(startDate);
                dayStart.setHours(0, 0, 0, 0);
                currentCycle = getCurrentCycle(
                  dayStart,
                  currentDate,
                  freq.interval,
                  freq.unit
                );

                if (lastCompleted) {
                  lastCompletedCycle = getCycleForDate(
                    dayStart,
                    lastCompleted,
                    freq.interval,
                    freq.unit
                  );
                } else {
                  lastCompletedCycle = -1;
                }
              } else {
                currentCycle = getCurrentCycle(
                  startDate,
                  currentDate,
                  freq.interval,
                  freq.unit
                );

                if (lastCompleted) {
                  lastCompletedCycle = getCycleForDate(
                    startDate,
                    lastCompleted,
                    freq.interval,
                    freq.unit
                  );
                } else {
                  lastCompletedCycle = -1;
                }
              }

              // ✅ Job is due NOW (next cycle has started)
              isDueForService = true;

              if (lastCompleted) {
                const timeDiff = formatTimeDiff(
                  new Date(lastCompleted),
                  currentDate,
                  freq.unit
                );
                dueReason = `${obj.frequency.frequency_type} service due (completed ${timeDiff} ago)`;
              } else {
                dueReason = `${obj.frequency.frequency_type} service due (never completed)`;
              }
            }
          }
          const isCompleted = !!lastCompleted;

          if (isProcessing || isDueForService) {
            dueObjects.push({
              ...obj,
              jobStatus,
              isCompleted,
              isProcessing,
              isDueForService,
              dueReason,
              lastCompleted: lastCompleted || null,
              frequencyInfo: {
                currentCycle,
                lastCompletedCycle,
                frequencyType: obj.frequency?.frequency_type || "Unknown",
                contractStartDate: contractStart,
                contractEndDate: adjustedContractEnd,
              },
            });
          }
        });
        if (dueObjects.length) {
          const AllJobCompleted = dueObjects.every(
            (obj) => obj.jobStatus === "completed"
          );

          const allJobAre = AllJobCompleted ? "Completed" : "Pending";

          areasWithDue.push({
            ...area,
            objects: dueObjects,
            AllJobAre: allJobAre,
            AllJobCompleted: AllJobCompleted,
          });
        }
      });

      if (areasWithDue.length && !comp.isContractExpired) {
        activeJobs.push({ ...comp, area: areasWithDue });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Successfully fetched active jobs for the employee",
      activeJobs,
      currentDate: currentDate.toISOString(),
      totalActiveJobs: activeJobs.reduce(
        (acc, c) =>
          acc +
          (c.area?.reduce((ai, a) => ai + (a.objects?.length || 0), 0) || 0),
        0
      ),
    });
  } catch (error) {
    console.error("getActiveJobsByEmployeeId Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompletedJobsByEmployeeId = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const completedJobs = await CompletedJob.find({ employee: employeeId })
      .populate("employee")
      .populate("company")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Successfully fetched completed jobs for the employee",
      completedJobs,
    });
  } catch (error) {
    console.error("getCompletedJobsByEmployeeId Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateCompany = [
  uploadFields,
  async (req, res) => {
    try {
      const companyData = { ...req.body };
      ["area", "shiftTiming", "location"].forEach((field) => {
        if (companyData[field] && typeof companyData[field] === "string") {
          try {
            companyData[field] = JSON.parse(companyData[field]);
          } catch (err) {
            return res
              .status(400)
              .json({ success: false, message: `Invalid JSON for ${field}` });
          }
        }
      });

      if (
        req.files &&
        req.files["property_images"] &&
        req.files["property_images"][0]
      ) {
        companyData.property_images = [
          `/uploads/customers/${req.files["property_images"][0].filename}`,
        ];
      }

      if (req.files && req.files["property_multi_images"] && companyData.area) {
        const multiFiles = req.files["property_multi_images"];
        let fileIndex = 0;

        companyData.area.forEach((area) => {
          if (!Array.isArray(area.objects)) return;

          area.objects.forEach((obj) => {
            const count = Number(obj.newImagesCount) || 0;
            const existing = Array.isArray(obj.existingImages)
              ? obj.existingImages
              : [];

            const newImages = [];
            for (let i = 0; i < count && fileIndex < multiFiles.length; i++) {
              const file = multiFiles[fileIndex++];
              newImages.push(`/uploads/customers/${file.filename}`);
            }

            obj.property_multi_images = [...existing, ...newImages];
            delete obj.newImagesCount;
            delete obj.existingImages;
          });
        });
      }

      const company = await CompanyDetails.findByIdAndUpdate(
        req.params.id,
        companyData,
        { new: true, runValidators: true }
      )
        .populate("factoryName", "property_type")
        .populate({
          path: "area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent",
        })
        .exec();

      if (!company) {
        return res
          .status(404)
          .json({ success: false, message: "Company not found" });
      }

      res.status(200).json({
        success: true,
        message: "Company updated successfully",
        company,
      });
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  },
];

exports.deleteCompany = async (req, res) => {
  try {
    const company = await CompanyDetails.findByIdAndDelete(
      req.params.id
    ).exec();
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// const mongoose = require('mongoose');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Models (make sure these paths match your project)
// const JobLog = require('../../models/admin/JobLog');
// const CompanyDetails = require('../../models/admin/Company_details');
// const CompletedJob = require('../../models/admin/CompletedJob');

// // Upload setup
// const uploadDir = 'uploads/customers/';
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });

// const fileFilter = (req, file, cb) => {
//   const fileTypes = /jpeg|jpg|png/;
//   const mimeType = fileTypes.test(file.mimetype);
//   const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
//   if (mimeType && extname) return cb(null, true);
//   cb(new Error('Only image files are allowed.'));
// };

// const uploadFields = multer({ storage, fileFilter }).fields([
//   { name: 'property_images', maxCount: 1 },
//   { name: 'property_multi_images', maxCount: 10 },
// ]);

// // Helper: normalize date to yyyy-mm-dd string (UTC)
// function toDateStringUTC(date) {
//   const d = new Date(date);
//   const year = d.getUTCFullYear();
//   const month = String(d.getUTCMonth() + 1).padStart(2, '0');
//   const day = String(d.getUTCDate()).padStart(2, '0');
//   return `${year}-${month}-${day}`;
// }

// // Helper: days difference (floor) between two dates (a - b) in UTC
// function daysBetweenUTC(a, b) {
//   const ad = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()));
//   const bd = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
//   const diff = ad.getTime() - bd.getTime();
//   return Math.floor(diff / (1000 * 60 * 60 * 24));
// }

// // Validate and parse JSON fields that might be sent as strings
// function safeParseJSONField(obj, fieldName) {
//   if (!obj[fieldName]) return;
//   if (typeof obj[fieldName] === 'string') {
//     try {
//       obj[fieldName] = JSON.parse(obj[fieldName]);
//     } catch (err) {
//       throw new Error(`Invalid JSON for ${fieldName}`);
//     }
//   }
// }

// // -------------------- CONTROLLER EXPORTS --------------------

// exports.createCompanydetails = [
//   uploadFields,
//   async (req, res) => {
//     try {
//       const companyData = { ...req.body };

//       // Parse JSON fields safely
//       ['area', 'shiftTiming', 'location'].forEach(field => {
//         safeParseJSONField(companyData, field);
//       });

//       // Single property image
//       if (req.files && req.files['property_images'] && req.files['property_images'][0]) {
//         companyData.property_images = [
//           `/uploads/customers/${req.files['property_images'][0].filename}`,
//         ];
//       }

//       // Multi images: distribute sequentially using newImagesCount
//       if (req.files && req.files['property_multi_images'] && companyData.area) {
//         const multiFiles = req.files['property_multi_images']; // array of files
//         let fileIndex = 0;

//         companyData.area.forEach(area => {
//           if (!Array.isArray(area.objects)) return;

//           area.objects.forEach(obj => {
//             const count = Number(obj.newImagesCount) || 0;

//             // Build property_multi_images from uploaded files
//             const newImages = [];
//             for (let i = 0; i < count && fileIndex < multiFiles.length; i++) {
//               const file = multiFiles[fileIndex++];
//               newImages.push(`/uploads/customers/${file.filename}`);
//             }

//             const existing = Array.isArray(obj.existingImages) ? obj.existingImages : [];
//             obj.property_multi_images = [...existing, ...newImages];

//             // Clean up helper fields so they don't get saved in DB
//             delete obj.newImagesCount;
//             delete obj.existingImages;
//           });
//         });
//       }

//       const company = await CompanyDetails.create(companyData);

//       const populatedCompany = await CompanyDetails.findById(company._id)
//         .populate('factoryName', 'property_type')
//         .populate({
//           path: 'area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent',
//         })
//         .exec();

//       return res.status(201).json({
//         success: true,
//         message: 'Company created successfully',
//         company: populatedCompany,
//       });
//     } catch (error) {
//       console.error('Error creating company:', error);
//       return res.status(500).json({ success: false, message: error.message });
//     }
//   },
// ];

// exports.getAllCompanies = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 100;
//     const skip = (page - 1) * limit;

//     const filters = { ...req.query };
//     delete filters.page;
//     delete filters.limit;

//     // Build regex filters for string fields
//     for (let key in filters) {
//       filters[key] = { $regex: filters[key], $options: 'i' };
//     }

//     const total = await CompanyDetails.countDocuments(filters);
//     const companies = await CompanyDetails.find(filters)
//       .skip(skip)
//       .limit(limit)
//       .populate('factoryName', 'property_type')
//       .populate({
//         path: 'area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent',
//       })
//       .exec();

//     return res.status(200).json({
//       message: 'Successfully fetched all companies',
//       success: true,
//       total,
//       page,
//       perPage: limit,
//       totalPages: Math.ceil(total / limit),
//       companies,
//     });
//   } catch (error) {
//     console.error('getAllCompanies Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// exports.getCompanyById = async (req, res) => {
//   try {
//     const company = await CompanyDetails.findById(req.params.id)
//       .populate('factoryName', 'property_type')
//       .populate({
//         path: 'area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent',
//       })
//       .exec();

//     if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

//     return res.status(200).json({ success: true, message: 'Successfully fetched company', company });
//   } catch (error) {
//     console.error('getCompanyById Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // -------------------- Dynamic Active Jobs Logic --------------------
// exports.getActiveJobsByEmployeeId = async (req, res) => {
//   try {
//     const employeeId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//       return res.status(400).json({ success: false, message: 'Invalid employee id' });
//     }

//     const currentDate = new Date();
//     const currentDateStr = toDateStringUTC(currentDate);

//     // Fetch completed jobs for this employee
//     const completedJobs = await CompletedJob.find({ employee: employeeId });

//     // Map: objectId -> last completion date (most recent)
//     const completedJobMap = new Map();
//     completedJobs.forEach(job => {
//       if (!job.object) return;
//       const objId = job.object.toString();
//       const date = job.completionDate ? new Date(job.completionDate) : new Date(job.createdAt);

//       const existing = completedJobMap.get(objId);
//       if (!existing || date > existing) completedJobMap.set(objId, date);
//     });

//     // Get all companies with active or no-expiry contracts
//     const allCompanies = await CompanyDetails.find({
//       $or: [
//         { contractEndDate: { $gte: currentDate } },
//         { contractEndDate: { $exists: false } },
//         { contractEndDate: null },
//       ],
//     })
//       .populate('factoryName', 'property_type')
//       .populate({
//         path: 'area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent',
//       })
//       .exec();

//     const activeJobs = [];

//     for (const company of allCompanies) {
//       const comp = company.toObject();

//       // Contract status
//       const contractEnd = comp.contractEndDate ? new Date(comp.contractEndDate) : null;
//       comp.contractStatus = contractEnd ? (contractEnd >= currentDate ? 'active' : 'expired') : 'no-contract';
//       comp.daysUntilExpiry = contractEnd ? Math.ceil((contractEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
//       comp.isContractExpired = contractEnd ? contractEnd < currentDate : false;

//       // Build areas with due objects for this employee
//       const areasWithDue = [];

//       (comp.area || []).forEach(area => {
//         const dueObjects = [];

//         (area.objects || []).forEach(obj => {
//           // Ensure frequency is populated and has duration_days
//           const freq = obj.frequency && obj.frequency.duration_days !== undefined ? obj.frequency : null;

//           const assignedToEmployee = obj.employee && obj.employee._id && obj.employee._id.toString() === employeeId;
//           if (!assignedToEmployee) return; // only consider objects assigned to this employee

//           const lastCompleted = completedJobMap.get(obj._id.toString());

//           let isDueForService = false;
//           let dueReason = '';

//           // If frequency is missing, default to due
//           if (!freq) {
//             isDueForService = true;
//             dueReason = 'Service due (no frequency set)';
//           } else if (Number(freq.duration_days) === 0) {
//             // One-time job: due only if never completed
//             isDueForService = !lastCompleted;
//             dueReason = isDueForService ? `${freq.frequency_type} (one-time) service due` : 'Already completed';
//           } else {
//             // Recurring jobs
//             if (!lastCompleted) {
//               isDueForService = true;
//               dueReason = `${freq.frequency_type} service due (never completed)`;
//             } else {
//               // Calculate difference in days using UTC normalization
//               const diffDays = daysBetweenUTC(currentDate, new Date(lastCompleted));
//               isDueForService = diffDays >= Number(freq.duration_days);
//               dueReason = isDueForService ? `${freq.frequency_type} service due` : `Completed ${diffDays} days ago`;
//             }
//           }

//           if (isDueForService) {
//             dueObjects.push({
//               ...obj,
//               assignedToEmployee: true,
//               isCompleted: !!lastCompleted,
//               lastCompletedDate: lastCompleted || null,
//               isDueForService,
//               dueReason,
//               frequencyName: obj.frequency?.frequency_type || 'Unknown',
//               frequencyDurationDays: obj.frequency?.duration_days ?? null,
//             });
//           }
//         });

//         if (dueObjects.length) {
//           areasWithDue.push({ ...area, objects: dueObjects });
//         }
//       });

//       if (areasWithDue.length && !comp.isContractExpired) {
//         const companyCopy = { ...comp, area: areasWithDue };
//         activeJobs.push(companyCopy);
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Successfully fetched active jobs for the employee',
//       activeJobs,
//       currentDate: currentDate.toISOString(),
//       totalActiveJobs: activeJobs.reduce((acc, c) => acc + (c.area?.reduce((ai, a) => ai + (a.objects?.length || 0), 0) || 0), 0),
//     });
//   } catch (error) {
//     console.error('getActiveJobsByEmployeeId Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Completed jobs
// exports.getCompletedJobsByEmployeeId = async (req, res) => {
//   try {
//     const employeeId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(employeeId)) {
//       return res.status(400).json({ success: false, message: 'Invalid employee id' });
//     }

//     const completedJobs = await CompletedJob.find({ employee: employeeId })
//       .populate('employee')
//       .populate('company')
//       .sort({ createdAt: -1 })
//       .exec();

//     return res.status(200).json({ success: true, message: 'Successfully fetched completed jobs for the employee', completedJobs });
//   } catch (error) {
//     console.error('getCompletedJobsByEmployeeId Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Update company
// exports.updateCompany = [
//   uploadFields,
//   async (req, res) => {
//     try {
//       const companyData = { ...req.body };

//       ['area', 'shiftTiming', 'location'].forEach(field => {
//         safeParseJSONField(companyData, field);
//       });

//       // Replace main property image if new one uploaded
//       if (req.files && req.files['property_images'] && req.files['property_images'][0]) {
//         companyData.property_images = [
//           `/uploads/customers/${req.files['property_images'][0].filename}`,
//         ];
//       }

//       // Multi images update: keep existingImages + add new files based on newImagesCount
//       if (req.files && req.files['property_multi_images'] && companyData.area) {
//         const multiFiles = req.files['property_multi_images'];
//         let fileIndex = 0;

//         companyData.area.forEach(area => {
//           if (!Array.isArray(area.objects)) return;
//           area.objects.forEach(obj => {
//             const count = Number(obj.newImagesCount) || 0;
//             const existing = Array.isArray(obj.existingImages) ? obj.existingImages : [];

//             const newImages = [];
//             for (let i = 0; i < count && fileIndex < multiFiles.length; i++) {
//               const file = multiFiles[fileIndex++];
//               newImages.push(`/uploads/customers/${file.filename}`);
//             }

//             obj.property_multi_images = [...existing, ...newImages];
//             delete obj.newImagesCount;
//             delete obj.existingImages;
//           });
//         });
//       }

//       const company = await CompanyDetails.findByIdAndUpdate(req.params.id, companyData, { new: true, runValidators: true })
//         .populate('factoryName', 'property_type')
//         .populate({ path: 'area.objects.frequency area.objects.employee area.objects.serviceType area.objects.shiftName area.objects.specialTalent' })
//         .exec();

//       if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

//       return res.status(200).json({ success: true, message: 'Company updated successfully', company });
//     } catch (error) {
//       console.error('Error updating company:', error);
//       return res.status(400).json({ success: false, message: error.message });
//     }
//   },
// ];

// // Delete company
// exports.deleteCompany = async (req, res) => {
//   try {
//     const company = await CompanyDetails.findByIdAndDelete(req.params.id).exec();
//     if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
//     return res.status(200).json({ success: true, message: 'Company deleted successfully' });
//   } catch (error) {
//     console.error('deleteCompany Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
