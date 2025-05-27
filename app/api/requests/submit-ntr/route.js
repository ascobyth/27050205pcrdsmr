import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';

// Clear model cache to ensure we get the latest schema
if (mongoose.models.TestingSampleList) {
  delete mongoose.models.TestingSampleList;
}
if (mongoose.models.RequestList) {
  delete mongoose.models.RequestList;
}

// Import models directly from the models directory
const RequestList = mongoose.models.RequestList || require('@/models/RequestList');
const TestingSampleList = mongoose.models.TestingSampleList || require('@/models/TestingSampleList');

export async function POST(request) {
  try {
    await dbConnect();

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

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the main request entry
      const requestData = {
        requestNumber,
        requestStatus: 'Pending Receive',
        requestTitle: body.requestTitle,
        useIoNumber: body.useIONumber === 'yes',
        ioCostCenter: body.ioNumber,
        requesterCostCenter: body.costCenter,
        priority: body.priority,
        urgentType: body.urgentType,
        urgencyReason: body.urgencyReason,
        requesterName: body.requester.name,
        requesterEmail: body.requester.email,
        jsonSampleList: JSON.stringify(body.samples),
        jsonTestingList: JSON.stringify(body.testMethods),
        submissionDate: new Date(),
      };

      const newRequest = await RequestList.create([requestData], { session });
      const requestId = newRequest[0]._id;

      // Create testing sample entries for each sample and test method combination
      const testingSamplePromises = [];

      // Only process active (non-deleted) methods
      const activeMethods = body.testMethods.filter(method => !method.isDeleted);

      for (const method of activeMethods) {
        for (const sampleName of method.samples) {
          // Find the corresponding sample object
          const sample = body.samples.find(s =>
            (s.name === sampleName) || (s.generatedName === sampleName)
          );

          if (sample) {
            // Generate a unique testing list ID
            const testingListId = `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const testingId = `T-${method.id}-${Math.floor(Math.random() * 10000)}`;
            const sampleId = `S-${sample.id || Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const testingSampleData = {
              requestId,
              requestNumber,
              methodId: method.id,
              methodCode: method.methodCode,
              testingCost: method.price.toString(),
              capabilityId: method.capabilityId,
              sampleId,
              sampleName: sample.name || sample.generatedName,
              sysSampleName: sample.generatedName,
              fullSampleName: sample.name || sample.generatedName,
              remark: sample.remark || '',
              testingRemark: method.remarks || '',
              testingListId,
              testingId,
              sampleStatus: 'Pending Receive',
              submitDate: new Date(),
              requestType: 'NTR',
            };

            testingSamplePromises.push(TestingSampleList.create([testingSampleData], { session }));
          }
        }
      }

      // Wait for all testing sample entries to be created
      await Promise.all(testingSamplePromises);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        data: {
          requestNumber,
          requestId: requestId.toString()
        }
      }, { status: 201 });
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting NTR request:', error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

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
