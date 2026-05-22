/**
 * game-engine.js - Zavvy! Gamification Core
 * Single Source of Truth for all XP, Sparks, Streaks & Quests
 * Phase 2 - Daily Quests System Added
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

// ==================== DATE HELPERS ====================

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

// ==================== XP & LEVEL SYSTEM ====================

export function calculateLevel(totalXP) {
  let level = 1;
  let xpNeeded = XP_CONFIG.LEVEL_BASE;

  while (totalXP >= xpNeeded) {
    level++;
    xpNeeded = Math.floor(xpNeeded * XP_CONFIG.LEVEL_MULTIPLIER);
  }

  return {
    level,
    xpToNextLevel: xpNeeded - totalXP,
    totalXP,
  };
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

/**
 * Initialize or reset daily quests
 */
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

/**
 * Check if quests need reset (new day)
 */
export function shouldResetQuests(lastResetDate) {
  if (!lastResetDate) return true;
  return lastResetDate !== getTodayDate();
}

/**
 * Update progress on a specific quest
 */
export function updateQuestProgress(quests, questType, incrementBy = 1) {
  return quests.map((quest) => {
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
}

/**
 * Check if all quests are completed
 */
export function areAllQuestsComplete(quests) {
  return quests.every((q) => q.completed);
}

// ==================== ACTIVITY LOGGING ====================

export async function logActivity(
  userId,
  activityType,
  xpEarned,
  sparksEarned,
) {
  const today = getTodayDate();
  const userRef = doc(db, "users", userId);

  const logEntry = {
    date: today,
    activity: activityType,
    xp: xpEarned,
    sparks: sparksEarned,
    timestamp: serverTimestamp(),
  };

  try {
    await updateDoc(userRef, {
      activityLog: arrayUnion(logEntry),
      lastActiveDate: today,
    });
    console.log(`✅ Activity logged: ${activityType}`);
  } catch (error) {
    console.error("Failed to log activity:", error);
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
  logActivity,
  XP_CONFIG,
  SPARKS_CONFIG,
  QUEST_TEMPLATES,
};
