import { ILostReport, LostReport } from '../models/LostReport.js';
import { IFoundReport, FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { Location } from '../models/Location.js';
import { SystemPolicy } from '../models/SystemPolicy.js';
import { sendNotification } from './notificationService.js';

function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const word of setA) {
    if (setB.has(word)) {
      intersectionCount++;
    }
  }
  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : (intersectionCount / unionCount) * 100;
}

export interface MatchScoreResult {
  score: number;
  breakdown: {
    category: number;
    location: number;
    date: number;
    time: number;
    color: number;
    brand: number;
    description: number;
  };
  reasons: string[];
}

export async function computeMatchScore(
  lost: ILostReport,
  found: IFoundReport
): Promise<MatchScoreResult> {
  const policy = await SystemPolicy.findOne();
  const defaultWeights = {
    category: 20,
    location: 25,
    date: 15,
    time: 10,
    color: 10,
    brand: 10,
    description: 10,
  };
  const configuredWeights = policy?.matchWeights;
  const weights = configuredWeights &&
      Object.values(configuredWeights).every((weight) => Number.isFinite(weight) && weight >= 0) &&
      Object.values(configuredWeights).some((weight) => weight > 0)
    ? configuredWeights
    : defaultWeights;

  const reasons: string[] = [];
  const breakdown = {
    category: 0,
    location: 0,
    date: 0,
    time: 0,
    color: 0,
    brand: 0,
    description: 0,
  };

  // 1. Category Similarity (Exact Match = 100%)
  if (lost.category && found.category && lost.category.toString() === found.category.toString()) {
    breakdown.category = 100;
    reasons.push('Category matches identically.');
  } else {
    breakdown.category = 0;
  }

  // 2. Geographic & Location Proximity
  let locationScore = 40; // Default baseline
  const lostLocId = (lost.lastKnownLocation as any)?._id?.toString() || lost.lastKnownLocation?.toString();
  const foundLocId = (found.foundLocation as any)?._id?.toString() || found.foundLocation?.toString();

  if (lostLocId && foundLocId && lostLocId === foundLocId) {
    locationScore = 100;
    reasons.push('Location matches exact verified spot or landmark.');
  } else {
    const lostCity = (lost.city || '').trim().toLowerCase();
    const foundCity = (found.city || '').trim().toLowerCase();
    const lostArea = (lost.locationName || '').trim().toLowerCase();
    const foundArea = (found.locationName || '').trim().toLowerCase();

    // Check if objects exist in Location collection
    let lostLocObj: any = null;
    let foundLocObj: any = null;
    if (lost.lastKnownLocation) {
      lostLocObj = await Location.findById(lost.lastKnownLocation).lean();
    }
    if (found.foundLocation) {
      foundLocObj = await Location.findById(found.foundLocation).lean();
    }

    const effectiveLostCity = lostCity || lostLocObj?.city?.toLowerCase() || '';
    const effectiveFoundCity = foundCity || foundLocObj?.city?.toLowerCase() || '';
    const effectiveLostArea = lostArea || lostLocObj?.area?.toLowerCase() || lostLocObj?.name?.toLowerCase() || '';
    const effectiveFoundArea = foundArea || foundLocObj?.area?.toLowerCase() || foundLocObj?.name?.toLowerCase() || '';

    if (effectiveLostCity && effectiveFoundCity && effectiveLostCity === effectiveFoundCity) {
      // Same city
      const areaTokensLost = tokenize(effectiveLostArea);
      const areaTokensFound = tokenize(effectiveFoundArea);
      const areaSim = calculateJaccardSimilarity(areaTokensLost, areaTokensFound);

      if (areaSim > 0 || (effectiveLostArea && effectiveFoundArea && (effectiveLostArea.includes(effectiveFoundArea) || effectiveFoundArea.includes(effectiveLostArea)))) {
        locationScore = 95;
        reasons.push(`Items reported in the same locality/neighborhood in ${lost.city || effectiveLostCity}.`);
      } else {
        locationScore = 70;
        reasons.push(`Both items reported within ${lost.city || effectiveLostCity}.`);
      }
    } else if (effectiveLostArea && effectiveFoundArea) {
      const areaTokensLost = tokenize(effectiveLostArea);
      const areaTokensFound = tokenize(effectiveFoundArea);
      if (calculateJaccardSimilarity(areaTokensLost, areaTokensFound) > 20) {
        locationScore = 80;
        reasons.push('Matching neighborhood or landmark names.');
      } else {
        locationScore = 25;
      }
    } else {
      locationScore = 50; // Incomplete location data
    }
  }
  breakdown.location = locationScore;

  // 3. Date Proximity
  const lostDate = new Date(lost.dateLost).getTime();
  const foundDate = new Date(found.dateFound).getTime();
  const diffHours = (foundDate - lostDate) / (1000 * 60 * 60);

  if (diffHours >= -12 && diffHours <= 24) {
    breakdown.date = 100;
    reasons.push('Item was found within 24 hours of loss.');
  } else if (diffHours > 24 && diffHours <= 72) {
    breakdown.date = 80;
    reasons.push('Found within 3 days of loss.');
  } else if (diffHours > 72 && diffHours <= 168) {
    breakdown.date = 60;
    reasons.push('Found within 1 week of loss.');
  } else if (diffHours > 168 && diffHours <= 720) {
    breakdown.date = 35;
  } else if (diffHours < -12) {
    // Found well before it was reported lost
    breakdown.date = 10;
  } else {
    breakdown.date = 15;
  }

  // 4. Time Proximity
  if (lost.approximateTime && found.approximateTime) {
    const cleanLostTime = lost.approximateTime.toLowerCase().trim();
    const cleanFoundTime = found.approximateTime.toLowerCase().trim();
    if (cleanLostTime === cleanFoundTime) {
      breakdown.time = 90;
      reasons.push('Matching reported time windows.');
    } else {
      breakdown.time = 40;
    }
  } else {
    breakdown.time = 50; // Neutral
  }

  // 5. Color Matching
  if (lost.color && found.color) {
    const lColor = lost.color.toLowerCase().trim();
    const fColor = found.color.toLowerCase().trim();
    if (lColor === fColor || lColor.includes(fColor) || fColor.includes(lColor)) {
      breakdown.color = 100;
      reasons.push(`Color matches: ${lost.color}`);
    } else {
      breakdown.color = 10;
    }
  } else {
    breakdown.color = 50;
  }

  // 6. Brand Matching
  if (lost.brand && found.brand) {
    const lBrand = lost.brand.toLowerCase().trim();
    const fBrand = found.brand.toLowerCase().trim();
    if (lBrand === fBrand || lBrand.includes(fBrand) || fBrand.includes(lBrand)) {
      breakdown.brand = 100;
      reasons.push(`Brand matches: ${lost.brand}`);
    } else {
      breakdown.brand = 15;
    }
  } else {
    breakdown.brand = 50;
  }

  // 7. Description / Title Token Overlap
  const lostTokens = tokenize(`${lost.title} ${lost.description} ${lost.distinguishingCharacteristics || ''}`);
  const foundTokens = tokenize(`${found.title} ${found.description}`);
  const similarity = calculateJaccardSimilarity(lostTokens, foundTokens);
  breakdown.description = Math.min(100, Math.round(similarity * 2.5)); // Normalized

  if (breakdown.description >= 40) {
    reasons.push('Strong textual similarity in item description.');
  }

  // Total weighted score
  const totalWeight =
    weights.category +
    weights.location +
    weights.date +
    weights.time +
    weights.color +
    weights.brand +
    weights.description;

  const rawScore =
    (breakdown.category * weights.category +
      breakdown.location * weights.location +
      breakdown.date * weights.date +
      breakdown.time * weights.time +
      breakdown.color * weights.color +
      breakdown.brand * weights.brand +
      breakdown.description * weights.description) /
    totalWeight;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    score: finalScore,
    breakdown,
    reasons,
  };
}

