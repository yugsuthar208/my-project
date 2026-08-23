import apiClient from "./apiClient";

export const aiPlannerService = {
  /**
   * Generates comprehensive master travel blueprint using the AI Master Engine.
   */
  generateItinerary: (payload) =>
    apiClient.post("/ai-planner/generate", payload, { timeout: 90000 }).then((r) => r.data),

  /**
   * 1-Click saves the generated AI blueprint into active database records (Trip, Stops, Activities, Transit, Budget).
   */
  saveTrip: (aiBlueprint) =>
    apiClient.post("/ai-planner/save-trip", { ai_blueprint: aiBlueprint }, { timeout: 60000 }).then((r) => r.data),
};

