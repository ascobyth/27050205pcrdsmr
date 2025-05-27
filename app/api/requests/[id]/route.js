import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';

// Import models directly from the models directory
const RequestList = mongoose.models.RequestList || require('@/models/RequestList');
const ErList = mongoose.models.ErList || require('@/models/ErList');
const TestingSampleList = mongoose.models.TestingSampleList || require('@/models/TestingSampleList');

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;

    // Try to find by requestNumber first (for evaluation API)
    let requestData = await RequestList.findOne({ requestNumber: id });

    // If not found, try by _id
    if (!requestData) {
      requestData = await RequestList.findById(id);
    }

    // If still not found, try in ErList by requestNumber
    if (!requestData) {
      requestData = await ErList.findOne({ requestNumber: id });
    }

    // If still not found, try in ErList by _id
    if (!requestData) {
      requestData = await ErList.findById(id);
    }

    if (!requestData) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: requestData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await request.json();
    console.log('API received request update data:', body);

    // Check if this is an NTR request update (has samples and testMethods)
    const isNtrUpdate = body.samples && body.testMethods;

    if (isNtrUpdate) {
      // Handle NTR request update with transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Find the existing request by request number
        const existingRequest = await RequestList.findOne({ requestNumber: id }).session(session);

        if (!existingRequest) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json(
            { success: false, error: 'Request not found' },
            { status: 404 }
          );
        }

        // Update the main request entry
        const updateData = {
          requestTitle: body.requestTitle,
          useIoNumber: body.useIONumber === 'yes',
          ioCostCenter: body.ioNumber,
          requesterCostCenter: body.costCenter,
          priority: body.priority,
          urgentType: body.urgentType,
          urgencyReason: body.urgencyReason,
          jsonSampleList: JSON.stringify(body.samples),
          jsonTestingList: JSON.stringify(body.testMethods),
          updatedAt: new Date(),
        };

        await RequestList.updateOne(
          { requestNumber: id },
          { $set: updateData },
          { session }
        );

        // Delete existing testing sample entries for this request
        await TestingSampleList.deleteMany(
          { requestNumber: id },
          { session }
        );

        // Create new testing sample entries for each sample and test method combination
        const testingSamplePromises = [];

        // Only process active (non-deleted) methods
        const activeMethods = body.testMethods.filter(method => !method.isDeleted);
        console.log('Processing active methods:', activeMethods.length);

        for (const method of activeMethods) {
          console.log('Processing method:', method.name, 'with samples:', method.samples);
          for (const sampleName of method.samples) {
            // Find the corresponding sample object
            const sample = body.samples.find(s =>
              (s.name === sampleName) || (s.generatedName === sampleName)
            );

            if (sample) {
              // Generate unique IDs for required fields
              const sampleId = `${id}-${sample.generatedName || sample.name}-${method.id || method.methodCode}-${Date.now()}`;
              const testingListId = `TL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const testingId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              const testingSampleData = {
                // Required fields
                requestId: existingRequest._id, // Reference to the RequestList document
                requestNumber: id,
                sampleId: sampleId,
                sampleName: sample.generatedName || sample.name,
                testingListId: testingListId,
                testingId: testingId,
                sampleStatus: 'Pending Receive',

                // Method information
                methodCode: method.methodCode || method.id,
                methodId: method.methodId || method.id, // If available
                testingRemark: method.remarks || '',
                testingCost: (method.price || 0).toString(),

                // Capability information
                capabilityId: method.capabilityId || null,
                capabilityName: method.capabilityName || method.category || 'Unknown',

                // Sample details
                remark: sample.remark || '',

                // Request type
                requestType: 'NTR',

                // Dates
                submitDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              testingSamplePromises.push(
                TestingSampleList.create([testingSampleData], { session })
              );
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
            requestNumber: id,
            message: 'Request updated successfully'
          }
        }, { status: 200 });
      } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        session.endSession();
        console.error('Transaction error during NTR update:', error);
        console.error('Error stack:', error.stack);
        throw error;
      }
    } else {
      // Handle simple request update (for ER requests or basic updates)
      const isErRequest = body.requestNumber && body.requestNumber.includes('-ER-');
      const Model = isErRequest ? ErList : RequestList;

      const updatedRequest = await Model.findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true
      });

      if (!updatedRequest) {
        return NextResponse.json(
          { success: false, error: 'Request not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: updatedRequest }, { status: 200 });
    }
  } catch (error) {
    console.error('Error updating request:', error);
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
      { success: false, error: 'Failed to update request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;

    // Try to delete from RequestList first
    let deletedRequest = await RequestList.findByIdAndDelete(id);

    // If not found, try in ErList
    if (!deletedRequest) {
      deletedRequest = await ErList.findByIdAndDelete(id);
    }

    if (!deletedRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
