import { NextResponse } from 'next/server'
import dbConnect from '../../../../lib/mongoose'
const UserScore = require('../../../../models/UserScore')

export async function GET(request) {
  try {
    await dbConnect()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10
    const sortBy = searchParams.get('sortBy') || 'totalEvaluations' // totalEvaluations, averageRating, totalPoints

    // Build sort object
    let sortObject = {}
    switch (sortBy) {
      case 'averageRating':
        sortObject = { averageRating: -1, totalEvaluations: -1 }
        break
      case 'totalPoints':
        sortObject = { totalPoints: -1, totalEvaluations: -1 }
        break
      default:
        sortObject = { totalEvaluations: -1, averageRating: -1 }
    }

    // Get top users
    const topUsers = await UserScore.find({
      totalEvaluations: { $gt: 0 } // Only users who have done evaluations
    })
    .sort(sortObject)
    .limit(limit)
    .select('userEmail userName totalEvaluations totalPoints averageRating lastEvaluationDate')

    // Add ranking
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      userEmail: user.userEmail,
      userName: user.userName,
      totalEvaluations: user.totalEvaluations,
      totalPoints: user.totalPoints,
      averageRating: user.averageRating,
      lastEvaluationDate: user.lastEvaluationDate
    }))

    // Get total active users count
    const totalActiveUsers = await UserScore.countDocuments({
      totalEvaluations: { $gt: 0 }
    })

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        totalActiveUsers,
        sortBy,
        limit
      }
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
