/**
 * game-engine.js - Zavvy! Gamification Core
 * Single Source of Truth for all XP, Sparks, Streaks & Quests
 * Phase 0 - Foundation Layer
 */

import {
  doc,
  updateDoc,
  increment,
  serverTimestamp,
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
};

export const QUEST_TEMPLATES = [
  {
    id: "quest_sim",
    title: "Complete 1 Sim Exam",
    type: "sim_complete",
    target: 1,
    rewardXP: 80,
    rewardSparks: 15,
  },
  {
    id: "quest_neo",
    title: "Complete 3 Neo Lessons",
    type: "neo_complete",
    target: 3,
    rewardXP: 60,
    rewardSparks: 10,
  },
  {
    id: "quest_synapse",
    title: "Play 5 Synapse Games",
    type: "synapse_play",
    target: 5,
    rewardXP: 50,
    rewardSparks: 12,
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
  switch (activityType) {
    case "sim_complete":
      return Math.floor(performanceScore * 0.65);
    case "neo_lesson":
      return 25;
    case "synapse_game":
      return Math.floor(performanceScore * 0.8) + 10;
    case "daily_quest":
      return 50;
    default:
      return 20;
  }
}

// ==================== ENGINE EXPORT ====================

export const gameEngine = {
  getTodayDate,
  isYesterday,
  calculateLevel,
  calculateXPReward,
  XP_CONFIG,
  SPARKS_CONFIG,
  QUEST_TEMPLATES,
};
