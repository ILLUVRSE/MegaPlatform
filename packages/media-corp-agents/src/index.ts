import {
  PROMPT_TEMPLATE_REGISTRY,
  clamp,
  createId,
  slugify,
  type AgentRoleId,
  type AudienceTarget,
  type Artifact,
  type ArtifactBundle,
  type ArtifactVersion,
  type CanonRecord,
  type Character,
  type ContentAssetPlan,
  type FranchiseSeed,
  type GenerationJob,
  type PublishPlan,
  type PromptRun,
  type PromptTemplate,
  type ReleaseCandidate,
  type ReviewDecision,
  type DistributionPackage,
  type TrendBrief
} from "@illuvrse/media-corp-core";

export type AgentExecutionContext = {
  trendBrief: TrendBrief;
  now: string;
};

export type ProductionBundleResult = {
  bundle: ArtifactBundle;
  artifacts: Artifact[];
  versions: ArtifactVersion[];
  jobs: GenerationJob[];
  promptRuns: PromptRun[];
};

const NAME_PREFIXES = ["Velvet", "Chrome", "Tide", "Solar", "Midnight", "Hollow", "Riot", "Star"];
const NAME_SUFFIXES = ["Cathedral", "Circuit", "Choir", "Harbor", "Engine", "Arena", "Relay", "Archive"];

function pickName(index: number) {
  return `${NAME_PREFIXES[index % NAME_PREFIXES.length]} ${NAME_SUFFIXES[index % NAME_SUFFIXES.length]}`;
}

function buildAudienceTarget(base: AudienceTarget, extraChannel: string): AudienceTarget {
  return {
    ...base,
    channels: Array.from(new Set([...base.channels, extraChannel]))
  };
}

export function runTrendScout(index: number, brief: TrendBrief) {
  return {
    ...brief,
    title: brief.title,
    opportunityScore: Math.min(99, brief.opportunityScore + (index % 3))
  };
}

export function runUniverseArchitect(input: AgentExecutionContext, index: number): FranchiseSeed {
  const name = pickName(index);
  const slug = slugify(name);
  return {
    id: createId("seed", slug),
    slug,
    name,
    premise: `${name} follows a pressure-cooker society built around ${input.trendBrief.themes[0]} and ${input.trendBrief.themes[1]}.`,
    worldHook: `Every district in ${name} is governed by a relic ritual tied to ${input.trendBrief.aesthetics[0]}.`,
    tone: `${input.trendBrief.emotions[0]} epic with streaks of ${input.trendBrief.emotions[1]}`,
    audienceTarget: buildAudienceTarget(input.trendBrief.audienceTarget, "franchise_watchlist"),
    motifs: input.trendBrief.themes.slice(0, 3),
    styleGuide: input.trendBrief.aesthetics.slice(0, 3),
    legalNotes: ["Favor uncommon symbolic systems.", "Avoid direct franchise icon echoes.", "Use original naming families."],
    trendBriefId: input.trendBrief.id,
    createdAt: input.now
  };
}

export function runCharacterFoundry(seed: FranchiseSeed): Character[] {
  return [
    {
      id: createId("char", `${seed.slug}_lead`),
      franchiseId: seed.id,
      name: `${seed.name.split(" ")[0]} Vale`,
      archetype: "reluctant iconoclast",
      role: "lead",
      description: `A scavenger-strategist who can read the hidden protocols of ${seed.name}.`,
      signatureTraits: ["reckless empathy", "ritual fluency", "deadpan humor"],
      catchphrases: ["Break the pattern.", "The relic remembers."],
      visualMarkers: [seed.styleGuide[0] ?? "fractured chrome", seed.motifs[0] ?? "mask sigils"]
    },
    {
      id: createId("char", `${seed.slug}_foil`),
      franchiseId: seed.id,
      name: `Marshal ${seed.name.split(" ")[1] ?? "Rune"}`,
      archetype: "glorious rival",
      role: "foil",
      description: "A charismatic enforcer who wants to preserve the system for deeply personal reasons.",
      signatureTraits: ["ceremonial precision", "secret tenderness", "competitive flair"],
      catchphrases: ["Order is a performance.", "Win the crowd, keep the city."],
      visualMarkers: [seed.styleGuide[1] ?? "velvet smoke", "ceremonial armor"]
    }
  ];
}

