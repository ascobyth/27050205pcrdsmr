"use client"

import { useState } from "react"
import { Star, MessageSquare, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface EvaluationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestTitle: string
  userEmail?: string
  onEvaluationComplete: () => void
}

export function EvaluationDialog({
  open,
  onOpenChange,
  requestId,
  requestTitle,
  userEmail,
  onEvaluationComplete
}: EvaluationDialogProps) {
  const [score, setScore] = useState(5) // Default to 5 stars
  const [comment, setComment] = useState("")
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      // First, get the request data to find the requester email
      const requestResponse = await fetch(`/api/requests/${requestId}`)
      const requestResult = await requestResponse.json()

      if (!requestResult.success) {
        throw new Error('Failed to get request data')
      }

      // Use admin@admin.com as the evaluator (current user), not the requester
      const evaluatorEmail = userEmail || 'admin@admin.com'

      console.log('Request data:', requestResult.data)
      console.log('Evaluator email (current user):', evaluatorEmail)
      console.log('Requester email:', requestResult.data.requesterEmail)

      const response = await fetch(`/api/requests/${requestId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score,
          comment: comment.trim(),
          userEmail: evaluatorEmail // Use evaluator email (current user)
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Evaluation Submitted!",
          description: result.message,
          duration: 5000,
        })

        onEvaluationComplete()
        onOpenChange(false)

        // Reset form
        setScore(5)
        setComment("")
      } else {
        throw new Error(result.error || 'Failed to submit evaluation')
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit evaluation",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1
      const isActive = starNumber <= (hoveredStar || score)

      return (
        <button
          key={starNumber}
          type="button"
          className={`transition-all duration-200 hover:scale-110 ${
            isActive ? 'text-yellow-400' : 'text-gray-300'
          }`}
          onMouseEnter={() => setHoveredStar(starNumber)}
          onMouseLeave={() => setHoveredStar(0)}
          onClick={() => setScore(starNumber)}
        >
          <Star
            className={`h-8 w-8 ${isActive ? 'fill-current' : ''}`}
          />
        </button>
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Evaluate Request
          </DialogTitle>
          <DialogDescription>
            Please rate your experience with this request and provide feedback to help us improve our service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Request Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">
              <strong>Request ID:</strong> {requestId}
            </div>
            <div className="text-sm text-blue-700 mt-1">
              <strong>Title:</strong> {requestTitle}
            </div>
          </div>

          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              How would you rate this request? *
            </Label>
            <div className="flex items-center gap-1">
              {renderStars()}
              <span className="ml-3 text-sm text-muted-foreground">
                {score} star{score !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              You will earn {score} point{score !== 1 ? 's' : ''} for this evaluation
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <Label htmlFor="comment" className="text-base font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your feedback about the service quality, turnaround time, results accuracy, or any suggestions for improvement..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comment.length}/1000 characters
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            {submitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Submit Evaluation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
