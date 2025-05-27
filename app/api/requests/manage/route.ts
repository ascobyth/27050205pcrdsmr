import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RequestList } from "@/models";
import { ErList } from "@/models";
import { TestingSample } from "@/models";
const Capability = require("@/models/Capability");
const AsrList = require("@/models/AsrList");

// GET endpoint to retrieve all requests with filters
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const capability = searchParams.get("capability");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter: any = {};
    
    if (status && status !== "all") {
      // Map frontend status values to database status values
      let dbStatus = status;
      if (status === "pending receive sample") {
        dbStatus = "Pending Receive";
      } else if (status === "in-progress") {
        dbStatus = "In-progress";
      } else if (status === "completed") {
        dbStatus = "Completed";
      } else if (status === "rejected") {
        dbStatus = "Rejected";
      } else if (status === "terminated") {
        dbStatus = "TERMINATED";
      }
      filter.requestStatus = dbStatus;
    }
    
    if (priority && priority !== "all") {
      filter.priority = priority;
    }
    
    if (type && type !== "all") {
      filter.type = type;
    }
    
    // Prepare search and capability filters separately to avoid conflicts
    const searchFilters = [];
    const capabilityFilters = [];
    
    // Handle search filter
    if (search) {
      searchFilters.push(
        { requestTitle: { $regex: search, $options: 'i' } },
        { requesterName: { $regex: search, $options: 'i' } },
        { requestNumber: { $regex: search, $options: 'i' } }
      );
    }
    
    // Handle capability filter
    if (capability && capability !== "all") {
      // Check if it's a predefined category ID (like "rheology", "microstructure")
      const predefinedCategories = {
        "rheology": "Rheology",
        "microstructure": "Microstructure", 
        "smallmolecules": "Small molecules",
        "mesostructure": "Mesostructure",
        "imaging": "Imaging",
        "rd": "R&D"
      };
      
      if (predefinedCategories[capability]) {
        // Filter by predefined category name
        const capabilityName = predefinedCategories[capability];
        capabilityFilters.push({ jsonTestingList: { $regex: `"capabilityName":"${capabilityName}"`, $options: 'i' } });
      } else {
        // Try to find the capability by MongoDB ObjectId
        try {
          const capabilityDoc = await Capability.findById(capability);
          if (capabilityDoc) {
            capabilityFilters.push(
              { jsonTestingList: { $regex: `"capabilityId":"${capability}"`, $options: 'i' } },
              { jsonTestingList: { $regex: `"capabilityName":"${capabilityDoc.capabilityName}"`, $options: 'i' } }
            );
          } else {
            // If not found by ID, try to match by name
            capabilityFilters.push({ jsonTestingList: { $regex: `"capabilityName":"${capability}"`, $options: 'i' } });
          }
        } catch (e) {
          // Invalid ObjectId, try to match by name
          capabilityFilters.push({ jsonTestingList: { $regex: `"capabilityName":"${capability}"`, $options: 'i' } });
        }
      }
    }
    
    // Combine search and capability filters
    if (searchFilters.length > 0 && capabilityFilters.length > 0) {
      // Both search and capability filters are active - need to combine them properly
      filter.$and = [
        { $or: searchFilters },
        { $or: capabilityFilters }
      ];
    } else if (searchFilters.length > 0) {
      // Only search filter is active
      filter.$or = searchFilters;
    } else if (capabilityFilters.length > 0) {
      // Only capability filter is active
      filter.$or = capabilityFilters;
    }
    
    // Fetch data from the appropriate collections based on request type
    let regularRequests = [];
    let asrRequests = [];
    let erRequests = [];
    
    // If type is "all" or "ntr", fetch from RequestList
    if (type === "all" || type === "ntr") {
      const regularFilter = { ...filter };
      
      regularRequests = await RequestList.find(regularFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      // Transform the data to match the expected format
      regularRequests = regularRequests.map(req => {
        // Parse capability from jsonTestingList
        let capability = "Unknown";
        try {
          if (req.jsonTestingList) {
            const testingList = JSON.parse(req.jsonTestingList);
            if (testingList && testingList.length > 0) {
              capability = testingList[0].capabilityName || "Unknown";
            }
          }
        } catch (e) {
          console.error("Error parsing jsonTestingList:", e);
        }

        // Map database status to frontend expected values
        let frontendStatus = req.requestStatus || "pending";
        if (req.requestStatus === "Pending Receive") {
          frontendStatus = "pending receive sample";
        } else if (req.requestStatus === "In-progress") {
          frontendStatus = "in-progress";
        } else if (req.requestStatus === "Completed") {
          frontendStatus = "completed";
        } else if (req.requestStatus === "Rejected") {
          frontendStatus = "rejected";
        } else if (req.requestStatus === "TERMINATED") {
          frontendStatus = "terminated";
        }

        return {
          id: req.requestNumber,
          title: req.requestTitle || "Untitled Request",
          type: "NTR", // All requests in request_lists are NTR requests
          capability: capability,
          status: frontendStatus,
          priority: req.priority || "medium",
          requester: req.requesterName || "Unknown",
          requestDate: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Unknown",
          dueDate: req.due_date ? new Date(req.due_date).toLocaleDateString() : "",
          assignedTo: req.assigned_to || "Unassigned",
          progress: req.progress || 0,
          samples: req.sample_count || 0,
          department: req.department || "Unknown",
          description: req.description || "No description",
        };
      });
    }
    
    // If type is "all" or "asr", fetch from AsrList
    if (type === "all" || type === "asr") {
      // Build ASR-specific filter
      const asrFilter: any = {};
      
      // Handle status filter for ASR
      if (status && status !== "all") {
        let dbStatus = status;
        if (status === "pending receive sample") {
          dbStatus = "submitted"; // ASR uses "submitted" instead of "Pending Receive"
        } else if (status === "in-progress") {
          dbStatus = "in-progress";
        } else if (status === "completed") {
          dbStatus = "completed";
        } else if (status === "rejected") {
          dbStatus = "rejected";
        } else if (status === "terminated") {
          dbStatus = "terminated";
        }
        asrFilter.asrStatus = dbStatus;
      }
      
      // Handle priority filter for ASR (if it exists)
      if (priority && priority !== "all") {
        asrFilter.priority = priority;
      }
      
      // Handle capability filter for ASR
      if (capability && capability !== "all") {
        const predefinedCategories = {
          "rheology": "Rheology",
          "microstructure": "Microstructure", 
          "smallmolecules": "Small molecules",
          "mesostructure": "Mesostructure",
          "imaging": "Imaging",
          "rd": "R&D"
        };
        
        if (predefinedCategories[capability]) {
          // Find capability by name and use its ObjectId
          const capabilityDoc = await Capability.findOne({ capabilityName: predefinedCategories[capability] });
          if (capabilityDoc) {
            asrFilter.capabilityId = capabilityDoc._id;
          }
        } else {
          // Try to use capability directly as ObjectId
          try {
            asrFilter.capabilityId = capability;
          } catch (e) {
            // Invalid ObjectId, skip this filter
          }
        }
      }
      
      // Handle search filter for ASR
      if (search) {
        asrFilter.$or = [
          { asrName: { $regex: search, $options: 'i' } },
          { requesterName: { $regex: search, $options: 'i' } },
          { asrNumber: { $regex: search, $options: 'i' } },
        ];
      }
      
      asrRequests = await AsrList.find(asrFilter)
        .populate('capabilityId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      // Transform ASR data to match the expected format
      asrRequests = asrRequests.map(req => {
        // Map ASR status to frontend expected values
        let frontendStatus = req.asrStatus || "pending";
        if (req.asrStatus === "submitted") {
          frontendStatus = "pending receive sample";
        } else if (req.asrStatus === "in-progress") {
          frontendStatus = "in-progress";
        } else if (req.asrStatus === "completed") {
          frontendStatus = "completed";
        } else if (req.asrStatus === "rejected") {
          frontendStatus = "rejected";
        } else if (req.asrStatus === "terminated") {
          frontendStatus = "terminated";
        }

        return {
          id: req.asrNumber,
          title: req.asrName || "Untitled ASR",
          type: "ASR",
          capability: req.capabilityId?.capabilityName || req.capabilityId?.name || "R&D", // Default to R&D for null capability
          status: frontendStatus,
          priority: req.priority || "normal",
          requester: req.requesterName || "Unknown",
          requestDate: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Unknown",
          dueDate: req.asrRequireDate ? new Date(req.asrRequireDate).toLocaleDateString() : "",
          assignedTo: req.asrOwnerName || "Unassigned",
          progress: frontendStatus === "completed" ? 100 : frontendStatus === "in-progress" ? 50 : 10,
          samples: 0, // ASR doesn't track individual samples the same way
          department: req.requesterCostCenter || "Unknown",
          description: req.asrDetail || "No description",
        };
      });
    }
    
    // If type is "all" or "er", fetch from ErList
    if (type === "all" || type === "er") {
      const erFilter = { ...filter };
      if (type === "er") {
        erFilter.request_number = { $regex: /-ER-/ };
      } else if (type === "all") {
        erFilter.request_number = { $regex: /-ER-/ };
      }
      
      erRequests = await ErList.find(erFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      // Transform the data to match the expected format
      erRequests = erRequests.map(req => ({
        id: req.request_number,
        title: req.title || `${req.equipment_name} Reservation`,
        type: "ER",
        capability: req.capability_name || "Unknown",
        status: req.status || "pending",
        priority: req.priority || "medium",
        requester: req.requester_name || "Unknown",
        requestDate: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Unknown",
        dueDate: req.reservation_date ? new Date(req.reservation_date).toLocaleDateString() : "",
        assignedTo: req.assigned_to || "Unassigned",
        progress: 0, // ER requests don't have progress
        samples: 0, // ER requests don't have samples
        department: req.department || "Unknown",
        description: req.description || "No description",
        equipment: req.equipment_name || "Unknown Equipment",
      }));
    }
    
    // Combine and sort the results
    const combinedRequests = [...regularRequests, ...asrRequests, ...erRequests]
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    
    // Get total count for pagination (using filtered data)
    const totalRegularCount = type === "er" || type === "asr" ? 0 : await RequestList.countDocuments(filter);
    const totalAsrCount = type === "er" || type === "ntr" ? 0 : await AsrList.countDocuments({});
    const totalErCount = type === "ntr" || type === "asr" ? 0 : await ErList.countDocuments({});
    const totalCount = totalRegularCount + totalAsrCount + totalErCount;
    
    // Get GRAND total count for "All Capabilities" (without any filters, always include all types)
    const grandTotalRegular = await RequestList.countDocuments({});
    const grandTotalAsr = await AsrList.countDocuments({});
    const grandTotalEr = await ErList.countDocuments({});
    const grandTotal = grandTotalRegular + grandTotalAsr + grandTotalEr;
    
    // Fetch all capabilities for the filter sidebar
    const capabilities = await Capability.find({}).lean();
    
    // Calculate capability counts - aggregate by capability name
    let capabilityCounts = {};
    
    // Count capabilities from regular requests (NTR)
    if (type === "all" || type === "ntr") {
      const allRequests = await RequestList.find({}).lean();
      
      allRequests.forEach(req => {
        try {
          if (req.jsonTestingList) {
            const testingList = JSON.parse(req.jsonTestingList);
            if (testingList && testingList.length > 0) {
              const capName = testingList[0].capabilityName;
              if (capName) {
                capabilityCounts[capName] = (capabilityCounts[capName] || 0) + 1;
              }
            }
          }
        } catch (e) {
          // Skip malformed JSON
        }
      });
    }
    
    // Count capabilities from ASR requests
    if (type === "all" || type === "asr") {
      const allAsrRequests = await AsrList.find({}).populate('capabilityId').lean();
      
      allAsrRequests.forEach(req => {
        if (req.capabilityId && req.capabilityId.capabilityName) {
          const capName = req.capabilityId.capabilityName;
          capabilityCounts[capName] = (capabilityCounts[capName] || 0) + 1;
        } else {
          // Handle ASR requests without capability (default to R&D)
          const capName = "R&D";
          capabilityCounts[capName] = (capabilityCounts[capName] || 0) + 1;
        }
      });
    }
    
    // Count capabilities from ER requests
    if (type === "all" || type === "er") {
      const erCapabilityAggregation = await ErList.aggregate([
        { $match: {} },
        {
          $group: {
            _id: "$capability_name",
            count: { $sum: 1 }
          }
        }
      ]);
      
      erCapabilityAggregation.forEach(item => {
        if (item._id) {
          capabilityCounts[item._id] = (capabilityCounts[item._id] || 0) + item.count;
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: combinedRequests,
      capabilities: capabilities.map(cap => ({
        id: cap._id.toString(),
        name: cap.capabilityName,
        shortName: cap.shortName,
        description: cap.capabilityDesc
      })),
      capabilityCounts,
      grandTotal: grandTotal, // Add grand total for "All Capabilities"
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a request's status
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { id, status, note } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Request ID and status are required" },
        { status: 400 }
      );
    }
    
    // Map frontend status to database status
    let dbStatus = status;
    if (status === "pending receive sample") {
      dbStatus = "Pending Receive";
    } else if (status === "in-progress") {
      dbStatus = "In-progress";
    } else if (status === "completed") {
      dbStatus = "Completed";
    } else if (status === "rejected") {
      dbStatus = "Rejected";
    } else if (status === "terminated") {
      dbStatus = "TERMINATED";
    }

    // Determine if it's an ER request or regular request
    const isErRequest = id.includes("-ER-");
    
    let updatedRequest;
    
    if (isErRequest) {
      updatedRequest = await ErList.findOneAndUpdate(
        { request_number: id },
        { 
          status: dbStatus,
          ...(note && { note })
        },
        { new: true }
      );
    } else {
      updatedRequest = await RequestList.findOneAndUpdate(
        { requestNumber: id },
        { 
          requestStatus: dbStatus,
          ...(note && { note })
        },
        { new: true }
      );
    }
    
    if (!updatedRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update request" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update multiple requests' statuses
export async function PUT(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { ids, status, note } = body;
    
    if (!ids || !ids.length || !status) {
      return NextResponse.json(
        { success: false, error: "Request IDs and status are required" },
        { status: 400 }
      );
    }
    
    // Map frontend status to database status
    let dbStatus = status;
    if (status === "pending receive sample") {
      dbStatus = "Pending Receive";
    } else if (status === "in-progress") {
      dbStatus = "In-progress";
    } else if (status === "completed") {
      dbStatus = "Completed";
    } else if (status === "rejected") {
      dbStatus = "Rejected";
    } else if (status === "terminated") {
      dbStatus = "TERMINATED";
    }

    // Split IDs into ER and regular requests
    const erIds = ids.filter((id: string) => id.includes("-ER-"));
    const regularIds = ids.filter((id: string) => !id.includes("-ER-"));
    
    let erUpdates = { count: 0 };
    let regularUpdates = { count: 0 };
    
    // Update ER requests
    if (erIds.length > 0) {
      const result = await ErList.updateMany(
        { request_number: { $in: erIds } },
        { 
          status: dbStatus,
          ...(note && { note }),
          updatedAt: new Date()
        }
      );
      erUpdates = { count: result.modifiedCount };
    }
    
    // Update regular requests
    if (regularIds.length > 0) {
      const result = await RequestList.updateMany(
        { requestNumber: { $in: regularIds } },
        { 
          requestStatus: dbStatus,
          ...(note && { note }),
          updatedAt: new Date()
        }
      );
      regularUpdates = { count: result.modifiedCount };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        erUpdates,
        regularUpdates,
        totalUpdated: erUpdates.count + regularUpdates.count
      }
    });
  } catch (error) {
    console.error("Error updating requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update requests" },
      { status: 500 }
    );
  }
}