export function runCanonArchivist(seed: FranchiseSeed, characters: Character[]): CanonRecord {
  return {
    id: createId("canon", seed.slug),
    franchiseId: seed.id,
    version: 1,
    worldRules: [
      "Every supernatural or speculative force must map to a visible ritual.",
      "Heroic wins always trigger social consequences.",
      "Technology and myth are inseparable."
    ],
    continuityRules: [
      "Lead and foil must remain ideologically opposed but emotionally entangled.",
      "Motifs must recur in every format plan.",
      "Expansion content must reference a canon anchor before adding new lore."
    ],
    styleGuide: seed.styleGuide,
    loreSummary: `${seed.name} is a persistent franchise about power rituals, emotional spectacle, and communities rewriting their inherited systems.`,
    visualLanguage: [...seed.styleGuide, "graphic sigils", "ritual crowds"],
    characters,
    audienceTarget: seed.audienceTarget,
    legalNotes: seed.legalNotes,
    performanceHistory: [],
    updatedAt: seed.createdAt
  };
}

export function runContentStudio(seed: FranchiseSeed, canon: CanonRecord): ContentAssetPlan[] {
  const anchors = [seed.worldHook, canon.worldRules[0], canon.continuityRules[1]];
  return [
    {
      id: createId("plan", `${seed.slug}_poster`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "image",
      title: `${seed.name} key art`,
      concept: `Poster showing ${canon.characters[0]?.name} framed by ${seed.styleGuide[0]} and a city of relic towers.`,
      hook: `Meet the rebellion inside ${seed.name}.`,
      productionPlan: ["Poster composition", "logo lockup", "world taglines"],
      channelTargets: ["admin_demo", "poster_drop", "home_feed"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_meme`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "meme",
      title: `${seed.name} initiation meme pack`,
      concept: `Caption variants around “when the relic picks you for overtime revolution.”`,
      hook: `Anxious humor inside a high-stakes world.`,
      productionPlan: ["Caption set", "reaction crop ideas", "variant matrix"],
      channelTargets: ["wall", "home_feed", "community_reposts"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_wall`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "wall_post",
      title: `${seed.name} in-world bulletin`,
      concept: `A voicey post from the lead character hinting at the next relic ritual.`,
      hook: `Worldbuilding delivered like a social update.`,
      productionPlan: ["Voice sample", "post variants", "reply bait"],
      channelTargets: ["wall", "home_feed"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_shorts`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "video_short",
      title: `${seed.name} 30-second uprising hook`,
      concept: `Cold open with a relic ceremony failing in public and the lead saying "${canon.characters[0]?.catchphrases[0] ?? "Break the pattern."}"`,
      hook: "A ceremonial collapse becomes an origin moment.",
      productionPlan: ["Hook line", "beat sheet", "storyboard frames"],
      channelTargets: ["shorts", "reels", "trailer_wall"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_music`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "music_concept",
      title: `${seed.name} anthem concept`,
      concept: `Percussive ritual chant with analog synth brass and a hook built around "${seed.motifs[0]}".`,
      hook: "Franchise anthem for edits and teasers.",
      productionPlan: ["Tempo palette", "lyric seed", "edit points"],
      channelTargets: ["soundtrack_pitch", "shorts_audio"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_podcast`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "podcast_concept",
      title: `${seed.name} lorecast pilot`,
      concept: "A pseudo-documentary episode unpacking the origin of the central relic ritual.",
      hook: "World lore through investigative audio.",
      productionPlan: ["Episode outline", "host framing", "clip moments"],
      channelTargets: ["audio", "community"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_game`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "game_concept",
      title: `${seed.name} microgame loop`,
      concept: "A timing-and-deception microgame where players sabotage and remix ritual circuits before public ceremonies.",
      hook: "Repeatable high-score loop with faction identity.",
      productionPlan: ["Mechanic loop", "economy verbs", "art kit brief"],
      channelTargets: ["gamegrid", "prototype_queue"],
      canonicalAnchors: anchors,
      status: "planned"
    },
    {
      id: createId("plan", `${seed.slug}_movie`),
      franchiseId: seed.id,
      seedId: seed.id,
      format: "movie_concept",
      title: `${seed.name} trailer-first feature concept`,
      concept: "A cinematic rebellion story framed around a city-wide rite collapsing into franchise-scale war.",
      hook: "Feature-scale proof of franchise ambition.",
      productionPlan: ["Logline", "trailer beats", "visual treatment"],
      channelTargets: ["studio_slate", "investor_deck"],
      canonicalAnchors: anchors,
      status: "planned"
    }
  ];
}

export function runPublishing(plans: ContentAssetPlan[], seed: FranchiseSeed): PublishPlan[] {
  return plans.map((plan, index) => ({
    id: createId("publish", `${plan.id}_${index}`),
    franchiseId: seed.id,
    contentPlanId: plan.id,
    headline: `${seed.name}: ${plan.title}`,
    caption: `${plan.hook} Enter ${seed.name} through ${plan.format.replace("_", " ")} form.`,
    thumbnailPrompt: `${seed.styleGuide.join(", ")}, franchise poster energy, focal symbol, bold readable silhouette`,
    channels: plan.channelTargets,
    scheduledFor: new Date(Date.UTC(2026, 2, 7, 13 + index, 0, 0)).toISOString(),
    packagingNotes: [`Anchor every release to ${seed.motifs[0]}.`, "Preserve canon phrases in copy."],
    status: "scheduled"
  }));
}

function promptTemplateForFormat(format: ContentAssetPlan["format"]): PromptTemplate {
  return (
    PROMPT_TEMPLATE_REGISTRY.find((template) => template.medium === format) ??
    PROMPT_TEMPLATE_REGISTRY.find((template) => template.medium === "image")!
  );
}

function resolveTemplate(template: PromptTemplate, values: Record<string, string>) {
  return template.template.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key.trim()] ?? "");
}

function artifactTypeForFormat(format: ContentAssetPlan["format"]): Artifact["artifactType"] {
  switch (format) {
    case "image":
    case "artwork":
      return "generated_image";
    case "meme":
      return "meme_variant";
    case "wall_post":
      return "wall_post_copy";
    case "video_short":
      return "shorts_package";
    case "podcast_concept":
      return "podcast_package";
    case "music_concept":
      return "music_concept_pack";
    case "game_concept":
      return "game_concept_pack";
    case "movie_concept":
      return "trailer_package";
  }
}

function jobTypeForFormat(format: ContentAssetPlan["format"]): GenerationJob["jobType"] {
  switch (format) {
    case "image":
    case "artwork":
      return "generate-image";
    case "meme":
      return "generate-meme-set";
    case "wall_post":
      return "generate-wall-post";
    case "video_short":
      return "generate-shorts-package";
    case "podcast_concept":
      return "generate-podcast-package";
    case "music_concept":
      return "generate-music-concept";
    case "game_concept":
      return "generate-game-concept-pack";
    case "movie_concept":
      return "generate-trailer-package";
  }
}

function providerForFormat(format: ContentAssetPlan["format"]) {
  if (format === "wall_post") return { provider: "illuvrse-copy-lab", model: "studio-copy-v2" };
  if (format === "video_short" || format === "movie_concept") return { provider: "illuvrse-story-lab", model: "story-package-v2" };
  return { provider: "illuvrse-creative-fabric", model: "artifact-suite-v2" };
}

function buildBundleMetadata(plan: ContentAssetPlan, seed: FranchiseSeed, canon: CanonRecord) {
  switch (plan.format) {
    case "image":
    case "artwork":
      return [
        {
          title: `${seed.name} hero poster`,
          brief: `Image brief for ${plan.title}.`,
          payload: {
            imageBrief: plan.concept,
            visualPromptSet: [
              `${seed.styleGuide[0]}, ${seed.styleGuide[1]}, ${seed.worldHook}`,
              `${canon.characters[0]?.name} foreground, ${seed.styleGuide[0]}, ritual skyline`
            ],
            negativePrompt: ["franchise references", "existing character likenesses", "generic fantasy armor"],
            shotVariants: ["wide poster frame", "character close-up", "symbol-focused alt"],
            posterVariants: ["festival one-sheet", "teaser symbol poster"],
            metadataTags: [...seed.motifs, ...seed.styleGuide]
          }
        }
      ];
    case "meme":
      return [
        {
          title: `${seed.name} meme set`,
          brief: `Meme pack for ${plan.title}.`,
          payload: {
            memeConcept: plan.concept,
            captionVariants: [
              "when the relic picks you for revolution during your lunch break",
              "POV: your city ritual becomes your side quest",
              "me pretending I did not just trigger a franchise arc"
            ],
            visualSetup: "reaction crop + relic glow + deadpan protagonist",
            remixHooks: ["quote tweet prompt", "duet reaction", "faction scoreboard template"],
            channelFitNotes: plan.channelTargets
          }
        }
      ];
    case "wall_post":
      return [
        {
          title: `${seed.name} wall post package`,
          brief: `Social voice pack for ${plan.title}.`,
          payload: {
            primaryPost: `The relic failed in public. Again. If you heard the bells, meet me below the east arches. #${seed.slug.replace(/-/g, "")}`,
            variantPosts: [
              "Order says the ceremony was stable. My shoes disagree.",
              "Nobody told me rebellion had paperwork."
            ],
            repliesBait: ["Ask me who cut the wires.", "Tell me which district cracked first."],
            audienceAngle: seed.audienceTarget.primary
          }
        }
      ];
    case "video_short":
      return [
        {
          title: `${seed.name} shorts package`,
          brief: `Short-form package for ${plan.title}.`,
          payload: {
            hook: plan.hook,
            script: [
              "Cold open: crowd chanting over a ritual circuit.",
              `Lead: "${canon.characters[0]?.catchphrases[0] ?? "Break the pattern."}"`,
              "Smash cut to the city lights collapsing into a symbol."
            ],
            beatSheet: ["0-3s ritual tension", "4-12s failure event", "13-22s character claim", "23-30s call-to-world"],
            shotList: ["crowd wide", "artifact macro", "lead push-in", "skyline rupture"],
            voiceoverDraft: `In ${seed.name}, every public promise can explode into legend.`,
            captionPack: ["The city chose chaos.", "Origin story, but louder.", "Would you enter this world?"],
            thumbnailTitleOptions: ["The Ritual Broke", "This City Chose War", "Meet the Relic Rebels"],
            publishNotes: plan.channelTargets
          }
        }
      ];
    case "podcast_concept":
      return [
        {
          title: `${seed.name} podcast package`,
          brief: `Podcast pilot for ${plan.title}.`,
          payload: {
            episodeTitle: `${seed.name}: The First Broken Ceremony`,
            outline: ["Cold open scene retelling", "Host framing", "Lore unpack", "Fan theory bait", "Next-episode tease"],
            segmentStructure: ["3 min setup", "8 min lore breakdown", "6 min character dynamics", "3 min predictions"],
            hostFraming: "Investigative but in-universe, like a rebel historian with receipts.",
            clipCandidates: ["What the bells actually mean", "Why the rival let the ritual fail"],
            teaserCopy: `What happens when the ritual that runs a city picks the wrong witness?`
          }
        }
      ];
    case "music_concept":
      return [
        {
          title: `${seed.name} music concept pack`,
          brief: `Soundtrack identity pack for ${plan.title}.`,
          payload: {
            trackConcept: plan.concept,
            sonicPalette: ["ritual percussion", "analog synth brass", "crowd chant layers"],
            hookLyric: `The ${seed.motifs[0]} remembers us.`,
            tempoRange: "108-118 BPM",
            editPoints: ["0:07 chant drop", "0:15 synth stab", "0:24 slogan repeat"]
          }
        }
      ];
    case "game_concept":
      return [
        {
          title: `${seed.name} game concept pack`,
          brief: `Microgame pack for ${plan.title}.`,
          payload: {
            coreLoop: "Sabotage, reroute, and escape before the ceremony locks.",
            mechanicSummary: ["timing windows", "route planning", "faction buffs", "public heat meter"],
            artDirection: `${seed.styleGuide.join(", ")}, top-down ritual grid, bold faction icons`,
            monetizationNotes: ["cosmetic faction sigils", "seasonal challenge board"],
            progressionOutline: ["district unlocks", "new ritual modifiers", "leaderboard factions"],
            prototypeBrief: "Build a two-minute replayable loop with one district, one sabotage tool, and one rival AI"
          }
        }
      ];
    case "movie_concept":
      return [
        {
          title: `${seed.name} trailer package`,
          brief: `Cinematic package for ${plan.title}.`,
          payload: {
            logline: `${seed.name} follows a public ritual collapse that forces rivals to choose between order and mythic civil war.`,
            storyBeats: ["inciting ceremony failure", "public blame spiral", "rival alliance fracture", "citywide rite war"],
            trailerStructure: ["teaser symbol cold open", "character claims", "city escalation montage", "title hit"],
            visualTreatment: ["sun-faded chrome", "cathedral-scale plazas", "ritual sparks in storms"],
            soundtrackDirection: "Percussive chant-driven escalation with analog choir",
            posterPromptSet: ["hero silhouette over broken sigil", "rivals back-to-back in ritual smoke"]
          }
        }
      ];
  }
}

export function runProductionBundles(seed: FranchiseSeed, canon: CanonRecord, plans: ContentAssetPlan[], now: string): ProductionBundleResult[] {
  return plans.map((plan, index) => {
    const template = promptTemplateForFormat(plan.format);
    const templateVars = {
      franchise: seed.name,
      tone: seed.tone,
      styleGuide: seed.styleGuide.join(", "),
      worldHook: seed.worldHook,
      characterLead: canon.characters[0]?.name ?? "Lead",
      motifs: seed.motifs.join(", "),
      hook: plan.hook,
      audience: seed.audienceTarget.primary,
      premise: seed.premise,
      canonAnchor: plan.canonicalAnchors[0] ?? seed.worldHook,
      catchphrase: canon.characters[0]?.catchphrases[0] ?? "Break the pattern.",
      loreSummary: canon.loreSummary,
      worldRules: canon.worldRules.join(", ")
    };
    const resolvedPrompt = resolveTemplate(template, templateVars);
    const bundleId = createId("bundle", `${plan.id}_${index}`);
    const jobId = createId("job", `${plan.id}_${index}`);
    const promptRunId = createId("prompt_run", `${plan.id}_${index}`);
    const { provider, model } = providerForFormat(plan.format);
    const metadataRows = buildBundleMetadata(plan, seed, canon);
    const artifacts = metadataRows.map((row, artifactIndex) => {
      const artifactId = createId("artifact", `${plan.id}_${artifactIndex}`);
      return {
        id: artifactId,
        franchiseId: seed.id,
        seedId: seed.id,
        contentPlanId: plan.id,
        artifactBundleId: bundleId,
        artifactType: artifactTypeForFormat(plan.format),
        title: row.title,
        brief: row.brief,
        sourcePrompt: resolvedPrompt,
        generationParameters: {
          styleGuide: seed.styleGuide,
          motifs: seed.motifs,
          canonicalAnchors: plan.canonicalAnchors
        },
        storageLocation: `illuvrse://media-corp/${seed.slug}/${plan.format}/${artifactId}.json`,
        previewUrl: `/media-corp/${seed.slug}/${plan.format}/${artifactId}`,
        metadata: row.payload,
        status: "generated",
        reviewStatus: "pending",
        qualityScore: clamp(70 + (8 - index)),
        rightsSimilarityRisk: clamp(18 + artifactIndex * 6 + seed.legalNotes.length),
        lineage: [seed.id, canon.id, plan.id, bundleId],
        createdAt: now,
        updatedAt: now
      } satisfies Artifact;
    });
    const versions = artifacts.map((artifact) => ({
      id: createId("artifact_version", artifact.id),
      artifactId: artifact.id,
      version: 1,
      sourcePrompt: artifact.sourcePrompt,
      generationParameters: artifact.generationParameters,
      storageLocation: artifact.storageLocation,
      previewUrl: artifact.previewUrl,
      metadata: artifact.metadata,
      createdAt: now
    }));
    const job: GenerationJob = {
      id: jobId,
      franchiseId: seed.id,
      seedId: seed.id,
      contentPlanId: plan.id,
      artifactBundleId: bundleId,
      jobType: jobTypeForFormat(plan.format),
      status: "completed",
      provider,
      model,
      promptTemplateId: template.id,
      canonContext: plan.canonicalAnchors,
      inputBrief: plan.concept,
      outputsProduced: artifacts.map((artifact) => artifact.id),
      runtimeMetadata: { latencyMs: 1200 + index * 80, reviewRequired: true },
      tokenUsage: 1400 + index * 120,
      estimatedCostUsd: Number((0.03 + index * 0.01).toFixed(2)),
      createdAt: now,
      updatedAt: now
    };
    const promptRun: PromptRun = {
      id: promptRunId,
      templateId: template.id,
      templateVersion: template.version,
      franchiseId: seed.id,
      artifactBundleId: bundleId,
      generationJobId: job.id,
      variables: templateVars,
      resolvedPrompt,
      provider,
      model,
      createdAt: now
    };
    const bundle: ArtifactBundle = {
      id: bundleId,
      franchiseId: seed.id,
      seedId: seed.id,
      contentPlanId: plan.id,
      title: `${plan.title} production bundle`,
      medium: plan.format,
      brief: plan.concept,
      artifactIds: artifacts.map((artifact) => artifact.id),
      generationJobIds: [job.id],
      promptRunIds: [promptRun.id],
      lineage: [seed.id, canon.id, plan.id],
      status: "in_review",
      reviewStatus: "pending",
      qualityScore: clamp(Math.round(artifacts.reduce((sum, artifact) => sum + artifact.qualityScore, 0) / artifacts.length)),
      riskFlags: [],
      createdAt: now,
      updatedAt: now
    };

    return { bundle, artifacts, versions, jobs: [job], promptRuns: [promptRun] };
  });
}

export function createReviewDecision(params: {
  bundle: ArtifactBundle;
  franchiseId: string;
  reviewer: string;
  scorecardId: string;
  notes: string;
  createdAt: string;
}): ReviewDecision {
  const decision = params.bundle.qualityScore >= 55 ? "approve" : params.bundle.qualityScore >= 42 ? "revise" : "reject";
  return {
    id: createId("review", params.bundle.id),
    franchiseId: params.franchiseId,
    artifactBundleId: params.bundle.id,
    decision,
    reviewer: params.reviewer,
    notes: params.notes,
    requiredChanges:
      decision === "revise"
        ? ["Tighten hook clarity.", "Reduce similarity risk in copy or prompt framing."]
        : decision === "reject"
          ? ["Rebuild bundle from canon with fresher symbolic language."]
          : [],
    scorecardId: params.scorecardId,
    createdAt: params.createdAt
  };
}

export function createReleaseCandidate(params: {
  seed: FranchiseSeed;
  bundle: ArtifactBundle;
  artifacts: Artifact[];
  plan: ContentAssetPlan;
  createdAt: string;
}): { releaseCandidate: ReleaseCandidate; distributionPackage: DistributionPackage } {
  const releaseId = createId("release", params.bundle.id);
  const distributionId = createId("dist_pkg", params.bundle.id);
  const channel = params.plan.channelTargets[0] ?? "home_feed";
  const releaseCandidate: ReleaseCandidate = {
    id: releaseId,
    franchiseId: params.seed.id,
    artifactBundleId: params.bundle.id,
    channel,
    packageTitle: `${params.seed.name}: ${params.plan.title}`,
    body: `${params.plan.hook} ${params.plan.concept}`,
    assetIds: params.artifacts.map((artifact) => artifact.id),
    publishTimingRecommendation: "Prime evening social window within 48 hours of generation.",
    audienceTarget: params.seed.audienceTarget,
    cta: "Join the franchise watchlist.",
    experimentTags: [params.plan.format, params.seed.slug, "production-v2"],
    status: "ready",
    distributionPackageId: distributionId,
    createdAt: params.createdAt
  };
  const distributionPackage: DistributionPackage = {
    id: distributionId,
    releaseCandidateId: releaseId,
    channel,
    packageTitle: releaseCandidate.packageTitle,
    body: releaseCandidate.body,
    assetsAttached: releaseCandidate.assetIds,
    publishTimingRecommendation: releaseCandidate.publishTimingRecommendation,
    audienceTarget: releaseCandidate.audienceTarget,
    cta: releaseCandidate.cta,
    experimentTags: releaseCandidate.experimentTags,
    createdAt: params.createdAt
  };
  return { releaseCandidate, distributionPackage };
}

export const WIRED_AGENT_IDS: AgentRoleId[] = [
  "trend_scout_agent",
  "aesthetic_scanner_agent",
  "format_opportunity_agent",
  "ceo_agent",
  "chief_creative_officer_agent",
  "universe_architect_agent",
  "character_foundry_agent",
  "canon_archivist_agent",
  "meme_studio_agent",
  "shorts_script_agent",
  "game_concept_agent",
  "quality_gate_agent",
  "similarity_rights_risk_screener",
  "publishing_scheduler_agent",
  "franchise_manager_agent"
];
