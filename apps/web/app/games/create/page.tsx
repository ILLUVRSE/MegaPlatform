"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TemplatePicker from "./components/TemplatePicker";
import ObjectivePanel from "./components/ObjectivePanel";
import DifficultyPanel from "./components/DifficultyPanel";
import ModifierPicker from "./components/ModifierPicker";
import ThemePicker from "./components/ThemePicker";
import GamePreview from "./components/GamePreview";
import SavePublishBar from "./components/SavePublishBar";
import TemplateHelpCard from "./components/TemplateHelpCard";
import { autoFixMinigameSpec, type AutoFixChange } from "@/lib/minigame/autofix";
import {
  buildGamegridSpec,
  GAMEGRID_OBJECTIVES,
  GAMEGRID_TEMPLATES,
  GAMEGRID_TEMPLATE_HELP,
  estimateDifficultyScore,
  generateGoofyTitle,
  getCompatibleModifiers,
  getTemplatePresetPacks,
  type TemplatePresetPack,
  type DifficultyPreset
} from "@/lib/minigame/gamegrid";
import type { MinigameSpec, MinigameTemplateId } from "@/lib/minigame/spec";
import { THEME_PALETTES } from "@/lib/minigame/theme";
import { randomSeed } from "@/lib/minigame/rng";
import { getOrCreateOwnerKey, storeOwnerKey } from "@/lib/gamegrid/owner";
import { trackGameEvent } from "@/lib/gamesTelemetry";

const DEFAULT_TEMPLATE: MinigameTemplateId = "BREAKOUT_MICRO";
const DEFAULT_PALETTE = THEME_PALETTES[0].id;
const ONBOARDING_KEY = "illuvrse:gamegrid-onboarded";

