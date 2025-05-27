import { NextResponse } from 'next/server';
import connectToDatabase, { mongoose } from '@/lib/db';
import crypto from 'crypto';

// Clear model cache to ensure we get the latest schema
if (mongoose.models.TestingSampleList) {
  delete mongoose.models.TestingSampleList;
}
if (mongoose.models.RequestList) {
  delete mongoose.models.RequestList;
}

// Import models directly
const RequestList = mongoose.models.RequestList || require('@/models/RequestList');
const TestingSampleList = mongoose.models.TestingSampleList || require('@/models/TestingSampleList');
const Capability = mongoose.models.Capability || require('@/models/Capability');
const Io = mongoose.models.Io || require('@/models/Io');
const TestingMethod = mongoose.models.TestingMethod || require('@/models/TestingMethod');
const User = mongoose.models.User ? mongoose.models.User : (require('@/models/User').User);

/**
 * API route handler for submitting NTR requests
 * This implementation splits requests by capability when a TestingMethod belongs to multiple capabilities
 *
 * @param {Request} request - The HTTP request object
 * @returns {Promise<NextResponse>} The HTTP response
 */
export async function POST(request) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Parse the request body
    const body = await request.json();
    console.log('API received request submission data:', body);

    try {
      // Group test methods by capability
      const methodsByCapability = await groupMethodsByCapability(body.testMethods);
      console.log('Methods grouped by capability:', methodsByCapability);

      // Generate request numbers for each capability
      const requestNumbers = await generateRequestNumbers(methodsByCapability, body.priority);
      console.log('Generated request numbers:', requestNumbers);

      // Create requests for each capability
      const createdRequests = await createRequests(body, methodsByCapability, requestNumbers);
      console.log('Created requests:', createdRequests);

      // Create testing sample entries for each capability
      const testingSamples = await createTestingSamples(body, methodsByCapability, requestNumbers, createdRequests);
      console.log('Created testing samples:', testingSamples);

      // Return success response with the created request numbers
      return NextResponse.json({
        success: true,
        data: {
          requestNumbers: Object.values(requestNumbers),
          requestIds: createdRequests.map(req => req._id.toString())
        }
      }, { status: 201 });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error submitting request:', error);

    // Log detailed error information
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'A request with that number already exists' },
        { status: 400 }
      );
    }

    // Return generic error for other cases
    return NextResponse.json(
      { success: false, error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}

/**
 * Group test methods by capability
 * @param {Array} testMethods - Array of test methods
 * @returns {Promise<Object>} - Object with capability IDs as keys and arrays of test methods as values
 */
async function groupMethodsByCapability(testMethods) {
  const methodsByCapability = {};

  // Only process active (non-deleted) methods
  const activeMethods = testMethods.filter(method => !method.isDeleted);

  // Fetch all capabilities to get their shortNames
  const capabilities = await Capability.find({});
  const capabilityMap = {};
  capabilities.forEach(cap => {
    capabilityMap[cap._id.toString()] = cap;
  });

  // Group methods by capability
  for (const method of activeMethods) {
    if (method.capabilityId) {
      const capabilityId = method.capabilityId.toString();
      if (!methodsByCapability[capabilityId]) {
        methodsByCapability[capabilityId] = {
          methods: [],
          capability: capabilityMap[capabilityId]
        };
      }
      methodsByCapability[capabilityId].methods.push(method);
    }
  }

  return methodsByCapability;
}

/**
 * Generate request numbers for each capability
 * @param {Object} methodsByCapability - Object with capability IDs as keys and arrays of test methods as values
 * @param {string} priority - Priority of the request ('normal' or 'urgent')
 * @returns {Promise<Object>} - Object with capability IDs as keys and request numbers as values
 */
async function generateRequestNumbers(methodsByCapability, priority) {
  const requestNumbers = {};
  const currentDate = new Date();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = String(currentDate.getFullYear()).slice(-2);
  const mmyy = `${month}${year}`;

  // Priority code: 'N' for normal, 'E' for urgent
  const priorityCode = priority === 'urgent' ? 'E' : 'N';

  for (const capabilityId in methodsByCapability) {
    const capability = methodsByCapability[capabilityId].capability;

    // Get the capability's short name
    const shortName = capability.shortName;

    // Get the current run number and increment it
    let runNumber = capability.reqRunNo || 1;

    // Format the run number with leading zeros (5 digits)
    const formattedRunNumber = String(runNumber).padStart(5, '0');

    // Generate the request number in the format XX-Y-MMYY-NNNNN
    const requestNumber = `${shortName}-${priorityCode}-${mmyy}-${formattedRunNumber}`;

    // Store the request number
    requestNumbers[capabilityId] = requestNumber;

    // Update the capability's run number
    await Capability.findByIdAndUpdate(
      capabilityId,
      { $set: { reqRunNo: runNumber + 1 } }
    );
  }

  return requestNumbers;
}

/**
 * Create requests for each capability
 * @param {Object} body - Request body
 * @param {Object} methodsByCapability - Object with capability IDs as keys and arrays of test methods as values
 * @param {Object} requestNumbers - Object with capability IDs as keys and request numbers as values
 * @returns {Array} - Array of created requests
 */
async function createRequests(body, methodsByCapability, requestNumbers) {
  const createdRequests = [];

  // Get IO information if using IO number
  let ioInfo = null;
  if (body.useIONumber === 'yes' && body.ioNumber) {
    ioInfo = await Io.findOne({ ioNo: body.ioNumber });
  }

  // Create a request for each capability
  for (const capabilityId in methodsByCapability) {
    const requestNumber = requestNumbers[capabilityId];
    const capability = methodsByCapability[capabilityId].capability;
    const methods = methodsByCapability[capabilityId].methods;

    // Create the request data
    const requestData = {
      // Core request identification
      requestNumber,
      requestStatus: 'Pending Receive', // Using the correct status for new requests

      // Request details
      requestTitle: body.requestTitle,

      // Cost information
      useIoNumber: body.useIONumber === 'yes',
      ioCostCenter: ioInfo ? ioInfo.costCenter : null,
      requesterCostCenter: body.costCenter,

      // Priority settings
      priority: body.priority,
      urgentType: body.urgentType,
      urgencyReason: body.urgencyReason,

      // Approval information
      approver: body.approver,

      // Document uploads
      urgentRequestDocument: body.urgentRequestDocument,

      // Sample and testing information
      jsonSampleList: JSON.stringify(body.samples),
      jsonTestingList: JSON.stringify(methods),

      // Create a folder for test results
      datapool: `/data/requests/${requestNumber}`,

      // Results and evaluation
      returnSampleAddress: null,
      evaluationScore: null,

      // ASR project reference
      asrId: null,
      isAsrRequest: false,

      // Requester information
      requesterName: body.requester.name,
      requesterEmail: body.requester.email,

      // On behalf information
      isOnBehalf: body.isOnBehalf === 'yes',
      onBehalfOfName: body.onBehalfOfName,
      onBehalfOfEmail: body.onBehalfOfEmail,
      onBehalfOfCostCenter: body.onBehalfOfCostCenter,

      // Support staff
      supportStaff: null,

      // Important dates
      receiveDate: null,
      completeDate: null,
      terminateDate: null,
      cancelDate: null,

      // PPC member list
      ppcMemberList: null,

      // Tech sprint flag
      isTechsprint: ioInfo ? ioInfo.isTechsprint : false
    };

    // Create the request
    const newRequest = await RequestList.create(requestData);
    createdRequests.push(newRequest);
  }

  return createdRequests;
}

/**
 * Create testing sample entries for each capability
 * @param {Object} body - Request body
 * @param {Object} methodsByCapability - Object with capability IDs as keys and arrays of test methods as values
 * @param {Object} requestNumbers - Object with capability IDs as keys and request numbers as values
 * @param {Array} createdRequests - Array of created requests
 * @returns {Array} - Array of created testing samples
 */
async function createTestingSamples(body, methodsByCapability, requestNumbers, createdRequests) {
  const createdTestingSamples = [];

  // Create a map of request numbers to request IDs
  const requestMap = {};
  createdRequests.forEach(request => {
    requestMap[request.requestNumber] = request._id;
  });

  // Create testing sample entries for each capability
  for (const capabilityId in methodsByCapability) {
    const requestNumber = requestNumbers[capabilityId];
    const capability = methodsByCapability[capabilityId].capability;
    const methods = methodsByCapability[capabilityId].methods;
    const requestId = requestMap[requestNumber];

    // Process each method
    for (const method of methods) {
      // Generate a unique testing ID for this method
      const testingId = generateUniqueId();

      // Process each sample for this method
      for (const sampleName of method.samples) {
        // Find the corresponding sample object
        const sample = body.samples.find(s =>
          (s.generatedName === sampleName) ||
          (s.name === sampleName)
        );

        if (sample) {
          // Generate a unique sample ID for this sample
          const sampleId = generateUniqueId();

          // Generate a unique testing list ID for this record
          const testingListId = generateUniqueId();

          // Create the testing sample data
          const testingSampleData = {
            // Request references
            requestId,
            requestNumber,

            // Equipment information
            equipmentName: method.equipmentName || '',
            equipmentId: method.equipmentId || null,

            // Sample identification
            sampleId,
            sampleName: sample.generatedName || sample.name,
            sysSampleName: sample.generatedName || sample.name,
            fullSampleName: `${sample.generatedName || sample.name}_${method.methodCode || ''}`,
            remark: sample.remark || '',

            // Testing method information
            methodCode: method.methodCode || '',
            methodId: method.id || null,
            testingRemark: method.remarks || method.testingRemark || '',
            testingCost: method.price ? method.price.toString() : '0',

            // Capability information
            capabilityId,
            capabilityName: capability.capabilityName,

            // Testing identifiers
            testingListId,
            testingId,

            // Status tracking
            sampleStatus: 'Pending Receive',

            // Important dates
            submitDate: new Date(),
            receiveDate: null,
            operationCompleteDate: null,
            entryResultDate: null,
            approveDate: null,
            requestCompleteDate: null,
            dueDate: null,

            // Request type
            requestType: 'NTR',

            // Personnel tracking
            receiveBy: null,
            operationCompleteBy: null,
            entryResultBy: null,
            requestCompleteBy: null,

            // Equipment reservation
            startReserveTime: null,
            endReserveTime: null
          };

          // Create the testing sample
          const newTestingSample = await TestingSampleList.create(testingSampleData);
          createdTestingSamples.push(newTestingSample);
        }
      }
    }
  }

  return createdTestingSamples;
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
function generateUniqueId() {
  return crypto.randomBytes(4).toString('hex');
}
