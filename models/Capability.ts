import { Schema } from 'mongoose';

// Define the interface for a Capability
export interface ICapability {
  _id?: string;
  capabilityName: string;
  shortName: string;
  capabilityDesc?: string;
  locationId?: string | null;
  capHeadGroup?: string | null;
  reqRunNo?: number;
  reqAsrRunNo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define default capability categories based on the database
export const CAPABILITY_CATEGORIES = [
  { id: "rheology", name: "Rheology", shortName: "RE", icon: "Layers" },
  { id: "microstructure", name: "Microstructure", shortName: "MC", icon: "Microscope" },
  { id: "smallmolecules", name: "Small molecules", shortName: "SM", icon: "FlaskConical" },
  { id: "mesostructure", name: "Mesostructure", shortName: "ME", icon: "FlaskConical" },
  { id: "imaging", name: "Imaging", shortName: "IM", icon: "Beaker" },
  { id: "rd", name: "R&D", shortName: "RD", icon: "Beaker" }
];

// Helper function to get capability icon
export const getCapabilityIcon = (capability: string): string => {
  if (!capability) return "Beaker";
  
  const capLower = capability.toLowerCase();
  const foundCategory = CAPABILITY_CATEGORIES.find(
    cat => capLower.includes(cat.id) || capLower.includes(cat.name.toLowerCase())
  );
  
  return foundCategory?.icon || "Beaker";
};

// Helper function to match capability name to a category
export const matchCapabilityToCategory = (capabilityName: string): string => {
  if (!capabilityName) return "Unknown";
  
  const capLower = capabilityName.toLowerCase();
  const foundCategory = CAPABILITY_CATEGORIES.find(
    cat => capLower.includes(cat.id) || capLower.includes(cat.name.toLowerCase())
  );
  
  return foundCategory?.name || capabilityName;
};

export default CAPABILITY_CATEGORIES;
