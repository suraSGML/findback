export type UserRole = 'USER' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface UserReputation {
  ratingAverage: number;
  ratingCount: number;
  itemsReturned: number;
  itemsRecovered: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  reputation: UserReputation;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
}

export interface Location {
  _id: string;
  name: string;
  city: string;
  region?: string;
  country: string;
  area?: string;
  address?: string;
  isOfficialMeetingSpot: boolean;
  meetingInstructions?: string;
  isActive: boolean;
}

export type CampusLocation = Location;

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  recipient: string;
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lostReport?: LostReport;
  foundReport?: FoundReport;
  claim?: Claim;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: Record<string, number>;
  createdAt: string;
}

export type LostStatus = 
  | 'ACTIVE'
  | 'OPEN'
  | 'POTENTIAL_MATCH'
  | 'POSSIBLE_MATCH'
  | 'CLAIM_PENDING'
  | 'MATCH_CONFIRMED'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'CLOSED'
  | 'EXPIRED';

export interface LostReport {
  _id: string;
  reporter: User;
  title: string;
  category: Category;
  description: string;
  color?: string;
  brand?: string;
  distinguishingCharacteristics?: string;
  country?: string;
  region?: string;
  city?: string;
  locationName?: string;
  lastKnownLocation?: Location;
  dateLost: string;
  approximateTime?: string;
  images: string[];
  status: LostStatus;
  createdAt: string;
}

export type FoundStatus = 
  | 'AVAILABLE_FOR_CLAIM'
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'POTENTIAL_MATCH'
  | 'CLAIM_PENDING'
  | 'CLAIM_APPROVED'
  | 'RETURNED'
  | 'CLOSED'
  | 'TRANSFERRED_TO_OFFICER';

export interface FoundReport {
  _id: string;
  finder: User;
  title: string;
  category: Category;
  description: string;
  color?: string;
  brand?: string;
  country?: string;
  region?: string;
  city?: string;
  locationName?: string;
  foundLocation?: Location;
  dateFound: string;
  approximateTime?: string;
  custodyStatus: 'WITH_FINDER' | 'TRANSFERRED_TO_CUSTODIAN' | 'TRANSFERRED_TO_OFFICER';
  custodyLocationDetails?: string;
  custodyOfficer?: User;
  images: string[];
  secretIdentifyingDetails?: string;
  status: FoundStatus;
  returnRecord?: ReturnRecord;
  createdAt: string;
}

export interface MatchBreakdown {
  category: number;
  location: number;
  date: number;
  time: number;
  color: number;
  brand: number;
  description: number;
}

export interface LostFoundMatch {
  _id: string;
  lostReport: LostReport;
  foundReport: FoundReport;
  matchScore: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  status: 'SUGGESTED' | 'CONFIRMED' | 'DISMISSED';
  createdAt: string;
}

export type ClaimStatus = 
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFO_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED';

export interface OfficerQuestion {
  question: string;
  askedBy: User;
  askedAt: string;
  answer?: string;
  answeredAt?: string;
}

export type VerificationQuestion = OfficerQuestion;

export interface Claim {
  _id: string;
  foundReport: FoundReport;
  claimant: User;
  lostReport?: LostReport;
  proofDescription: string;
  distinguishingFeaturesAnswer: string;
  serialNumber?: string;
  proofImages: string[];
  officerQuestions: OfficerQuestion[];
  status: ClaimStatus;
  reviewedBy?: User;
  reviewDecisionNotes?: string;
  returnRecord?: ReturnRecord;
  createdAt: string;
}

export interface ReturnRecord {
  _id: string;
  foundReport: FoundReport;
  lostReport?: LostReport;
  claim?: Claim;
  returnedBy: User;
  receivedBy: User;
  officerInCharge?: User;
  returnDate: string;
  pickupLocation?: Location;
  handoverLocationName?: string;
  notes?: string;
  evidenceImage?: string;
  ownerConfirmed?: boolean;
  ownerConfirmedAt?: string;
  ownerFeedback?: string;
  ownerRating?: number;
  createdAt: string;
}

export interface Report {
  _id: string;
  reporter: User;
  module: 'LOST_AND_FOUND' | 'USER_SAFETY';
  targetType: 'LOST_REPORT' | 'FOUND_REPORT' | 'USER' | 'CLAIM' | 'LISTING';
  targetId: string;
  reason: string;
  details: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  actionTaken?: string;
  moderatorNotes?: string;
  resolvedBy?: User;
  resolvedAt?: string;
  target?: {
    title: string;
    status?: string;
    city?: string;
    locationName?: string;
    ownerName?: string;
  } | null;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: 'MATCH' | 'CLAIM' | 'MESSAGE' | 'MODERATION' | 'SYSTEM' | 'OFFER' | 'TRANSACTION';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  actor: User;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  notes?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemPolicy {
  _id: string;
  platformName: string;
  allowedEmailDomains: string[];
  prohibitedKeywords: string[];
  prohibitedCategories: string[];
  matchWeights: {
    category: number;
    location: number;
    date: number;
    time: number;
    color: number;
    brand: number;
    description: number;
  };
  meetingSafetyTips: string[];
}
