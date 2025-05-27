import { NextResponse } from 'next/server';
import connectToDatabase, { mongoose } from '@/lib/db';

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

/**
 * API route handler for submitting NTR requests
 * @param {Request} request - The HTTP request object
 * @returns {Promise<NextResponse>} The HTTP response
 */
export async function POST(request) {
  let session = null;

  try {
    // Connect to the database
    await connectToDatabase();

    // Parse the request body
    const body = await request.json();
    console.log('API received NTR submission data:', body);

    // Generate a unique request number (format: NTR-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const latestRequest = await RequestList.findOne({
      requestNumber: { $regex: `NTR-${currentYear}-` }
    }).sort({ requestNumber: -1 });

    let requestNumber;
    if (latestRequest) {
      const lastNumber = parseInt(latestRequest.requestNumber.split('-')[2]);
      requestNumber = `NTR-${currentYear}-${(lastNumber + 1).toString().padStart(4, '0')}`;
    } else {
      requestNumber = `NTR-${currentYear}-0001`;
    }

    try {
      // Log the received data for debugging
      console.log('Received request data:', {
        requestTitle: body.requestTitle,
        useIONumber: body.useIONumber,
        ioNumber: body.ioNumber,
        costCenter: body.costCenter,
        priority: body.priority,
        urgentType: body.urgentType,
        urgencyReason: body.urgencyReason,
        approver: body.approver,
        requester: body.requester,
      });

      // Create the main request entry exactly matching the RequestList schema
      // Ensure all user-entered data is correctly used
      const requestData = {
        // Core request identification
        requestNumber,
        requestStatus: 'Pending Receive',

        // Request details - use the exact title entered by the user
        requestTitle: body.requestTitle || 'New Test Request',

        // Cost information - use the exact values entered by the user
        useIoNumber: body.useIONumber === 'yes',
        ioCostCenter: body.useIONumber === 'yes' ? body.ioNumber : null,
        requesterCostCenter: body.costCenter || '',

        // Priority settings - use the exact values entered by the user
        priority: body.priority || 'normal',
        urgentType: body.urgentType || '',
        urgencyReason: body.urgencyReason || '',

        // Approval information - use the exact approver selected by the user
        approver: body.approver ? {
          name: body.approver.name || '',
          email: body.approver.email || ''
        } : null,

        // Document uploads - use the file uploaded by the user if available
        urgentRequestDocument: body.urgentMemo || '',

        // Sample and testing information (stored as JSON strings)
        jsonSampleList: JSON.stringify(body.samples || []),
        jsonTestingList: JSON.stringify(body.testMethods || []),

        // Results and evaluation
        datapool: '',
        returnSampleAddress: '',
        evaluationScore: '',

        // ASR project reference
        asrId: '',
        isAsrRequest: body.isAsrRequest || false,

        // Requester information - use the authenticated user information
        requesterName: body.requester?.name || 'Anonymous',
        requesterEmail: body.requester?.email || 'anonymous@example.com',

        // On behalf information
        isOnBehalf: body.isOnBehalf || false,
        onBehalfOfName: body.onBehalfOfName || '',
        onBehalfOfEmail: body.onBehalfOfEmail || '',
        onBehalfOfCostCenter: body.onBehalfOfCostCenter || '',

        // Support staff
        supportStaff: body.supportStaff || '',

        // Important dates - only set submissionDate for now
        // receiveDate, completeDate, terminateDate, and cancelDate will be set later

        // PPC member list
        ppcMemberList: body.ppcMemberList || '',

        // Tech sprint flag
        isTechsprint: body.isTechsprint || false
      };

      console.log('Creating request with data:', requestData);

      // Create the request without using a session
      const newRequest = await RequestList.create(requestData);
      console.log('Created request:', newRequest);

      const requestId = newRequest._id;

      // Create testing sample entries for each sample and test method combination
      const testingSamplePromises = [];

      // Only process active (non-deleted) methods
      const activeMethods = body.testMethods.filter(method => !method.isDeleted);

      for (const method of activeMethods) {
        for (const sampleName of method.samples) {
          // Find the corresponding sample object
          // In the NTR page, samples have generatedName but not name
          const sample = body.samples.find(s =>
            (s.generatedName === sampleName) ||
            (s.name === sampleName)
          );

          if (sample) {
            // Generate a unique testing list ID
            const testingListId = `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const testingId = `T-${method.id}-${Math.floor(Math.random() * 10000)}`;
            const sampleId = `S-${sample.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Log the sample and method data for debugging
            console.log('Processing sample:', {
              sampleName: sample.name || sample.generatedName,
              sampleId: sampleId,
              category: sample.category,
              methodName: method.name,
              methodId: method.id,
            });

            // Create testing sample data exactly matching the TestingSampleList schema
            // Ensure all user-entered data is correctly used
            const testingSampleData = {
              // Request references
              requestId,
              requestNumber,

              // Equipment information - use the exact equipment selected by the user
              equipmentName: method.equipmentName || '',
              equipmentId: method.equipmentId || null,

              // Sample identification - use the exact sample details entered by the user
              sampleId,
              sampleName: sample.name || sample.generatedName,
              sysSampleName: sample.generatedName || '',
              fullSampleName: sample.name || sample.generatedName,
              remark: sample.remark || '',

              // Testing method information - use the exact method details entered by the user
              methodCode: method.methodCode || '',
              methodId: method.id || null,
              testingRemark: method.remarks || method.testingRemark || '',
              testingCost: method.price ? method.price.toString() : '0',

              // Capability information - use the exact capability selected by the user
              capabilityId: method.capabilityId || null,

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
              dueDate: method.turnaround ? new Date(Date.now() + method.turnaround * 24 * 60 * 60 * 1000) : null,

              // Request type
              requestType: 'NTR',

              // Personnel tracking
              receiveBy: '',
              operationCompleteBy: '',
              entryResultBy: '',
              requestCompleteBy: '',

              // Equipment reservation
              startReserveTime: null,
              endReserveTime: null,

              // Additional flags
              checkAC: false
            };

            testingSamplePromises.push(TestingSampleList.create(testingSampleData));
          }
        }
      }

      // Wait for all testing sample entries to be created
      await Promise.all(testingSamplePromises);

      return NextResponse.json({
        success: true,
        data: {
          requestNumber,
          requestId: requestId.toString()
        }
      }, { status: 201 });
    } catch (error) {
      console.error('Error in try block:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error submitting NTR request:', error);

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

    // Handle model compilation errors
    if (error.message && error.message.includes('Schema hasn\'t been registered')) {
      return NextResponse.json(
        { success: false, error: 'Database schema error: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit NTR request',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
