import type { WorkflowStage } from "@illuvrse/media-corp-core";

export const CORE_MEDIA_CORP_WORKFLOW: WorkflowStage[] = [
  {
    id: "trend_brief",
    name: "Trend Brief",
    description: "Research agents translate cultural opportunity into a brief.",
    order: 1,
    requiredAgents: ["trend_scout_agent", "aesthetic_scanner_agent", "format_opportunity_agent"],
    outputs: ["trendBrief"]
  },
  {
    id: "franchise_seed",
    name: "Franchise Seed",
    description: "The foundry creates a named world with characters and tone.",
    order: 2,
    requiredAgents: ["universe_architect_agent", "character_foundry_agent", "naming_engine_agent"],
    outputs: ["franchiseSeed"]
  },
  {
    id: "canon_creation",
    name: "Canon Creation",
    description: "Canon is written as the source of truth.",
    order: 3,
    requiredAgents: ["lore_engine_agent", "art_direction_engine", "canon_archivist_agent"],
    outputs: ["canonRecord"]
  },
  {
    id: "multi_format_expansion",
    name: "Multi-Format Expansion",
    description: "Content studio expands the seed into testable media plans.",
    order: 4,
    requiredAgents: ["image_studio_agent", "meme_studio_agent", "wall_post_agent", "shorts_script_agent", "game_concept_agent", "trailer_movie_concept_agent"],
    outputs: ["contentPlans"]
  },
  {
    id: "artifact_production",
    name: "Artifact Production",
    description: "Production agents create executable jobs, prompt runs, and artifact bundles.",
    order: 5,
    requiredAgents: ["image_studio_agent", "meme_studio_agent", "wall_post_agent", "shorts_script_agent", "podcast_concept_agent", "music_concept_agent", "game_concept_agent", "trailer_movie_concept_agent"],
    outputs: ["generationJobs", "artifactBundles", "artifacts"]
  },
  {
    id: "quality_screening",
    name: "Quality Screening",
    description: "Quality and risk agents score and gate the bundle.",
    order: 6,
    requiredAgents: ["quality_gate_agent", "continuity_checker_agent", "similarity_rights_risk_screener", "brand_safety_agent"],
    outputs: ["qualityScorecard", "artifactReviewScorecards"]
  },
  {
    id: "greenlight",
    name: "Greenlight",
    description: "Executive agents decide kill, test, incubate, scale, or flagship.",
    order: 7,
    requiredAgents: ["ceo_agent", "chief_creative_officer_agent", "chief_growth_officer_agent"],
    outputs: ["greenlightDecision"]
  },
  {
    id: "review_queue",
    name: "Review Queue",
    description: "Human and governance review approves, rejects, or requests revision on bundles.",
    order: 8,
    requiredAgents: ["quality_gate_agent", "similarity_rights_risk_screener", "packaging_agent"],
    outputs: ["reviewDecisions"]
  },
  {
    id: "release_candidate",
    name: "Release Candidate",
    description: "Approved bundles are converted into channel-ready release candidates.",
    order: 9,
    requiredAgents: ["publishing_scheduler_agent", "headline_caption_agent", "channel_routing_agent"],
    outputs: ["releaseCandidates", "distributionPackages"]
  },
  {
    id: "publish_packaging",
    name: "Publish Packaging",
    description: "Publishing packages approved assets into channel-ready plans.",
    order: 10,
    requiredAgents: ["publishing_scheduler_agent", "headline_caption_agent", "thumbnail_cover_planner", "channel_routing_agent"],
    outputs: ["publishPlans"]
  },
  {
    id: "distribution_execution",
    name: "Distribution Execution",
    description: "Release candidates are routed into channels and tracked through publish attempts.",
    order: 11,
    requiredAgents: ["publishing_scheduler_agent", "chief_growth_officer_agent", "chief_operations_officer_agent"],
    outputs: ["publishAttempts", "publishResults", "campaigns", "experimentAssignments"]
  },
  {
    id: "performance_ingestion",
    name: "Performance Ingestion",
    description: "Published attempts emit synthetic or ingested metrics and rollups.",
    order: 12,
    requiredAgents: ["performance_analyst_agent", "chief_intelligence_officer_agent"],
    outputs: ["performanceEvents", "performanceSnapshots", "rollups"]
  },
  {
    id: "strategy_learning",
    name: "Strategy Learning",
    description: "Executive learning converts attributed performance into recommendations and momentum changes.",
    order: 13,
    requiredAgents: ["chief_growth_officer_agent", "chief_intelligence_officer_agent", "portfolio_rebalancer_agent"],
    outputs: ["strategyRecommendations", "portfolioState"]
  },
  {
    id: "portfolio_update",
    name: "Portfolio Update",
    description: "Performance and franchise management update portfolio state.",
    order: 14,
    requiredAgents: ["performance_analyst_agent", "franchise_manager_agent", "portfolio_rebalancer_agent"],
    outputs: ["performanceReport", "portfolioState"]
  }
];

export const SHORTS_WORKFLOW: WorkflowStage[] = [
  { id: "hook", name: "Hook", description: "Establish the scroll-stopping hook.", order: 1, requiredAgents: ["shorts_script_agent"], outputs: ["hook"] },
  { id: "script", name: "Script", description: "Write the short-form script.", order: 2, requiredAgents: ["shorts_script_agent"], outputs: ["script"] },
  { id: "storyboard", name: "Storyboard", description: "Translate script into shot plan.", order: 3, requiredAgents: ["storyboard_agent"], outputs: ["storyboard"] },
  { id: "packaging", name: "Packaging", description: "Plan caption and cover treatment.", order: 4, requiredAgents: ["headline_caption_agent", "thumbnail_cover_planner"], outputs: ["package"] },
  { id: "publish_plan", name: "Publish Plan", description: "Schedule surface release.", order: 5, requiredAgents: ["publishing_scheduler_agent"], outputs: ["publishPlan"] }
];

export const MEME_WORKFLOW: WorkflowStage[] = [
  { id: "trend_fit", name: "Trend Fit", description: "Match the meme to a current emotional slot.", order: 1, requiredAgents: ["meme_studio_agent"], outputs: ["fit"] },
  { id: "caption_variants", name: "Caption Variants", description: "Generate textual variants.", order: 2, requiredAgents: ["headline_caption_agent"], outputs: ["captions"] },
  { id: "visual_variants", name: "Visual Variants", description: "Plan visual remix directions.", order: 3, requiredAgents: ["image_studio_agent"], outputs: ["visuals"] },
  { id: "publish_plan", name: "Publish Plan", description: "Schedule release.", order: 4, requiredAgents: ["publishing_scheduler_agent"], outputs: ["publishPlan"] }
];
