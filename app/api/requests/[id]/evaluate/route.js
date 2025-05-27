import { NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongoose'
import RequestList from '../../../../../models/RequestList'
const UserScore = require('../../../../../models/UserScore')

export async function POST(request, { params }) {
  try {
    await dbConnect()

    const { id } = await params
    const body = await request.json()
    const { score, comment, userEmail } = body

    console.log('Evaluation request:', { id, score, comment, userEmail })

    // Validate input
    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { success: false, error: 'Score must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 400 }
      )
    }

    // Find the request
    const requestDoc = await RequestList.findOne({ requestNumber: id })
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      )
    }

    // Allow evaluation for any status (for testing purposes)
    // Note: In production, you might want to restrict this to completed requests only

    // Check if already evaluated
    if (requestDoc.isEvaluated) {
      return NextResponse.json(
        { success: false, error: 'This request has already been evaluated' },
        { status: 400 }
      )
    }

    // Check if user is the requester
    if (requestDoc.requesterEmail !== userEmail) {
      return NextResponse.json(
        { success: false, error: 'Only the requester can evaluate this request' },
        { status: 403 }
      )
    }

    // Update request with evaluation
    const updatedRequest = await RequestList.findOneAndUpdate(
      { requestNumber: id },
      {
        isEvaluated: true,
        evaluationScore: score,
        evaluationComment: comment || '',
        evaluationDate: new Date()
      },
      { new: true }
    )

    // Award points to user based on score
    const pointsEarned = score // 1 star = 1 point, 5 stars = 5 points

    // Get or create user score record
    const userScore = await UserScore.getOrCreateUserScore(userEmail, 'User') // TODO: Get real user name
    console.log('Current user score:', userScore)

    // Add evaluation to user score
    await userScore.addEvaluation(id, score, comment || '')
    console.log('Updated user score:', {
      totalEvaluations: userScore.totalEvaluations,
      totalPoints: userScore.totalPoints,
      averageRating: userScore.averageRating
    })

    console.log(`User ${userEmail} earned ${pointsEarned} points for evaluating request ${id}`)

    return NextResponse.json({
      success: true,
      data: {
        request: updatedRequest,
        pointsEarned,
        totalPoints: userScore.totalPoints,
        userScore: userScore.totalEvaluations,
        averageRating: userScore.averageRating
      },
      message: `Evaluation submitted successfully! You earned ${pointsEarned} points. Total evaluations done: ${userScore.totalEvaluations}`
    })

  } catch (error) {
    console.error('Error submitting evaluation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit evaluation' },
      { status: 500 }
    )
  }
}
