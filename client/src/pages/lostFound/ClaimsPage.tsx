import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Send,
  Lock,
  X,
  MessageSquare,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles,
  Info,
  Star,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Claim } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { Badge } from '../../components/common/Badge.js';
import { EmptyState } from '../../components/common/EmptyState.js';

export const ClaimsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const foundReportIdParam = searchParams.get('foundReportId');

  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsPages, setClaimsPages] = useState(1);

  // New claim modal (when user arrives from Browse page with foundReportId)
  const [foundItemToClaim, setFoundItemToClaim] = useState<any>(null);
  const [isNewClaimModalOpen, setIsNewClaimModalOpen] = useState(false);
  const [newProofDescription, setNewProofDescription] = useState('');
  const [newDistinguishingFeatures, setNewDistinguishingFeatures] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [isSubmittingNewClaim, setIsSubmittingNewClaim] = useState(false);
  const [newClaimError, setNewClaimError] = useState('');
  const isOwnFoundItem = Boolean(
    user &&
    foundItemToClaim &&
    (foundItemToClaim.finder?._id || foundItemToClaim.finder)?.toString() === user._id.toString()
  );

  // Question answering modal (Claimant responds to finder/admin)
  const [activeClaimForAnswer, setActiveClaimForAnswer] = useState<{ claim: Claim; qIdx: number } | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Reviewer Question modal (Finder or Admin asks challenge question)
  const [activeClaimForQuestion, setActiveClaimForQuestion] = useState<Claim | null>(null);
  const [questionText, setQuestionText] = useState('');

  // Reviewer Decision modal (Finder or Admin approves or rejects claim)
  const [activeClaimForDecision, setActiveClaimForDecision] = useState<Claim | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Return Modal (Finder or Admin records physical handover)
  const [activeClaimForReturn, setActiveClaimForReturn] = useState<Claim | null>(null);
  const [returnNotes, setReturnNotes] = useState('Item verified and handed over in person.');
  const [handoverLocationName, setHandoverLocationName] = useState('');
  const [confirmedPublicMeeting, setConfirmedPublicMeeting] = useState(false);
  const [confirmedIdentityProof, setConfirmedIdentityProof] = useState(false);

  // Owner Receipt Confirmation Modal
  const [activeClaimForReceipt, setActiveClaimForReceipt] = useState<Claim | null>(null);
  const [ownerRating, setOwnerRating] = useState<number>(5);
  const [ownerFeedback, setOwnerFeedback] = useState<string>('Item safely received in great condition. Thank you so much!');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', {
        state: foundReportIdParam
          ? { from: `/claims?foundReportId=${encodeURIComponent(foundReportIdParam)}` }
          : undefined,
      });
      return;
    }
    fetchClaims();
  }, [user, claimsPage]);

  // If user arrives with ?foundReportId=..., check if they need to submit a new claim
  useEffect(() => {
    if (foundReportIdParam && user) {
      api.get<{ success: boolean; item?: any; foundReport?: any }>(`/lost-found/found/${foundReportIdParam}`)
        .then((res) => {
          const item = res.item || res.foundReport;
          if (item) {
            setFoundItemToClaim(item);
            // Check if current user is the finder of this item
            const finderId = item.finder?._id || item.finder;
            if (finderId && finderId.toString() === user._id.toString()) {
              // Finder cannot submit a claim on an item they found
              setIsNewClaimModalOpen(false);
              setNewClaimError('');
              return;
            }
            // Check if claim already exists
            const alreadyClaimed = claims.some(
              (c) =>
                (c.foundReport?._id === foundReportIdParam || (c.foundReport as any) === foundReportIdParam) &&
                c.claimant?._id === user._id
            );
            if (!alreadyClaimed) {
              setIsNewClaimModalOpen(true);
            }
          }
        })
        .catch((err) => {
          console.error('Error fetching item for claim modal', err);
        });
    }
  }, [foundReportIdParam, user, claims.length]);

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      const url = foundReportIdParam
        ? `/claims?foundReportId=${foundReportIdParam}&page=${claimsPage}&limit=50`
        : `/claims?page=${claimsPage}&limit=50`;
      const res = await api.get<{
        success: boolean;
        claims: Claim[];
        pagination?: { page: number; pages: number };
      }>(url);
      if (res.success && res.claims) {
        setClaims(res.claims);
        setClaimsPage(res.pagination?.page ?? claimsPage);
        setClaimsPages(res.pagination?.pages ?? 1);
      }
    } catch (err) {
      console.error('Failed to load claims', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (recipientId: string, claim: Claim) => {
    try {
      const res = await api.post<{ success: boolean; conversationId: string }>('/messages/start', {
        recipientId,
        foundReportId: claim.foundReport?._id,
        claimId: claim._id,
      });
      if (res.conversationId) {
        navigate(`/messages/${res.conversationId}`);
      } else {
        navigate('/messages');
      }
    } catch (err: any) {
      console.error('Failed to start chat', err);
      navigate('/messages');
    }
  };

  const handleSubmitNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundReportIdParam) return;
    if (isOwnFoundItem) {
      setIsNewClaimModalOpen(false);
      setNewClaimError('You cannot claim an item that you reported found.');
      return;
    }
    setNewClaimError('');
    setIsSubmittingNewClaim(true);

    try {
      const res = await api.post<{ success: boolean; claim: Claim }>('/claims', {
        foundReportId: foundReportIdParam,
        proofDescription: newProofDescription.trim(),
        distinguishingFeaturesAnswer: newDistinguishingFeatures.trim(),
        serialNumber: newSerialNumber.trim(),
      });

      if (res.success) {
        setIsNewClaimModalOpen(false);
        setNewProofDescription('');
        setNewDistinguishingFeatures('');
        setNewSerialNumber('');
        fetchClaims();
      }
    } catch (err: any) {
      setNewClaimError(err.message || 'Failed to submit ownership claim.');
    } finally {
      setIsSubmittingNewClaim(false);
    }
  };

  const handleAnswerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimForAnswer) return;

    try {
      await api.post(`/claims/${activeClaimForAnswer.claim._id}/answer`, {
        questionIndex: activeClaimForAnswer.qIdx,
        answer: answerText,
      });
      setActiveClaimForAnswer(null);
      setAnswerText('');
      fetchClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to submit answer.');
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimForQuestion) return;

    try {
      await api.post(`/claims/${activeClaimForQuestion._id}/question`, {
        question: questionText,
      });
      setActiveClaimForQuestion(null);
      setQuestionText('');
      fetchClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to send challenge question.');
    }
  };

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!activeClaimForDecision) return;

    try {
      await api.put(`/claims/${activeClaimForDecision._id}/review`, {
        decision,
        notes: decisionNotes,
      });
      setActiveClaimForDecision(null);
      setDecisionNotes('');
      fetchClaims();
    } catch (err: any) {
      alert(err.message || 'Decision failed.');
    }
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimForReturn) return;
    if (!handoverLocationName.trim()) {
      alert('Please enter the handover location.');
      return;
    }

    try {
      await api.post('/claims/confirm-return', {
        claimId: activeClaimForReturn._id,
        notes: returnNotes,
        handoverLocationName: handoverLocationName.trim(),
      });
      setActiveClaimForReturn(null);
      setReturnNotes('Item verified and handed over in person.');
      setHandoverLocationName('');
      setConfirmedPublicMeeting(false);
      setConfirmedIdentityProof(false);
      fetchClaims();
    } catch (err: any) {
      alert(err.message || 'Failed to record return.');
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClaimForReceipt) return;
    setIsSubmittingReceipt(true);
    try {
      const res = await api.post<{ success: boolean; claim: Claim }>(
        `/claims/${activeClaimForReceipt._id}/confirm-receipt`,
        {
          rating: ownerRating,
          feedback: ownerFeedback.trim(),
        }
      );
      if (res.success) {
        setActiveClaimForReceipt(null);
        setOwnerRating(5);
        setOwnerFeedback('Item safely received in great condition. Thank you so much!');
        fetchClaims();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to confirm receipt.');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const safeLocationSuggestions = [
    'Central Public Library Lobby',
    'City Police Precinct Station',
    'Downtown Coffee Shop',
    'Main Transit Station Information Desk',
    'Campus Student Center / Security Desk',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Ownership Claims & Returns
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Structured ownership verification, safe challenge questions, and confirmed physical handovers
          </p>
        </div>

        <Link
          to="/browse"
          className="btn-secondary h-8 px-3 text-xs self-start sm:self-auto"
        >
          Browse All Registry Items &rarr;
        </Link>
      </div>

      {/* Protocol Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900">FindBack Safe Handover Protocol</span>
            <p className="text-slate-600">
              1. Submit Proof &rarr; 2. Answer Challenge Questions &rarr; 3. Coordinate via Chat &rarr; 4. Meet in Public & Confirm Return.
            </p>
          </div>
        </div>

        {foundReportIdParam && !isNewClaimModalOpen && foundItemToClaim && (
          isOwnFoundItem ? (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-md shrink-0 self-start sm:self-auto">
              You cannot claim an item you reported found
            </span>
          ) : (
            <button
              onClick={() => setIsNewClaimModalOpen(true)}
              className="btn-primary h-8 px-3 text-xs shrink-0 self-start sm:self-auto"
            >
              Claim "{foundItemToClaim.title}"
            </button>
          )
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading claim records...</div>
      ) : claims.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No claims to display"
          description={
            foundReportIdParam
              ? isOwnFoundItem
                ? 'You reported this item found, so you cannot submit an ownership claim for it.'
                : 'No active claim yet for this item. Click below to file your ownership claim.'
              : 'You do not have any submitted claims or pending claims on items you found.'
          }
          actionLabel={foundReportIdParam ? (isOwnFoundItem ? undefined : 'File Claim For This Item') : 'Browse Found Registry'}
          onAction={() => {
            if (foundReportIdParam) {
              if (!isOwnFoundItem) setIsNewClaimModalOpen(true);
            } else {
              navigate('/browse?tab=found');
            }
          }}
        />
      ) : (
        <div className="space-y-6">
          {claims.map((claim) => {
            const isClaimant = claim.claimant?._id === user?._id;
            const foundFinderId =
              (claim.foundReport as any)?.finder?._id || (claim.foundReport as any)?.finder;
            const finderName =
              (claim.foundReport as any)?.finder?.name || 'Item Finder';
            const isFinder = foundFinderId === user?._id;
            const isAdmin = user?.role === 'ADMIN';
            const canReview = (isFinder || isAdmin) && !isClaimant;
            const otherPartyId = isClaimant ? foundFinderId : claim.claimant?._id;
            const otherPartyName = isClaimant ? finderName : claim.claimant?.name;

            // Determine active step index (0: Submitted, 1: Q&A, 2: Approved / Handover in progress, 3: Returned)
            const currentStep =
              claim.status === 'RETURNED'
                ? 3
                : claim.status === 'APPROVED'
                ? 2
                : claim.status === 'MORE_INFO_REQUESTED' || claim.status === 'UNDER_REVIEW'
                ? 1
                : 0;

            return (
              <div
                key={claim._id}
                className={`bg-white rounded-xl border shadow-sm p-5 sm:p-6 space-y-6 transition-all ${
                  claim.status === 'RETURNED'
                    ? 'border-emerald-200 ring-1 ring-emerald-500/10'
                    : claim.status === 'APPROVED'
                    ? 'border-amber-200 ring-1 ring-amber-500/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-slate-900">
                        Claim for: {claim.foundReport?.title || 'Found Property'}
                      </h2>
                      <Badge
                        variant={
                          claim.status === 'RETURNED'
                            ? 'emerald'
                            : claim.status === 'APPROVED'
                            ? 'emerald'
                            : claim.status === 'REJECTED'
                            ? 'danger'
                            : claim.status === 'MORE_INFO_REQUESTED'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {claim.status === 'RETURNED'
                          ? 'RETURNED & RECLAIMED'
                          : claim.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Submitted by: <strong className="text-slate-800">{claim.claimant?.name}</strong> •{' '}
                      Finder: <strong className="text-slate-800">{finderName}</strong> •{' '}
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Message Other Party */}
                    {otherPartyId && (
                      <button
                        onClick={() => handleStartChat(otherPartyId, claim)}
                        className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                        title={`Message ${otherPartyName}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Message {isClaimant ? 'Finder' : 'Claimant'}</span>
                      </button>
                    )}

                    {/* Actions for Reviewers */}
                    {canReview && claim.status !== 'APPROVED' && claim.status !== 'REJECTED' && claim.status !== 'RETURNED' && (
                      <>
                        <button
                          onClick={() => setActiveClaimForQuestion(claim)}
                          className="btn-secondary h-8 px-3 text-xs"
                        >
                          Ask Challenge Question
                        </button>

                        <button
                          onClick={() => setActiveClaimForDecision(claim)}
                          className="btn-primary h-8 px-3 text-xs"
                        >
                          Review & Decide
                        </button>
                      </>
                    )}

                    {/* Confirm Return Button for Finder when Approved */}
                    {canReview && claim.status === 'APPROVED' && !claim.returnRecord && (
                      <button
                        onClick={() => {
                          setActiveClaimForReturn(claim);
                          setHandoverLocationName(
                            claim.foundReport?.locationName || claim.foundReport?.city || ''
                          );
                        }}
                        className="btn-primary h-8 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm & Log Return</span>
                      </button>
                    )}

                    {/* Owner Confirm Receipt Button */}
                    {isClaimant && claim.returnRecord && !claim.returnRecord.ownerConfirmed && (
                      <button
                        onClick={() => setActiveClaimForReceipt(claim)}
                        className="btn-primary h-8 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm Receipt & Complete Certificate</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Step Lifecycle Stepper */}
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          currentStep >= 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        ✓
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-slate-900 truncate">1. Claim Filed</span>
                        <span className="text-[10px] text-slate-500">Proof submitted</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          currentStep >= 1
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {currentStep >= 2 ? '✓' : '2'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-slate-900 truncate">2. Verification</span>
                        <span className="text-[10px] text-slate-500">
                          {claim.officerQuestions?.length > 0 ? 'Challenge Q&A' : 'Under review'}
                        </span>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          currentStep >= 2
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {currentStep >= 3 ? '✓' : '3'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-slate-900 truncate">3. Handover Setup</span>
                        <span className="text-[10px] text-slate-500">
                          {claim.status === 'APPROVED' ? 'Coordination active' : 'Awaiting approval'}
                        </span>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          currentStep === 3
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {currentStep === 3 ? '✓' : '4'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-slate-900 truncate">4. Safe Return</span>
                        <span className="text-[10px] text-slate-500">
                          {claim.returnRecord?.ownerConfirmed
                            ? 'Confirmed by Owner'
                            : claim.status === 'RETURNED'
                            ? 'Returned (Awaiting Owner Confirmation)'
                            : 'Pending meetup'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handover in Progress Banner (When Claim is APPROVED) */}
                {claim.status === 'APPROVED' && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 text-sm">
                          Ownership Verified! Next Steps for Physical Handover
                        </h4>
                        <p className="text-amber-800 mt-0.5 leading-relaxed">
                          The ownership claim has been confirmed. Follow these safe steps to complete the handover:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 space-y-1">
                        <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Step A: Coordinate
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Message each other to agree on meeting time during daytime hours.
                        </p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 space-y-1">
                        <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          Step B: Safe Venue
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          Meet only in a busy public place (coffee shop, library, or police lobby).
                        </p>
                      </div>

                      <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 space-y-1">
                        <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Step C: Log Return
                        </span>
                        <p className="text-slate-600 text-[11px]">
                          {canReview
                            ? claim.returnRecord
                              ? 'Handover recorded. Waiting for the owner to confirm receipt and complete the certificate.'
                              : 'After handing over the item, record the handover below. The owner will then confirm receipt.'
                            : claim.returnRecord
                              ? 'Handover recorded. Confirm receipt after you have the item to complete the return certificate.'
                              : 'Waiting for the finder to record the physical handover.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap justify-end gap-2">
                      {canReview && !claim.returnRecord && (
                        <button
                          onClick={() => {
                            setActiveClaimForReturn(claim);
                            setHandoverLocationName(
                              claim.foundReport?.locationName || claim.foundReport?.city || ''
                            );
                          }}
                          className="btn-primary h-9 px-4 text-xs inline-flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm Physical Handover Complete
                        </button>
                      )}

                      {canReview && claim.returnRecord && !claim.returnRecord.ownerConfirmed && (
                        <span className="rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-medium text-amber-900">
                          Handover recorded — waiting for owner confirmation
                        </span>
                      )}

                      {!canReview && isClaimant && claim.returnRecord && !claim.returnRecord.ownerConfirmed && (
                        <button
                          onClick={() => setActiveClaimForReceipt(claim)}
                          className="btn-primary h-9 px-4 text-xs inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          I Received My Item (Complete Certificate)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Official Return Certificate & Receipt (When status is RETURNED) */}
                {claim.status === 'RETURNED' && claim.returnRecord?.ownerConfirmed && (
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        <div>
                          <h4 className="font-bold text-emerald-950 text-sm">
                            Official Property Return Certificate
                          </h4>
                          <span className="text-[11px] text-emerald-700">
                            Confirmed by the finder and owner
                          </span>
                        </div>
                      </div>
                      <Badge variant="emerald" size="sm">
                        RETURN CERTIFICATE
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-700">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Handover Location
                        </span>
                        <p className="font-medium text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {claim.returnRecord?.handoverLocationName ||
                              claim.foundReport?.locationName ||
                              'Public Meeting Venue'}
                          </span>
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Handover Timestamp
                        </span>
                        <p className="font-medium text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {claim.returnRecord?.returnDate
                              ? new Date(claim.returnRecord.returnDate).toLocaleString()
                              : new Date().toLocaleDateString()}
                          </span>
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-100 sm:col-span-2 md:col-span-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Community Impact
                        </span>
                        <p className="font-medium text-emerald-800 mt-0.5 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          +1 Returned (Finder) • +1 Recovered (Owner)
                        </p>
                      </div>
                    </div>

                    {claim.returnRecord?.notes && (
                      <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-slate-700">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Handover Verification Notes
                        </span>
                        <p className="mt-0.5 italic">{claim.returnRecord.notes}</p>
                      </div>
                    )}

                    {/* Owner Confirmation Status / Review Box */}
                    {claim.returnRecord?.ownerConfirmed ? (
                      <div className="bg-emerald-100/70 border border-emerald-300 rounded-lg p-3 text-emerald-950 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-700" />
                            Thank you, {claim.claimant?.name || 'Owner'} and {finderName} — this return is confirmed by both parties.
                          </span>
                          {claim.returnRecord.ownerRating && (
                            <div className="flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-3.5 h-3.5 ${
                                    star <= (claim.returnRecord?.ownerRating || 5)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                              <span className="text-xs font-bold text-slate-700 ml-1">
                                {claim.returnRecord.ownerRating}/5
                              </span>
                            </div>
                          )}
                        </div>
                        {claim.returnRecord.ownerFeedback && (
                          <div className="bg-white/80 p-2.5 rounded border border-emerald-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Owner Thank-You Note:
                            </span>
                            <p className="italic text-emerald-900 text-xs">
                              "{claim.returnRecord.ownerFeedback}"
                            </p>
                          </div>
                        )}
                        {claim.returnRecord.ownerConfirmedAt && (
                          <p className="text-[10px] text-emerald-700">
                            Confirmed on {new Date(claim.returnRecord.ownerConfirmedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : isClaimant && claim.returnRecord ? (
                      <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-amber-900">
                          <span className="font-semibold block text-sm">Complete your return certificate</span>
                          <p className="text-amber-800 text-[11px] mt-0.5">
                            Confirm receipt and leave a rating or thank-you message for {finderName}. Your confirmation will finalize the return for both parties.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveClaimForReceipt(claim)}
                          className="btn-primary h-8 px-4 text-xs whitespace-nowrap self-start sm:self-auto inline-flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Confirm Receipt & Complete Certificate
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {claim.returnRecord
                            ? 'Handover logged by finder. Awaiting owner receipt confirmation and feedback.'
                            : 'The finder must record the physical handover before you can confirm receipt.'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence & Details Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Proof of Ownership
                    </span>
                    <p className="text-slate-800 leading-normal">{claim.proofDescription}</p>
                    {claim.serialNumber && (
                      <p className="text-slate-600 pt-1 border-t border-slate-200 mt-2">
                        <strong>Serial/ID:</strong> {claim.serialNumber}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Distinguishing Features Response
                    </span>
                    <p className="text-slate-800 leading-normal">{claim.distinguishingFeaturesAnswer}</p>
                    {claim.reviewDecisionNotes && (
                      <div className="p-2 rounded-md bg-white border border-slate-200 text-slate-700 mt-2">
                        <strong>Reviewer Note:</strong> {claim.reviewDecisionNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Q&A History */}
                {claim.officerQuestions && claim.officerQuestions.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      Verification Challenge Q&A
                    </h4>

                    <div className="space-y-2.5">
                      {claim.officerQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-slate-900 font-medium">
                              <strong>Question:</strong> {q.question}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(q.askedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {q.answer ? (
                            <div className="pl-3 border-l-2 border-emerald-600 text-slate-700">
                              <p className="text-[11px] font-semibold text-emerald-800">Claimant Answer:</p>
                              <p className="mt-0.5">{q.answer}</p>
                            </div>
                          ) : isClaimant ? (
                            <button
                              onClick={() => {
                                setActiveClaimForAnswer({ claim, qIdx: idx });
                                setAnswerText('');
                              }}
                              className="btn-primary h-7 px-2.5 text-xs inline-flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Answer Question
                            </button>
                          ) : (
                            <p className="text-slate-400 italic text-[11px]">Awaiting claimant answer...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && claimsPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Claim pages">
          <button
            type="button"
            disabled={claimsPage <= 1}
            onClick={() => setClaimsPage((page) => page - 1)}
            className="btn-secondary h-8 px-3 text-xs disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-slate-600" aria-live="polite">
            Page {claimsPage} of {claimsPages}
          </span>
          <button
            type="button"
            disabled={claimsPage >= claimsPages}
            onClick={() => setClaimsPage((page) => page + 1)}
            className="btn-secondary h-8 px-3 text-xs disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}

      {/* New Claim Modal (When arriving via ?foundReportId=...) */}
      {isNewClaimModalOpen && !isOwnFoundItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Submit Ownership Claim {foundItemToClaim ? `for "${foundItemToClaim.title}"` : ''}
                </h3>
              </div>
              <button
                onClick={() => setIsNewClaimModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide unique, non-public details proving you are the rightful owner. The finder will review this proof before approving the handover.
            </p>

            {newClaimError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {newClaimError}
              </div>
            )}

            <form onSubmit={handleSubmitNewClaim} className="space-y-4 text-xs">
              <div>
                <label className="form-label">
                  Ownership Proof Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={3000}
                  value={newProofDescription}
                  onChange={(e) => setNewProofDescription(e.target.value)}
                  placeholder="Describe secret identifying traits, contents, receipt details, or history..."
                  className="textarea-field text-xs"
                />
              </div>

              <div>
                <label className="form-label">
                  Distinguishing Features Answer (Optional)
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  value={newDistinguishingFeatures}
                  onChange={(e) => setNewDistinguishingFeatures(e.target.value)}
                  placeholder="e.g. Unique sticker inside case, specific scratch on corner, wallpaper..."
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="form-label">Serial Number or IMEI (Optional)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={newSerialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value)}
                  placeholder="e.g. F2L... or IMEI"
                  className="input-field text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewClaimModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewClaim}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1"
                >
                  {isSubmittingNewClaim ? 'Submitting Claim...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Answer Question Modal (For Claimants) */}
      {activeClaimForAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Answer Challenge Question</h3>
              <button
                onClick={() => setActiveClaimForAnswer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              {activeClaimForAnswer.claim.officerQuestions[activeClaimForAnswer.qIdx]?.question}
            </p>

            <form onSubmit={handleAnswerQuestion} className="space-y-4">
              <textarea
                required
                rows={3}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Provide accurate, honest identifying answers..."
                className="textarea-field"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveClaimForAnswer(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Submit Answer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ask Question Modal (For Finder or Admin) */}
      {activeClaimForQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Ask Challenge Question</h3>
              <button
                onClick={() => setActiveClaimForQuestion(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Ask about a specific feature (e.g. lock screen photo, inner pocket contents) without disclosing the answer yourself.
            </p>

            <form onSubmit={handleAskQuestion} className="space-y-4">
              <textarea
                required
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g. Can you describe what photo is on the phone lockscreen?"
                className="textarea-field"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveClaimForQuestion(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Send Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal (For Finder or Admin) */}
      {activeClaimForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Claim Decision</h3>
              <button
                onClick={() => setActiveClaimForDecision(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select whether to approve or reject this claim based on the provided proof and challenge answers.
            </p>

            <textarea
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Notes explaining your decision (optional)..."
              className="textarea-field"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveClaimForDecision(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision('REJECT')}
                className="btn-danger flex-1"
              >
                Reject Claim
              </button>
              <button
                onClick={() => handleDecision('APPROVE')}
                className="btn-primary flex-1"
              >
                Approve Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Return Modal (For Finder or Admin) */}
      {activeClaimForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Confirm & Record Physical Handover</h3>
              </div>
              <button
                onClick={() => setActiveClaimForReturn(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Record the physical handover of <strong>"{activeClaimForReturn.foundReport?.title}"</strong> to verified claimant <strong>{activeClaimForReturn.claimant?.name}</strong>.
            </p>

            <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
              <div>
                <label className="form-label">
                  Handover Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={handoverLocationName}
                  onChange={(e) => setHandoverLocationName(e.target.value)}
                  placeholder="e.g. Central Library Entrance, Bole Kaldi Coffee"
                  className="input-field text-xs"
                />

                {/* Quick suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 self-center">Suggestions:</span>
                  {safeLocationSuggestions.map((loc) => (
                    <button
                      type="button"
                      key={loc}
                      onClick={() => setHandoverLocationName(loc)}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Return Notes & Verification Confirmation</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Verified PIN unlock in person during daytime; item safely received."
                  className="textarea-field text-xs"
                />
              </div>

              {/* Safety Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-semibold text-slate-700 block">Handover Verification Checklist</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedPublicMeeting}
                    onChange={(e) => setConfirmedPublicMeeting(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600">We met in a safe, public daytime location.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedIdentityProof}
                    onChange={(e) => setConfirmedIdentityProof(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600">
                    The claimant confirmed ownership in person (unlocked device / presented proof).
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveClaimForReturn(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!handoverLocationName.trim() || !confirmedPublicMeeting || !confirmedIdentityProof}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirm Handover Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner Confirm Receipt Modal */}
      {activeClaimForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Confirm Receipt & Complete Return Certificate
                </h3>
              </div>
              <button
                onClick={() => setActiveClaimForReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Confirm you have received <strong>"{activeClaimForReceipt.foundReport?.title}"</strong> safely. Your confirmation completes the return certificate, thanks the finder, and makes the successful return visible in the public registry.
            </p>

            <form onSubmit={handleConfirmReceipt} className="space-y-4 text-xs">
              <div>
                <label className="form-label font-medium">Rate Your Experience with Finder</label>
                <div className="flex items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setOwnerRating(star)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= ownerRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-slate-700 ml-2">
                    {ownerRating === 5
                      ? '5/5 (Excellent)'
                      : ownerRating === 4
                      ? '4/5 (Very Good)'
                      : ownerRating === 3
                      ? '3/5 (Good)'
                      : `${ownerRating}/5`}
                  </span>
                </div>
              </div>

              <div>
                <label className="form-label font-medium">Thank-You Note & Feedback for Finder</label>
                <textarea
                  required
                  rows={3}
                  value={ownerFeedback}
                  onChange={(e) => setOwnerFeedback(e.target.value)}
                  placeholder="Express your gratitude, describe the handover, or thank the finder..."
                  className="textarea-field text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  By confirming, this item will be publicly celebrated in the <strong>Reunited & Returned</strong> community registry!
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveClaimForReceipt(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmittingReceipt ? 'Completing Certificate...' : 'Confirm Receipt & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
