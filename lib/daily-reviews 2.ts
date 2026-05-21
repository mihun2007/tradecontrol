export type DailyRating = "Great" | "Good" | "Bad" | "Dangerous";
export type EmotionalState = "Calm" | "Fear" | "Greed" | "FOMO" | "Revenge" | "Confident" | "Tired";

export type DailyReview = {
  id: string;
  date: string;
  followedPlan: boolean;
  respectedRisk: boolean;
  noRevengeTrading: boolean;
  stoppedAtLimit: boolean;
  journaledEveryTrade: boolean;
  emotionalState: EmotionalState;
  dailyRating: DailyRating;
  mainMistake: string;
  bestDecision: string;
  lessonLearned: string;
  planForTomorrow: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NewDailyReview = Omit<DailyReview, "id" | "createdAt" | "updatedAt">;

export const emotionalStates: EmotionalState[] = ["Calm", "Fear", "Greed", "FOMO", "Revenge", "Confident", "Tired"];
export const dailyRatings: DailyRating[] = ["Great", "Good", "Bad", "Dangerous"];

export function isDisciplineClean(review: Pick<DailyReview, "followedPlan" | "respectedRisk" | "noRevengeTrading" | "stoppedAtLimit" | "journaledEveryTrade">) {
  return review.followedPlan && review.respectedRisk && review.noRevengeTrading && review.stoppedAtLimit && review.journaledEveryTrade;
}