/**
 * Runs matching engine for a newly submitted or updated report
 */
export async function runMatchingForReport(
  report: ILostReport | IFoundReport,
  type: 'LOST' | 'FOUND'
): Promise<void> {
  try {
    if (type === 'LOST') {
      const lostReport = report as ILostReport;
      const candidateFoundItems = await FoundReport.find({
        status: { $in: ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH'] },
        category: lostReport.category,
      });

      for (const found of candidateFoundItems) {
        const result = await computeMatchScore(lostReport, found);
        if (result.score >= 50) {
          await LostFoundMatch.findOneAndUpdate(
            { lostReport: lostReport._id, foundReport: found._id },
            {
              lostReport: lostReport._id,
              foundReport: found._id,
              matchScore: result.score,
              breakdown: result.breakdown,
              reasons: result.reasons,
              status: 'SUGGESTED',
            },
            { upsert: true, new: true }
          );

          if (lostReport.status === 'OPEN' || lostReport.status === 'ACTIVE') {
            await LostReport.findByIdAndUpdate(lostReport._id, { status: 'POTENTIAL_MATCH' });
          }

          await sendNotification({
            recipientId: lostReport.reporter,
            title: `Possible Match Found (${result.score}%)`,
            message: `A found item "${found.title}" closely matches your lost report "${lostReport.title}". Check details and submit a claim.`,
            type: 'MATCH',
            link: `/lost-found/matches`,
            metadata: { lostId: lostReport._id, foundId: found._id, score: result.score },
          });
        }
      }
    } else {
      const foundReport = report as IFoundReport;
      const candidateLostItems = await LostReport.find({
        status: { $in: ['OPEN', 'ACTIVE', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH'] },
        category: foundReport.category,
      });

      for (const lost of candidateLostItems) {
        const result = await computeMatchScore(lost, foundReport);
        if (result.score >= 50) {
          await LostFoundMatch.findOneAndUpdate(
            { lostReport: lost._id, foundReport: foundReport._id },
            {
              lostReport: lost._id,
              foundReport: foundReport._id,
              matchScore: result.score,
              breakdown: result.breakdown,
              reasons: result.reasons,
              status: 'SUGGESTED',
            },
            { upsert: true, new: true }
          );

          if (lost.status === 'OPEN' || lost.status === 'ACTIVE') {
            await LostReport.findByIdAndUpdate(lost._id, { status: 'POTENTIAL_MATCH' });
          }

          await sendNotification({
            recipientId: lost.reporter,
            title: `Possible Match Found (${result.score}%)`,
            message: `A found item "${foundReport.title}" closely matches your lost report "${lost.title}". Check details and submit a claim.`,
            type: 'MATCH',
            link: `/lost-found/matches`,
            metadata: { lostId: lost._id, foundId: foundReport._id, score: result.score },
          });
        }
      }
    }
  } catch (err: any) {
    console.error('[MatchEngine Error] Failed during match calculation:', err.message);
  }
}
