"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import CapabilityForm from "./CapabilityForm"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EditCapabilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapabilityUpdated: (capability: any) => void
  capabilityData: any
}

export default function EditCapabilityDialog({
  open,
  onOpenChange,
  onCapabilityUpdated,
  capabilityData
}: EditCapabilityDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: any) => {
    setIsLoading(true)

    try {
      console.log('Updating capability with ID:', capabilityData.id || capabilityData._id);

      // Ensure capHeadGroup is valid
      if (formData.capHeadGroup && formData.capHeadGroup !== "none") {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(formData.capHeadGroup);
        if (!isValidObjectId) {
          console.warn('Invalid ObjectId for capHeadGroup:', formData.capHeadGroup);
          formData.capHeadGroup = null;
        }
      } else if (formData.capHeadGroup === "none") {
        // Convert "none" to null for the database
        formData.capHeadGroup = null;
      }

      // Ensure locationId is valid
      if (formData.locationId && formData.locationId !== "none") {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(formData.locationId);
        if (!isValidObjectId) {
          console.warn('Invalid ObjectId for locationId:', formData.locationId);
          formData.locationId = null;
        }
      } else if (formData.locationId === "none") {
        // Convert "none" to null for the database
        formData.locationId = null;
      }

      console.log('LocationId before sending to API:', formData.locationId);

      console.log('Sending capability update data:', formData);

      const response = await fetch(`/api/capabilities/${capabilityData.id || capabilityData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('API response status:', response.status);

      let data;
      try {
        // Get the response data as JSON
        data = await response.json();
        console.log('API response data:', data);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Failed to parse server response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to update capability (${response.status})`)
      }

      toast({
        title: "Success",
        description: "Capability updated successfully",
      })

      onCapabilityUpdated(data.data)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating capability:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update capability",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Capability</DialogTitle>
          <DialogDescription>
            Update the capability details and click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <CapabilityForm
            initialData={capabilityData}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            isEditing={true}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
