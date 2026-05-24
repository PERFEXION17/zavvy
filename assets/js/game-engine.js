/**
 * game-engine.js - Zavvy! Gamification Core
 * Single Source of Truth for all XP, Sparks, Streaks, Quests & Health
 * Phase 3 - Reward & Health Distributor
 */

import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ==================== CONSTANTS & CONFIG ====================

export const XP_CONFIG = {
  LEVEL_BASE: 500,
  LEVEL_MULTIPLIER: 1.25,
  DAILY_BONUS_CAP: 150,
};

export const SPARKS_CONFIG = {
  EXAM_BASE: 25,
  QUEST_REWARD: 15,
  STREAK_BONUS: 8,
};

// NEW: The Health Economy Rules
export const HEART_CONFIG = {
  MAX_HEARTS: 5,
  REFILL_COST_SPARKS: 50,
  REGEN_TIME_MS: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
};

// ==================== QUEST TEMPLATES ====================

export const QUEST_TEMPLATES = [
  {
    id: "quest_sim",
    title: "Complete 1 Sim Exam",
    type: "sim_complete",
    target: 1,
    rewardXP: 80,
    rewardSparks: 15,
    icon: "laptop",
  },
  {
    id: "quest_neo",
    title: "Complete 3 Neo Lessons",
    type: "neo_complete",
    target: 3,
    rewardXP: 60,
    rewardSparks: 10,
    icon: "book",
  },
  {
    id: "quest_synapse",
    title: "Play 5 Synapse Games",
    type: "synapse_play",
    target: 5,
    rewardXP: 50,
    rewardSparks: 12,
    icon: "brain",
  },
];

// ==================== DATE & TIME HELPERS ====================

export function getTodayDate() {
  const now = new Date();
  now.setHours(now.getHours() + 1); // WAT (UTC+1)
  return now.toISOString().split("T")[0];
}

export function isYesterday(dateStr) {
  if (!dateStr) return false;
  const today = getTodayDate();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split("T")[0];
}

// ==================== HEALTH (HEART) SYSTEM ====================

/**
 * Calculates if the user is owed any hearts based on the 4-hour window.
 * This is a pure function.
 */
export function calculateHeartRegen(currentHearts, lastHeartUpdateIso) {
  if (currentHearts >= HEART_CONFIG.MAX_HEARTS || !lastHeartUpdateIso) {
    return {
      hearts: HEART_CONFIG.MAX_HEARTS,
      lastUpdate: new Date().toISOString(),
    };
  }

  const now = new Date();
  const lastUpdate = new Date(lastHeartUpdateIso);
  const timePassedMs = now - lastUpdate;

  if (timePassedMs >= HEART_CONFIG.REGEN_TIME_MS) {
    const heartsToGive = Math.floor(timePassedMs / HEART_CONFIG.REGEN_TIME_MS);
    const newHearts = Math.min(
      HEART_CONFIG.MAX_HEARTS,
      currentHearts + heartsToGive,
    );

    // Calculate exact remainder time to carry over so they don't lose progress
    const remainderMs = timePassedMs % HEART_CONFIG.REGEN_TIME_MS;
    const newLastUpdate = new Date(now.getTime() - remainderMs).toISOString();

    return { hearts: newHearts, lastUpdate: newLastUpdate, updated: true };
  }

  return {
    hearts: currentHearts,
    lastUpdate: lastHeartUpdateIso,
    updated: false,
  };
}

/**
 * Deducts 1 heart. If they were at MAX, starts the 4-hour timer.
 */
export async function deductHeart(userId, currentHearts) {
  if (!userId || currentHearts <= 0) return false;

  const userRef = doc(db, "users", userId);
  const updates = { hearts: increment(-1) };

  // Start the timer ONLY when dropping from Max Hearts
  if (currentHearts === HEART_CONFIG.MAX_HEARTS) {
    updates.lastHeartUpdate = new Date().toISOString();
  }

  try {
    await updateDoc(userRef, updates);
    return true;
  } catch (error) {
    console.error("Failed to deduct heart:", error);
    return false;
  }
}

/**
 * Spends Sparks to fully restore hearts instantly.
 */
export async function refillHeartsWithSparks(userId, currentSparks) {
  if (!userId) return false;
  if (currentSparks < HEART_CONFIG.REFILL_COST_SPARKS) {
    return { success: false, message: "Not enough Sparks!" };
  }

  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, {
      hearts: HEART_CONFIG.MAX_HEARTS,
      sparks: increment(-HEART_CONFIG.REFILL_COST_SPARKS),
      lastHeartUpdate: new Date().toISOString(), // Reset timer
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to refill hearts:", error);
    return { success: false, message: "Network error. Try again." };
  }
}

// ==================== XP & LEVEL SYSTEM ====================

export function calculateLevel(totalXP) {
  let level = 1;
  let xpNeeded = XP_CONFIG.LEVEL_BASE;

  while (totalXP >= xpNeeded) {
    level++;
    xpNeeded = Math.floor(xpNeeded * XP_CONFIG.LEVEL_MULTIPLIER);
  }

  return { level, xpToNextLevel: xpNeeded - totalXP, totalXP };
}

