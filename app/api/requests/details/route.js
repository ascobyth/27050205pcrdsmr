import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';

// Import models directly from the models directory
const RequestList = mongoose.models.RequestList || require('@/models/RequestList');
const ErList = mongoose.models.ErList || require('@/models/ErList');
const TestingSampleList = mongoose.models.TestingSampleList || require('@/models/TestingSampleList');

export async function GET(request) {
  try {
    await dbConnect();

    // Get the request ID from query params
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const requestNumber = searchParams.get('requestNumber');

    if (!requestId && !requestNumber) {
      return NextResponse.json({
        success: false,
        error: 'Request ID or request number is required'
      }, { status: 400 });
    }

    // Determine the model to use and find the request
    let requestData;
    let query = {};

    if (requestId) {
      // Try to find by ID first
      try {
        const objectId = new mongoose.Types.ObjectId(requestId);
        query = { _id: objectId };
      } catch (err) {
        // If not a valid ObjectId, assume it's a request number
        query = { requestNumber: requestId };
      }
    } else if (requestNumber) {
      query = { requestNumber };
    }

    // Check if it's an ER request based on the request number format
    if ((requestId && requestId.includes('-ER-')) || (requestNumber && requestNumber.includes('-ER-'))) {
      // This is an ER request
      requestData = await ErList.findOne(query);
    } else {
      // Try to find in RequestList first
      requestData = await RequestList.findOne(query);

      // If not found, try in ErList as a fallback
      if (!requestData) {
        requestData = await ErList.findOne(query);
      }
    }

    if (!requestData) {
      return NextResponse.json({
        success: false,
        error: 'Request not found'
      }, { status: 404 });
    }

    // Format the response data
    const formattedData = {
      id: requestData._id.toString(),
      requestNumber: requestData.requestNumber,
      title: requestData.requestTitle,
      status: requestData.requestStatus,
      type: requestData.isAsrRequest ? "ASR" : requestData.requestNumber?.includes('-ER-') ? "ER" : "NTR",
      priority: requestData.priority,
      description: requestData.description || "",
      requester: requestData.requesterName,
      requesterEmail: requestData.requesterEmail,
      department: requestData.department || "",
      requestDate: requestData.createdAt,
      dueDate: requestData.dueDate,
      receiveDate: requestData.receiveDate,
      completeDate: requestData.completeDate,
      isOnBehalf: requestData.isOnBehalf,
      onBehalfOfName: requestData.onBehalfOfName,
      onBehalfOfEmail: requestData.onBehalfOfEmail,
      useIoNumber: requestData.useIoNumber,
      ioCostCenter: requestData.ioCostCenter,
      requesterCostCenter: requestData.requesterCostCenter,
      urgentType: requestData.urgentType,
      urgencyReason: requestData.urgencyReason,
      jsonSampleList: requestData.jsonSampleList || "",
      jsonTestingList: requestData.jsonTestingList || "",
      progress: 0, // Will be calculated based on samples
    };

    // Get sample count and calculate progress
    try {
      const samples = await TestingSampleList.find({ requestNumber: requestData.requestNumber });
      if (samples && samples.length > 0) {
        const completedSamples = samples.filter(s =>
          ["completed", "operation-completed", "test-results-completed"].includes(s.sampleStatus?.toLowerCase())
        ).length;

        formattedData.progress = Math.round((completedSamples / samples.length) * 100);
      }
    } catch (err) {
      console.error("Error calculating progress:", err);
    }

    return NextResponse.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Error fetching request details:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch request details',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}