export default function GameGridCreatePage() {
  const [templateId, setTemplateId] = useState<MinigameTemplateId>(DEFAULT_TEMPLATE);
  const [seed, setSeed] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyPreset>("normal");
  const [ramp, setRamp] = useState(0.5);
  const [winObjectiveId, setWinObjectiveId] = useState<string | undefined>();
  const [loseObjectiveId, setLoseObjectiveId] = useState<string | undefined>();
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE);
  const [title, setTitle] = useState("New Game");
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState<MinigameSpec | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [autoFixChanges, setAutoFixChanges] = useState<AutoFixChange[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [status, setStatus] = useState<"NEW" | "DRAFT" | "PUBLISHED">("NEW");
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [lastSavedSignature, setLastSavedSignature] = useState<string>("");
  const [isFirstBuild, setIsFirstBuild] = useState(true);
  const skipTemplateResetRef = useRef(false);
  const skipBuildRef = useRef(false);

  useEffect(() => {
    setSeed(randomSeed());
    setTitle(generateGoofyTitle());
  }, []);

  useEffect(() => {
    setOwnerKey(getOrCreateOwnerKey());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ONBOARDING_KEY);
    setIsFirstBuild(!stored);
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const editId = search.get("edit");
    if (!editId) return;
    if (!ownerKey) return;
    setIsLoadingEdit(true);
    fetch(`/api/gamegrid/games/${editId}`, { headers: { "x-owner-key": ownerKey } })
      .then((res) => res.json())
      .then((data) => {
        if (!data.game) return;
        const game = data.game as { id: string; status: "DRAFT" | "PUBLISHED"; specJson: MinigameSpec; title: string; description: string | null; thumbnailUrl?: string | null };
        skipTemplateResetRef.current = true;
        skipBuildRef.current = true;
        setGameId(game.id);
        setStatus(game.status);
        setSpec(game.specJson);
        setTemplateId(game.specJson.templateId);
        setTitle(game.title);
        setDescription(game.description ?? "");
        setPaletteId(game.specJson.theme.palette);
        setThumbnailUrl(game.thumbnailUrl ?? null);
        setWarnings([]);
        setAutoFixChanges([]);
        setLastSavedSignature(JSON.stringify(game.specJson));
        if (game.status === "PUBLISHED") {
          window.localStorage.setItem(ONBOARDING_KEY, "true");
          setIsFirstBuild(false);
        }

        const objectiveSet = GAMEGRID_OBJECTIVES[game.specJson.templateId];
        const winMatch = objectiveSet.win.find((option) => {
          const candidate = option.apply(game.specJson);
          return JSON.stringify(candidate.winCondition) === JSON.stringify(game.specJson.winCondition);
        });
        const loseMatch = objectiveSet.lose.find((option) => {
          const candidate = option.apply(game.specJson);
          return JSON.stringify(candidate.loseCondition) === JSON.stringify(game.specJson.loseCondition);
        });
        setWinObjectiveId(winMatch?.id ?? objectiveSet.win[0]?.id);
        setLoseObjectiveId(loseMatch?.id ?? objectiveSet.lose[0]?.id);
        setModifiers(game.specJson.modifiers ?? []);
      })
      .finally(() => setIsLoadingEdit(false));
  }, [ownerKey]);

  useEffect(() => {
    if (skipTemplateResetRef.current) {
      skipTemplateResetRef.current = false;
      return;
    }
    const objectiveSet = GAMEGRID_OBJECTIVES[templateId];
    setWinObjectiveId(objectiveSet.win[0]?.id);
    setLoseObjectiveId(objectiveSet.lose[0]?.id);
    setModifiers([]);
  }, [templateId]);

  const modifierOptions = useMemo(() => getCompatibleModifiers(templateId), [templateId]);
  const presetPacks = useMemo(() => getTemplatePresetPacks(templateId), [templateId]);
  const difficultyScore = useMemo(() => (spec ? estimateDifficultyScore(spec) : null), [spec]);
  const showAdvanced = !isFirstBuild;

  useEffect(() => {
    if (!showAdvanced && modifiers.length) {
      setModifiers([]);
    }
  }, [showAdvanced, modifiers]);

  useEffect(() => {
    if (isLoadingEdit) return;
    if (skipBuildRef.current) {
      skipBuildRef.current = false;
      return;
    }
    if (seed === null) return;
    const built = buildGamegridSpec({
      seed,
      templateId,
      difficulty,
      ramp,
      winObjectiveId,
      loseObjectiveId,
      modifiers,
      paletteId,
      title
    });
    const fixed = autoFixMinigameSpec(built);
    setSpec(fixed.spec);
    setWarnings(fixed.warnings);
    setAutoFixChanges(fixed.changes);
  }, [seed, templateId, difficulty, ramp, winObjectiveId, loseObjectiveId, modifiers, paletteId, title]);

  const handleToggleModifier = useCallback(
    (id: string) => {
      setModifiers((prev) =>
        prev.includes(id) ? prev.filter((modifier) => modifier !== id) : [...prev, id]
      );
    },
    []
  );

  const handlePlayTest = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const handleReset = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const handleGoofyTitle = useCallback(() => {
    setTitle(generateGoofyTitle());
  }, []);

  const shareUrl = gameId ? `/games/user/${gameId}` : null;

  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(
      () => setSaveStatus("Share link copied!"),
      () => setSaveStatus("Copy failed")
    );
  }, [shareUrl]);

  const saveDraft = useCallback(async () => {
    if (!spec) return;
    setIsSaving(true);
    setSaveStatus("");
    const payload = gameId
      ? { title, description, specJson: spec, thumbnailUrl: thumbnailUrl ?? undefined }
      : {
          title,
          description,
          templateId,
          seed: spec.seed,
          specDraft: spec,
          paletteId,
          thumbnailUrl: thumbnailUrl ?? undefined
        };
    try {
      const response = await fetch(gameId ? `/api/gamegrid/games/${gameId}` : "/api/gamegrid/games", {
        method: gameId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ownerKey ? { "x-owner-key": ownerKey } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setSaveStatus(data.error ?? "Save failed");
        setIsSaving(false);
        return null;
      }
      if (data.ownerKey) {
        setOwnerKey(data.ownerKey);
        storeOwnerKey(data.ownerKey);
      }
      setGameId(data.game.id);
      setStatus(data.game.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
      if (data.game.specJson) {
        setSpec(data.game.specJson as MinigameSpec);
      }
      if (Array.isArray(data.warnings)) {
        setWarnings(data.warnings);
      }
      if (Array.isArray(data.changes)) {
        setAutoFixChanges(data.changes as AutoFixChange[]);
      }
      setSaveStatus(gameId ? "Draft updated" : "Draft saved");
      setLastSavedSignature(JSON.stringify(data.game.specJson ?? spec));
      return data.game.id as string;
    } catch (error) {
      setSaveStatus((error as Error).message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [spec, gameId, title, description, templateId, paletteId, ownerKey]);

  useEffect(() => {
    if (!spec || isSaving || status === "PUBLISHED") return;
    if (!ownerKey) return;
    const signature = JSON.stringify(spec);
    if (signature === lastSavedSignature) return;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [spec, ownerKey, isSaving, lastSavedSignature, saveDraft]);

  const publish = useCallback(async () => {
    if (!spec) return;
    const ensuredId = gameId ?? (await saveDraft());
    if (!ensuredId) return;
    setIsSaving(true);
    setSaveStatus("");
    try {
      const response = await fetch(`/api/gamegrid/games/${ensuredId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ownerKey ? { "x-owner-key": ownerKey } : {})
        }
      });
      const data = await response.json();
      if (!response.ok) {
        setSaveStatus(data.error ?? "Publish failed");
        setIsSaving(false);
        return;
      }
      setStatus("PUBLISHED");
      if (data.game?.specJson) {
        setSpec(data.game.specJson as MinigameSpec);
      }
      if (Array.isArray(data.warnings)) {
        setWarnings(data.warnings);
      }
      if (Array.isArray(data.changes)) {
        setAutoFixChanges(data.changes as AutoFixChange[]);
      }
      void trackGameEvent({
        eventType: "game.publish",
        surface: "games_create",
        gameId: data.game?.id ?? ensuredId,
        templateId: data.game?.templateId,
        href: data.game?.id ? `/games/user/${data.game.id}` : "/games/community"
      });
      setSaveStatus("Published to community");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ONBOARDING_KEY, "true");
      }
      setIsFirstBuild(false);
    } catch (error) {
      setSaveStatus((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [spec, gameId, ownerKey, saveDraft]);

  const objectiveSet = GAMEGRID_OBJECTIVES[templateId];

  const applyPreset = useCallback((preset: TemplatePresetPack) => {
    setDifficulty(preset.difficulty);
    setRamp(preset.ramp);
    setModifiers(preset.modifiers.slice(0, 3));
  }, []);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,#1b1b3a,#0b0b1a_60%)] p-6 text-white shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">GameGrid Builder</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold">Create Your Own Game</h1>
            <p className="text-sm text-white/70">
              Assemble a safe, 30-second minigame with templates, objectives, and vibes.
            </p>
          </div>
          <button type="button" className="party-button" onClick={handleGoofyTitle}>
            🎲 Goofy Title
          </button>
        </div>
      </header>
      {isFirstBuild ? (
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Guided First Build</p>
          <p className="mt-2">
            Start by picking a template and objective, then choose a difficulty. Advanced knobs unlock after your first
            publish.
          </p>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <TemplatePicker templates={GAMEGRID_TEMPLATES} selectedId={templateId} onSelect={setTemplateId} />
          {isFirstBuild ? (
            <p className="text-xs text-white/60">Tip: Choose the vibe you want players to feel first.</p>
          ) : null}
          <ObjectivePanel
            winOptions={objectiveSet.win}
            loseOptions={objectiveSet.lose}
            selectedWinId={winObjectiveId}
            selectedLoseId={loseObjectiveId}
            onSelectWin={setWinObjectiveId}
            onSelectLose={setLoseObjectiveId}
          />
          {isFirstBuild ? (
            <p className="text-xs text-white/60">Tip: Shorter goals are easier to learn on the first try.</p>
          ) : null}
          <DifficultyPanel
            difficulty={difficulty}
            ramp={ramp}
            onDifficultyChange={setDifficulty}
            onRampChange={setRamp}
            presetPacks={presetPacks}
            onPresetSelect={applyPreset}
            showAdvanced={showAdvanced}
            difficultyScore={difficultyScore}
          />
          {showAdvanced ? (
            <ModifierPicker modifiers={modifierOptions} selected={modifiers} max={3} onToggle={handleToggleModifier} />
          ) : null}
          {showAdvanced ? (
            <ThemePicker palettes={THEME_PALETTES} selectedId={paletteId} onSelect={setPaletteId} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
              Publish once to unlock modifiers, themes, and pacing ramps.
            </div>
          )}
        </div>
        <div className="space-y-8">
          <TemplateHelpCard help={GAMEGRID_TEMPLATE_HELP[templateId]} />
          <GamePreview
            spec={spec}
            previewKey={previewKey}
            onPlayTest={handlePlayTest}
            onReset={handleReset}
            onCaptureThumbnail={(dataUrl) => setThumbnailUrl(dataUrl)}
          />
          <SavePublishBar
            title={title}
            description={description}
            status={status}
            spec={spec}
            warnings={warnings}
            changes={autoFixChanges}
            shareUrl={shareUrl}
            saveStatus={saveStatus}
            isSaving={isSaving}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onSave={saveDraft}
            onPublish={publish}
            onCopyLink={handleCopyLink}
          />
        </div>
      </div>
    </div>
  );
}