export function calculateXPReward(activityType, performanceScore = 0) {
  let baseXP = 0;
  switch (activityType) {
    case "sim_complete":
      baseXP = Math.floor(performanceScore * 0.65);
      break;
    case "neo_lesson":
      baseXP = 25;
      break;
    case "synapse_game":
      baseXP = Math.floor(performanceScore * 0.8) + 10;
      break;
    case "daily_quest":
      baseXP = 50;
      break;
    default:
      baseXP = 20;
  }
  return Math.min(baseXP, 450);
}

// ==================== SPARKS SYSTEM ====================

export function calculateSparksReward(
  activityType,
  performanceScore = 0,
  currentStreak = 1,
) {
  let baseSparks = 0;
  switch (activityType) {
    case "sim_complete":
      baseSparks = SPARKS_CONFIG.EXAM_BASE + Math.floor(performanceScore / 20);
      break;
    case "neo_lesson":
      baseSparks = 8;
      break;
    case "synapse_game":
      baseSparks = 6 + Math.floor(performanceScore / 30);
      break;
    case "daily_quest":
      baseSparks = SPARKS_CONFIG.QUEST_REWARD;
      break;
    default:
      baseSparks = 5;
  }
  const streakBonus =
    Math.floor(currentStreak / 3) * SPARKS_CONFIG.STREAK_BONUS;
  return Math.min(baseSparks + streakBonus, 60);
}

// ==================== STREAK LOGIC ====================

export function calculateNewStreak(
  currentStreak,
  highestStreak,
  lastActiveDate,
) {
  const today = getTodayDate();
  if (!lastActiveDate) return { currentStreak: 1, highestStreak: 1 };
  if (lastActiveDate === today) return { currentStreak, highestStreak };
  if (isYesterday(lastActiveDate)) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      highestStreak: Math.max(newStreak, highestStreak),
    };
  }
  return { currentStreak: 1, highestStreak };
}

// ==================== DAILY QUESTS SYSTEM ====================

export function initializeDailyQuests() {
  return {
    lastResetDate: getTodayDate(),
    quests: QUEST_TEMPLATES.map((template) => ({
      ...template,
      progress: 0,
      completed: false,
    })),
  };
}

export function shouldResetQuests(lastResetDate) {
  if (!lastResetDate) return true;
  return lastResetDate !== getTodayDate();
}

export function updateQuestProgress(dailyQuests, questType, incrementBy = 1) {
  const quests = Array.isArray(dailyQuests)
    ? dailyQuests
    : dailyQuests.quests || [];
  const updatedQuests = quests.map((quest) => {
    if (quest.type === questType && !quest.completed) {
      const newProgress = quest.progress + incrementBy;
      const completed = newProgress >= quest.target;
      return {
        ...quest,
        progress: Math.min(newProgress, quest.target),
        completed,
      };
    }
    return quest;
  });
  if (!Array.isArray(dailyQuests) && dailyQuests.quests) {
    return { ...dailyQuests, quests: updatedQuests };
  }
  return updatedQuests;
}

export function areAllQuestsComplete(dailyQuests) {
  const quests = Array.isArray(dailyQuests)
    ? dailyQuests
    : dailyQuests.quests || [];
  return quests.every((q) => q.completed);
}

// ==================== CENTRAL REWARD DISTRIBUTOR ====================

export async function awardActivityRewards(
  userId,
  activityType,
  performanceScore = 0,
) {
  if (!userId) return null;
  const userRef = doc(db, "users", userId);

  try {
    const xpEarned = calculateXPReward(activityType, performanceScore);
    const currentStreak = 1; // Enhanced in later phases
    const sparksEarned = calculateSparksReward(
      activityType,
      performanceScore,
      currentStreak,
    );

    const updates = {
      globalXP: increment(xpEarned),
      sparks: increment(sparksEarned),
      lastActiveDate: getTodayDate(),
    };

    if (activityType === "sim_complete")
      updates.zavvySimExamsTaken = increment(1);
    else if (activityType === "neo_lesson")
      updates.neoLessonsCompleted = increment(1);
    else if (activityType === "synapse_game")
      updates.synapseGamesPlayed = increment(1);

    await updateDoc(userRef, updates);
    await logActivity(userId, activityType, xpEarned, sparksEarned);

    return { xpEarned, sparksEarned, activityType };
  } catch (error) {
    console.error("Failed to award rewards:", error);
    return null;
  }
}

// ==================== ACTIVITY LOGGING ====================

export async function logActivity(
  userId,
  activityType,
  xpEarned,
  sparksEarned,
) {
  const userRef = doc(db, "users", userId);
  const logEntry = {
    date: getTodayDate(),
    activity: activityType,
    xp: xpEarned,
    sparks: sparksEarned,
    timestamp: new Date().toISOString(),
  };

  try {
    await updateDoc(userRef, { activityLog: arrayUnion(logEntry) });
  } catch (error) {
    console.error("Activity log failed:", error);
  }
}

// ==================== MAIN ENGINE EXPORT ====================

export const gameEngine = {
  getTodayDate,
  isYesterday,
  calculateLevel,
  calculateXPReward,
  calculateSparksReward,
  calculateNewStreak,
  initializeDailyQuests,
  shouldResetQuests,
  updateQuestProgress,
  areAllQuestsComplete,
  awardActivityRewards,
  logActivity,
  calculateHeartRegen,
  deductHeart,
  refillHeartsWithSparks,
  XP_CONFIG,
  SPARKS_CONFIG,
  HEART_CONFIG,
  QUEST_TEMPLATES,
};
