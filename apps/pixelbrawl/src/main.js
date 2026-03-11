import Phaser from "phaser";
import { GameEngine } from "./engine/GameEngine.js";
import { HEIGHT, WIDTH } from "./engine/data.js";
import { AudioManager } from "./render/AudioManager.js";
import { EffectsSystem } from "./render/EffectsSystem.js";
import { FighterRenderer } from "./render/FighterRenderer.js";
import { FighterAssetManager } from "./render/FighterAssetManager.js";
import { HudRenderer } from "./render/HudRenderer.js";
import { StageRenderer } from "./render/StageRenderer.js";
import { InputRouter } from "./render/input/InputRouter.js";
import { AppState } from "./state/AppState.js";
import { RosterManager } from "./engine/roster/RosterManager.js";
import { PortraitManager } from "./render/PortraitManager.js";
import { InputRecorder } from "./render/input/InputRecorder.js";
import { TrainingDummy } from "./render/TrainingDummy.js";
import { StageManager } from "./stages/StageManager.js";
import { SaveManager } from "./state/SaveManager.js";
import { UnlockRules } from "./state/UnlockRules.js";
import { ArcadeRunState } from "./state/ArcadeRunState.js";
import { StoryManager } from "./story/StoryManager.js";
import { StoryKeys } from "./story/StoryKeys.js";

const audioFx = new AudioManager();
const toEngineId = (id) => (id ? id.toUpperCase() : "VEX");
let storySceneLoader = null;

async function ensureStorySceneLoaded(game) {
  if (game?.scene?.keys?.[StoryKeys.SCENE]) return;
  if (!storySceneLoader) {
    storySceneLoader = import("./scenes/StoryScene.js").then(({ StoryScene }) => {
      if (!game?.scene?.keys?.[StoryKeys.SCENE]) {
        game.scene.add(StoryKeys.SCENE, StoryScene, false);
      }
    });
  }
  await storySceneLoader;
}

if (typeof window !== "undefined" && !window.__pixelbrawlStoryFlipBound) {
  window.addEventListener("pixelbrawl-story-pageflip", () => audioFx.play("uiClick"));
  window.__pixelbrawlStoryFlipBound = true;
}

function loadAudioSettings(
  musicVolumeEl,
  sfxVolumeEl,
  muteToggleEl,
  shakeEl,
  controlsOpacityEl,
  storyEnabledEl,
  storyTextModeEl,
  storyAutoAdvanceEl
) {
  const s = SaveManager.load().settings || {};
  if (typeof s.music === "number") musicVolumeEl.value = String(s.music);
  if (typeof s.sfx === "number") sfxVolumeEl.value = String(s.sfx);
  if (typeof s.mute === "boolean") muteToggleEl.checked = s.mute;
  if (shakeEl && typeof s.shake === "string") shakeEl.value = s.shake;
  if (controlsOpacityEl && typeof s.controlsOpacity === "number") controlsOpacityEl.value = String(s.controlsOpacity);
  if (storyEnabledEl && typeof s.storyEnabled === "boolean") storyEnabledEl.checked = s.storyEnabled;
  if (storyTextModeEl && typeof s.storyTextMode === "string") storyTextModeEl.value = s.storyTextMode;
  if (storyAutoAdvanceEl && typeof s.storyAutoAdvance === "boolean") storyAutoAdvanceEl.checked = s.storyAutoAdvance;
  AppState.storyEnabled = s.storyEnabled !== false;
  AppState.storyTextMode = s.storyTextMode === "typewriter" ? "typewriter" : "instant";
  AppState.storyAutoAdvance = s.storyAutoAdvance === true;
}

function saveAudioSettings(
  musicVolumeEl,
  sfxVolumeEl,
  muteToggleEl,
  shakeEl,
  controlsOpacityEl,
  storyEnabledEl,
  storyTextModeEl,
  storyAutoAdvanceEl
) {
  SaveManager.save({
    settings: {
      music: Number(musicVolumeEl.value),
      sfx: Number(sfxVolumeEl.value),
      mute: !!muteToggleEl.checked,
      shake: shakeEl?.value || "full",
      controlsOpacity: controlsOpacityEl ? Number(controlsOpacityEl.value) : 0.9,
      storyEnabled: storyEnabledEl ? !!storyEnabledEl.checked : true,
      storyTextMode: storyTextModeEl?.value === "typewriter" ? "typewriter" : "instant",
      storyAutoAdvance: storyAutoAdvanceEl ? !!storyAutoAdvanceEl.checked : false
    }
  });
}

function applyAudioSettings(
  musicVolumeEl,
  sfxVolumeEl,
  muteToggleEl,
  shakeEl,
  effects,
  controlsOpacityEl,
  storyEnabledEl,
  storyTextModeEl,
  storyAutoAdvanceEl
) {
  audioFx.setMusic(musicVolumeEl.value);
  audioFx.setSfx(sfxVolumeEl.value);
  audioFx.setMuted(muteToggleEl.checked);
  if (effects && shakeEl) effects.setShakeLevel(shakeEl.value);
  if (controlsOpacityEl) document.documentElement.style.setProperty("--controls-opacity", String(controlsOpacityEl.value));
  if (storyEnabledEl) AppState.storyEnabled = !!storyEnabledEl.checked;
  AppState.storyTextMode = storyTextModeEl?.value === "typewriter" ? "typewriter" : "instant";
  AppState.storyAutoAdvance = storyAutoAdvanceEl ? !!storyAutoAdvanceEl.checked : false;
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.menuOverlay = document.getElementById("menuOverlay");
    this.selectOverlay = document.getElementById("selectOverlay");
    this.resultsOverlay = document.getElementById("resultsOverlay");
    this.arcadeSummaryOverlay = document.getElementById("arcadeSummaryOverlay");
    this.trainingOverlay = document.getElementById("trainingOverlay");
    this.hudRoot = document.getElementById("hud");
    this.settingsOverlay = document.getElementById("settingsOverlay");
    this.playBtn = document.getElementById("playBtn");
    this.arcadeBtn = document.getElementById("arcadeBtn");
    this.trainingBtn = document.getElementById("trainingBtn");
    this.progressBtn = document.getElementById("progressBtn");
    this.openSettingsBtn = document.getElementById("openSettingsBtn");
    this.closeSettingsBtn = document.getElementById("closeSettingsBtn");
    this.progressOverlay = document.getElementById("progressOverlay");
    this.closeProgressBtn = document.getElementById("closeProgressBtn");
    this.progressStats = document.getElementById("progressStats");
    this.progressUnlocked = document.getElementById("progressUnlocked");
    this.progressNextUnlock = document.getElementById("progressNextUnlock");
    this.musicVolume = document.getElementById("musicVolume");
    this.sfxVolume = document.getElementById("sfxVolume");
    this.muteToggle = document.getElementById("muteToggle");
    this.shakeLevel = document.getElementById("shakeLevel");
    this.controlsOpacity = document.getElementById("controlsOpacity");
    this.storyEnabledToggle = document.getElementById("storyEnabledToggle");
    this.storyTextMode = document.getElementById("storyTextMode");
    this.storyAutoAdvanceToggle = document.getElementById("storyAutoAdvanceToggle");

    this.menuOverlay.classList.remove("hidden");
    this.selectOverlay.classList.add("hidden");
    this.resultsOverlay.classList.add("hidden");
    this.arcadeSummaryOverlay.classList.add("hidden");
    this.trainingOverlay.classList.add("hidden");
    this.hudRoot.classList.add("hidden");
    this.settingsOverlay.classList.add("hidden");
    this.progressOverlay.classList.add("hidden");

    loadAudioSettings(
      this.musicVolume,
      this.sfxVolume,
      this.muteToggle,
      this.shakeLevel,
      this.controlsOpacity,
      this.storyEnabledToggle,
      this.storyTextMode,
      this.storyAutoAdvanceToggle
    );
    applyAudioSettings(
      this.musicVolume,
      this.sfxVolume,
      this.muteToggle,
      this.shakeLevel,
      null,
      this.controlsOpacity,
      this.storyEnabledToggle,
      this.storyTextMode,
      this.storyAutoAdvanceToggle
    );

    this.onPlay = () => {
      audioFx.unlock();
      audioFx.play("uiClick");
      AppState.gameMode = "versus";
      AppState.arcadeRun = null;
      this.scene.start("SelectScene");
    };
    this.onTraining = () => {
      audioFx.unlock();
      audioFx.play("uiClick");
      AppState.gameMode = "training";
      AppState.arcadeRun = null;
      this.scene.start("SelectScene");
    };
    this.onArcade = () => {
      audioFx.unlock();
      audioFx.play("uiClick");
      AppState.gameMode = "arcade";
      AppState.arcadeRun = null;
      this.scene.start("SelectScene");
    };
    this.onProgressOpen = () => {
      this.renderProgress();
      this.progressOverlay.classList.remove("hidden");
    };
    this.onProgressClose = () => this.progressOverlay.classList.add("hidden");
    this.onSettingsOpen = () => this.settingsOverlay.classList.remove("hidden");
    this.onSettingsClose = () => this.settingsOverlay.classList.add("hidden");
    this.onSettingsChange = () => {
      applyAudioSettings(
        this.musicVolume,
        this.sfxVolume,
        this.muteToggle,
        this.shakeLevel,
        null,
        this.controlsOpacity,
        this.storyEnabledToggle,
        this.storyTextMode,
        this.storyAutoAdvanceToggle
      );
      saveAudioSettings(
        this.musicVolume,
        this.sfxVolume,
        this.muteToggle,
        this.shakeLevel,
        this.controlsOpacity,
        this.storyEnabledToggle,
        this.storyTextMode,
        this.storyAutoAdvanceToggle
      );
    };

    this.playBtn.addEventListener("click", this.onPlay);
    this.arcadeBtn.addEventListener("click", this.onArcade);
    this.trainingBtn.addEventListener("click", this.onTraining);
    this.progressBtn.addEventListener("click", this.onProgressOpen);
    this.openSettingsBtn.addEventListener("click", this.onSettingsOpen);
    this.closeSettingsBtn.addEventListener("click", this.onSettingsClose);
    this.closeProgressBtn.addEventListener("click", this.onProgressClose);
    this.musicVolume.addEventListener("input", this.onSettingsChange);
    this.sfxVolume.addEventListener("input", this.onSettingsChange);
    this.muteToggle.addEventListener("change", this.onSettingsChange);
    this.shakeLevel.addEventListener("change", this.onSettingsChange);
    this.controlsOpacity.addEventListener("input", this.onSettingsChange);
    this.storyEnabledToggle.addEventListener("change", this.onSettingsChange);
    this.storyTextMode.addEventListener("change", this.onSettingsChange);
    this.storyAutoAdvanceToggle.addEventListener("change", this.onSettingsChange);

    this.events.once("shutdown", () => {
      this.playBtn.removeEventListener("click", this.onPlay);
      this.arcadeBtn.removeEventListener("click", this.onArcade);
      this.trainingBtn.removeEventListener("click", this.onTraining);
      this.progressBtn.removeEventListener("click", this.onProgressOpen);
      this.openSettingsBtn.removeEventListener("click", this.onSettingsOpen);
      this.closeSettingsBtn.removeEventListener("click", this.onSettingsClose);
      this.closeProgressBtn.removeEventListener("click", this.onProgressClose);
      this.musicVolume.removeEventListener("input", this.onSettingsChange);
      this.sfxVolume.removeEventListener("input", this.onSettingsChange);
      this.muteToggle.removeEventListener("change", this.onSettingsChange);
      this.shakeLevel.removeEventListener("change", this.onSettingsChange);
      this.controlsOpacity.removeEventListener("input", this.onSettingsChange);
      this.storyEnabledToggle.removeEventListener("change", this.onSettingsChange);
      this.storyTextMode.removeEventListener("change", this.onSettingsChange);
      this.storyAutoAdvanceToggle.removeEventListener("change", this.onSettingsChange);
    });
  }

  renderProgress() {
    const save = SaveManager.load();
    const unlocked = save.progression.unlockedFighters || {};
    const enabledIds = RosterManager.getEnabledFighters();
    const unlockedCount = enabledIds.filter((id) => unlocked[id]).length;
    const total = enabledIds.length;
    const nextUnlock = UnlockRules.getNextUnlock(unlocked);
    const nextMeta = nextUnlock ? RosterManager.getFighterMeta(nextUnlock) : null;

    this.progressStats.innerHTML = `
      <div>Unlocked: ${unlockedCount} / ${total}</div>
      <div>Total Wins: ${save.progression.totalWins}</div>
      <div>Arcade Clears: ${save.progression.arcadeClears}</div>
      <div>Best Grade: ${save.progression.bestArcadeGrade || "-"}</div>
      <div>Best Time: ${save.progression.bestArcadeTimeMs ? `${Math.round(save.progression.bestArcadeTimeMs / 1000)}s` : "-"}</div>
      <div>Matches: ${save.stats.matchesPlayed}</div>
      <div>Damage Dealt: ${save.stats.damageDealt}</div>
      <div>Damage Taken: ${save.stats.damageTaken}</div>
      <div>Perfect Blocks: ${save.stats.perfectBlocks}</div>
      <div>KOs: ${save.stats.kos}</div>
    `;

    this.progressUnlocked.innerHTML = enabledIds
      .map((id) => {
        const meta = RosterManager.getFighterMeta(id);
        const isUnlocked = unlocked[id] === true;
        return `<span class="progressChip ${isUnlocked ? "on" : "off"}">${meta.displayName}</span>`;
      })
      .join("");

    if (!nextMeta) this.progressNextUnlock.textContent = "All unlockable fighters are already unlocked.";
    else this.progressNextUnlock.textContent = `Next unlock: ${nextMeta.displayName} (Arcade Clear #${UnlockRules.getClearNumberFor(nextUnlock)})`;
  }
}

class SelectScene extends Phaser.Scene {
  constructor() {
    super("SelectScene");
    this.activeSlot = "p1";
  }

  create() {
    this.menuOverlay = document.getElementById("menuOverlay");
    this.selectOverlay = document.getElementById("selectOverlay");
    this.resultsOverlay = document.getElementById("resultsOverlay");
    this.hudRoot = document.getElementById("hud");
    this.settingsOverlay = document.getElementById("settingsOverlay");
    this.selectGrid = document.getElementById("selectGrid");
    this.p1Name = document.getElementById("p1SelectName");
    this.p2Name = document.getElementById("p2SelectName");
    this.startMatchBtn = document.getElementById("startMatchBtn");
    this.backToMenuBtn = document.getElementById("backToMenuBtn");
    this.stageButtons = document.getElementById("stageButtons");
    this.diffButtons = Array.from(this.selectOverlay.querySelectorAll(".difficultyButtons button"));
    this.modeButtons = Array.from(this.selectOverlay.querySelectorAll(".modeButtons button"));

    this.menuOverlay.classList.add("hidden");
    this.resultsOverlay.classList.add("hidden");
    this.hudRoot.classList.add("hidden");
    this.settingsOverlay.classList.add("hidden");
    this.selectOverlay.classList.remove("hidden");

    this.ensureEnabledSelection();
    this.renderGrid();
    this.renderStages();
    this.updateHeader();
    this.updateDifficulty();
    this.updateMode();

    this.onStartMatch = () => {
      audioFx.play("uiClick");
      if (AppState.gameMode === "training") {
        this.scene.start("TrainingScene");
      } else if (AppState.gameMode === "arcade") {
        AppState.arcadeRun = ArcadeRunState.create({ p1Id: AppState.selectedP1, baseDifficulty: AppState.difficulty });
        this.scene.start("FightScene");
      } else {
        this.scene.start("FightScene");
      }
    };
    this.onBack = () => {
      audioFx.play("uiClick");
      AppState.arcadeRun = null;
      this.scene.start("MenuScene");
    };
    this.startMatchBtn.addEventListener("click", this.onStartMatch);
    this.backToMenuBtn.addEventListener("click", this.onBack);

    this.diffButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        AppState.difficulty = btn.dataset.diff;
        this.updateDifficulty();
      });
    });
    this.modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        AppState.gameMode = btn.dataset.mode;
        this.updateMode();
      });
    });

    this.events.once("shutdown", () => {
      this.startMatchBtn.removeEventListener("click", this.onStartMatch);
      this.backToMenuBtn.removeEventListener("click", this.onBack);
    });
  }

  renderGrid() {
    this.selectGrid.innerHTML = "";
    const save = SaveManager.load();
    const unlocked = save.progression.unlockedFighters || {};
    const trainingMode = AppState.gameMode === "training";
    const requiresUnlock = !trainingMode && (AppState.gameMode === "arcade" || this.activeSlot === "p1");
    const nextUnlock = UnlockRules.getNextUnlock(unlocked);
    RosterManager.getAllSlots().filter((slot) => slot.meta.enabled).forEach((slot) => {
      const fighter = slot.meta;
      const isUnlocked = trainingMode || unlocked[fighter.id] === true;
      const isLocked = !isUnlocked;
      const el = document.createElement("button");
      el.className = `selectCard ${isLocked ? "locked" : ""}`;
      el.disabled = requiresUnlock && !isUnlocked;
      el.dataset.id = fighter.id;

      el.style.borderColor = fighter.accent.primary;
      el.style.background = `linear-gradient(145deg, ${fighter.accent.primary}55, #0b0f26)`;

      el.innerHTML = `
        <div class="portraitSlot"></div>
        <div class="selectName">${fighter.displayName}</div>
        <div class="selectStyle">${fighter.tag}</div>
        ${isLocked ? `<div class="selectUnlock">${this.unlockTextFor(fighter.id, nextUnlock)}</div>` : ""}
      `;

      const portrait = el.querySelector(".portraitSlot");
      if (portrait) {
        PortraitManager.loadPortrait(fighter.id, (url) => {
          portrait.style.backgroundImage = `url(${url})`;
          portrait.style.backgroundSize = "cover";
          portrait.style.backgroundPosition = "center";
        });
      }

      el.addEventListener("click", () => this.selectFighter(fighter));
      this.selectGrid.appendChild(el);
    });

    this.refreshSelection();
  }

  unlockTextFor(id, nextUnlock) {
    const clearNum = UnlockRules.getClearNumberFor(id);
    if (!clearNum) return "LOCKED";
    if (nextUnlock === id) return `Next unlock: Arcade Clear #${clearNum}`;
    return `Unlocks after Arcade Clear #${clearNum}`;
  }

  renderStages() {
    if (!this.stageButtons) return;
    this.stageButtons.innerHTML = "";
    StageManager.getAllStages().forEach((stage) => {
      const btn = document.createElement("button");
      btn.className = "stageBtn";
      btn.dataset.id = stage.id;
      btn.innerHTML = `<span class=\"stageName\">${stage.displayName}</span>`;
      btn.addEventListener("click", () => {
        AppState.selectedStageId = stage.id;
        this.updateStageSelection();
      });
      this.stageButtons.appendChild(btn);
    });
    this.updateStageSelection();
  }

  updateStageSelection() {
    if (!this.stageButtons) return;
    Array.from(this.stageButtons.children).forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === AppState.selectedStageId);
    });
  }

  selectFighter(fighter) {
    if (!fighter?.enabled) return;
    if (AppState.gameMode === "arcade") {
      AppState.selectedP1 = fighter.id;
      this.updateHeader();
      this.refreshSelection();
      return;
    }
    if (this.activeSlot === "p1") {
      AppState.selectedP1 = fighter.id;
      this.activeSlot = "p2";
    } else {
      AppState.selectedP2 = fighter.id;
      this.activeSlot = "p1";
    }
    this.updateHeader();
    this.renderGrid();
  }

  updateHeader() {
    const p1 = RosterManager.getFighterMeta(AppState.selectedP1);
    const p2 = RosterManager.getFighterMeta(AppState.selectedP2);
    this.p1Name.textContent = p1.displayName;
    this.p2Name.textContent = AppState.gameMode === "arcade" ? "LADDER" : p2.displayName;
    this.selectOverlay.classList.toggle("p1Active", this.activeSlot === "p1");
    this.selectOverlay.classList.toggle("p2Active", this.activeSlot === "p2");
  }

  updateDifficulty() {
    this.diffButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.diff === AppState.difficulty);
    });
  }

  updateMode() {
    this.modeButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.mode === AppState.gameMode);
    });
    const disableDiff = AppState.gameMode === "training";
    this.diffButtons.forEach((btn) => {
      btn.disabled = disableDiff;
      btn.classList.toggle("disabled", disableDiff);
    });
    if (AppState.gameMode === "arcade") this.activeSlot = "p1";
    if (this.stageButtons) this.stageButtons.classList.toggle("disabled", AppState.gameMode === "arcade");
    this.ensureEnabledSelection();
    this.renderGrid();
    this.updateHeader();
  }

  ensureEnabledSelection() {
    const enabledIds = RosterManager.getEnabledFighters();
    if (enabledIds.length === 0) return;
    if (!enabledIds.includes(AppState.selectedP1)) AppState.selectedP1 = enabledIds[0];
    if (!enabledIds.includes(AppState.selectedP2)) {
      AppState.selectedP2 = enabledIds.find((id) => id !== AppState.selectedP1) || enabledIds[0];
    }
  }

  refreshSelection() {
    Array.from(this.selectGrid.children).forEach((el) => {
      const id = el.dataset.id;
      el.classList.toggle("p1Pick", id === AppState.selectedP1);
      el.classList.toggle("p2Pick", id === AppState.selectedP2);
    });
  }
}

class FightScene extends Phaser.Scene {
  constructor() {
    super("FightScene");
    this.lastTs = 0;
    this.hitStop = 0;
    this.koSequence = null;
    this.koLock = 0;
    this.resultsVisible = false;
  }

  create() {
    const canvas = this.sys.game.canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    this.game.renderer.clearBeforeRender = false;

    if (AppState.gameMode === "arcade" && AppState.arcadeRun) {
      const entry = AppState.arcadeRun.ladder[AppState.arcadeRun.currentMatchIndex];
      if (entry?.stageId) AppState.selectedStageId = entry.stageId;
    }

    this.engine = new GameEngine();
    this.inputRouter = new InputRouter();
    this.stage = new StageRenderer(ctx, WIDTH, HEIGHT, AppState.selectedStageId);
    this.fighters = new FighterRenderer(ctx);
    this.hud = new HudRenderer(document.getElementById("hud"));
    this.effects = new EffectsSystem(ctx, WIDTH, HEIGHT);

    this.hudRoot = document.getElementById("hud");
    this.menuOverlay = document.getElementById("menuOverlay");
    this.selectOverlay = document.getElementById("selectOverlay");
    this.resultsOverlay = document.getElementById("resultsOverlay");
    this.winnerText = document.getElementById("winnerText");
    this.matchMeta = document.getElementById("matchMeta");
    this.rematchBtn = document.getElementById("rematchBtn");
    this.nextFightBtn = document.getElementById("nextFightBtn");
    this.changeFightersBtn = document.getElementById("changeFightersBtn");
    this.endRunBtn = document.getElementById("endRunBtn");
    this.mainMenuBtn = document.getElementById("mainMenuBtn");
    this.arcadeSummaryOverlay = document.getElementById("arcadeSummaryOverlay");
    this.arcadeSummaryResult = document.getElementById("arcadeSummaryResult");
    this.arcadeSummaryStats = document.getElementById("arcadeSummaryStats");
    this.unlockBanner = document.getElementById("unlockBanner");
    this.arcadeRematchBtn = document.getElementById("arcadeRematchBtn");
    this.arcadeChangeBtn = document.getElementById("arcadeChangeBtn");
    this.arcadeMenuBtn = document.getElementById("arcadeMenuBtn");
    this.trainingOverlay = document.getElementById("trainingOverlay");
    this.settingsOverlay = document.getElementById("settingsOverlay");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.closeSettingsBtn = document.getElementById("closeSettingsBtn");
    this.debugBtn = document.getElementById("debugBtn");
    this.musicVolume = document.getElementById("musicVolume");
    this.sfxVolume = document.getElementById("sfxVolume");
    this.muteToggle = document.getElementById("muteToggle");
    this.shakeLevel = document.getElementById("shakeLevel");
    this.controlsOpacity = document.getElementById("controlsOpacity");
    this.storyEnabledToggle = document.getElementById("storyEnabledToggle");
    this.storyTextMode = document.getElementById("storyTextMode");
    this.storyAutoAdvanceToggle = document.getElementById("storyAutoAdvanceToggle");
    this.touchControls = document.getElementById("touchControls");

    this.menuOverlay.classList.add("hidden");
    this.selectOverlay.classList.add("hidden");
    this.resultsOverlay.classList.add("hidden");
    this.arcadeSummaryOverlay.classList.add("hidden");
    this.trainingOverlay.classList.add("hidden");
    this.hudRoot.classList.remove("hidden");
    this.settingsOverlay.classList.add("hidden");
    this.resultsVisible = false;
    this.nextFightBtn.classList.add("hidden");
    this.endRunBtn.classList.add("hidden");

    loadAudioSettings(
      this.musicVolume,
      this.sfxVolume,
      this.muteToggle,
      this.shakeLevel,
      this.controlsOpacity,
      this.storyEnabledToggle,
      this.storyTextMode,
      this.storyAutoAdvanceToggle
    );
    applyAudioSettings(
      this.musicVolume,
      this.sfxVolume,
      this.muteToggle,
      this.shakeLevel,
      this.effects,
      this.controlsOpacity,
      this.storyEnabledToggle,
      this.storyTextMode,
      this.storyAutoAdvanceToggle
    );

    this.bindUi();
    if (AppState.gameMode === "arcade" && AppState.arcadeRun) {
      this.beginArcadeMatchFlow();
    } else {
      this.engine.aiDifficulty = AppState.difficulty;
      this.engine.startMatch(toEngineId(AppState.selectedP1), toEngineId(AppState.selectedP2));
      this.matchStats = this.newMatchStats();
    }
    this.snapshot = this.engine.getSnapshot();

    this.events.on("shutdown", () => this.unbindUi());
  }

  bindUi() {
    this.onSettingsOpen = () => this.settingsOverlay.classList.remove("hidden");
    this.onSettingsClose = () => this.settingsOverlay.classList.add("hidden");
    this.onDebug = () => {
      this.engine.toggleDebug();
      this.debugBtn.classList.toggle("pressed", this.engine.debugEnabled);
    };

    this.settingsBtn.addEventListener("click", this.onSettingsOpen);
    this.closeSettingsBtn.addEventListener("click", this.onSettingsClose);
    this.debugBtn.addEventListener("click", this.onDebug);

    this.onRematch = () => {
      audioFx.play("uiClick");
      this.resultsOverlay.classList.add("hidden");
      this.resultsVisible = false;
      this.engine.paused = false;
      this.engine.aiDifficulty = AppState.difficulty;
      this.engine.startMatch(toEngineId(AppState.selectedP1), toEngineId(AppState.selectedP2));
      this.hud.clearKO();
      this.koSequence = null;
      this.hitStop = 0;
      this.koLock = 0;
      this.matchStats = this.newMatchStats();
    };
    this.onNextFight = () => {
      audioFx.play("uiClick");
      if (!AppState.arcadeRun) return;
      AppState.arcadeRun.currentMatchIndex += 1;
      this.beginArcadeMatchFlow();
      this.resultsOverlay.classList.add("hidden");
      this.resultsVisible = false;
    };
    this.onEndRun = () => {
      audioFx.play("uiClick");
      AppState.arcadeRun = null;
      this.resultsOverlay.classList.add("hidden");
      this.scene.start("MenuScene");
    };
    this.onChangeFighters = () => {
      audioFx.play("uiClick");
      this.resultsVisible = false;
      this.scene.start("SelectScene");
    };
    this.onMainMenu = () => {
      audioFx.play("uiClick");
      this.resultsVisible = false;
      this.scene.start("MenuScene");
    };
    this.onArcadeRematch = () => {
      audioFx.play("uiClick");
      AppState.arcadeRun = ArcadeRunState.create({ p1Id: AppState.selectedP1, baseDifficulty: AppState.difficulty });
      this.arcadeSummaryOverlay.classList.add("hidden");
      this.scene.start("FightScene");
    };
    this.onArcadeChange = () => {
      audioFx.play("uiClick");
      AppState.arcadeRun = null;
      this.arcadeSummaryOverlay.classList.add("hidden");
      this.scene.start("SelectScene");
    };
    this.onArcadeMenu = () => {
      audioFx.play("uiClick");
      AppState.arcadeRun = null;
      this.arcadeSummaryOverlay.classList.add("hidden");
      this.scene.start("MenuScene");
    };

    this.rematchBtn.addEventListener("click", this.onRematch);
    this.nextFightBtn.addEventListener("click", this.onNextFight);
    this.endRunBtn.addEventListener("click", this.onEndRun);
    this.changeFightersBtn.addEventListener("click", this.onChangeFighters);
    this.mainMenuBtn.addEventListener("click", this.onMainMenu);
    this.arcadeRematchBtn.addEventListener("click", this.onArcadeRematch);
    this.arcadeChangeBtn.addEventListener("click", this.onArcadeChange);
    this.arcadeMenuBtn.addEventListener("click", this.onArcadeMenu);

    this.onSettingsChanged = () => {
      applyAudioSettings(this.musicVolume, this.sfxVolume, this.muteToggle, this.shakeLevel, this.effects, this.controlsOpacity, this.storyEnabledToggle, this.storyTextMode, this.storyAutoAdvanceToggle);
      saveAudioSettings(this.musicVolume, this.sfxVolume, this.muteToggle, this.shakeLevel, this.controlsOpacity, this.storyEnabledToggle, this.storyTextMode, this.storyAutoAdvanceToggle);
    };

    this.musicVolume.addEventListener("input", this.onSettingsChanged);
    this.sfxVolume.addEventListener("input", this.onSettingsChanged);
    this.muteToggle.addEventListener("change", this.onSettingsChanged);
    this.shakeLevel.addEventListener("change", this.onSettingsChanged);
    this.controlsOpacity.addEventListener("input", this.onSettingsChanged);
    this.storyEnabledToggle.addEventListener("change", this.onSettingsChanged);
    this.storyTextMode.addEventListener("change", this.onSettingsChanged);
    this.storyAutoAdvanceToggle.addEventListener("change", this.onSettingsChanged);

    this.onKey = (e) => {
      if (e.key.toLowerCase() === "h") {
        this.engine.toggleDebug();
        this.debugBtn.classList.toggle("pressed", this.engine.debugEnabled);
      }
    };
    window.addEventListener("keydown", this.onKey);
  }

  unbindUi() {
    this.settingsBtn.removeEventListener("click", this.onSettingsOpen);
    this.closeSettingsBtn.removeEventListener("click", this.onSettingsClose);
    this.debugBtn.removeEventListener("click", this.onDebug);
    this.musicVolume.removeEventListener("input", this.onSettingsChanged);
    this.sfxVolume.removeEventListener("input", this.onSettingsChanged);
    this.muteToggle.removeEventListener("change", this.onSettingsChanged);
    this.shakeLevel.removeEventListener("change", this.onSettingsChanged);
    this.controlsOpacity.removeEventListener("input", this.onSettingsChanged);
    this.storyEnabledToggle.removeEventListener("change", this.onSettingsChanged);
    this.storyTextMode.removeEventListener("change", this.onSettingsChanged);
    this.storyAutoAdvanceToggle.removeEventListener("change", this.onSettingsChanged);
    this.rematchBtn.removeEventListener("click", this.onRematch);
    this.nextFightBtn.removeEventListener("click", this.onNextFight);
    this.endRunBtn.removeEventListener("click", this.onEndRun);
    this.changeFightersBtn.removeEventListener("click", this.onChangeFighters);
    this.mainMenuBtn.removeEventListener("click", this.onMainMenu);
    this.arcadeRematchBtn.removeEventListener("click", this.onArcadeRematch);
    this.arcadeChangeBtn.removeEventListener("click", this.onArcadeChange);
    this.arcadeMenuBtn.removeEventListener("click", this.onArcadeMenu);
    window.removeEventListener("keydown", this.onKey);
  }

  update(ts) {
    if (!this.lastTs) this.lastTs = ts;
    const realDt = Math.min((ts - this.lastTs) / 1000, 1 / 20);
    this.lastTs = ts;

    this.inputRouter.update(realDt);
    const controlsLocked = this.koLock > 0 || this.hitStop > 0 || this.engine.paused || this.resultsVisible;
    const intent = controlsLocked ? this.neutralIntent() : this.inputRouter.getIntent();

    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - realDt);
    if (this.koLock > 0) this.koLock = Math.max(0, this.koLock - realDt);
    if (this.touchControls) this.touchControls.classList.toggle("locked", controlsLocked);
    let dt = this.hitStop > 0 ? 0 : realDt;
    if (this.effects.slowMo > 0) dt *= 0.28;

    const snapshot = dt > 0 ? this.engine.update(dt, intent) : this.engine.getSnapshot();
    this.snapshot = snapshot;

    if (dt > 0) {
      snapshot.events.forEach((e) => {
        this.applyHitStop(e);
        this.effects.onEvent(e);
        this.hud.onEvent(e);
        this.fighters.onEvent(e);
        audioFx.onEvent(e);
        this.trackStats(e);
        if (e.type === "KO") this.startKOSequence(e);
        if (e.type === "MATCH_END") this.showResults(e);
      });
    }

    const intense = snapshot.p1.health / snapshot.p1.maxHealth < 0.25 || snapshot.p2.health / snapshot.p2.maxHealth < 0.25;
    audioFx.tick(realDt, intense);
    this.effects.tick(this.hitStop > 0 ? 0 : realDt);
    this.hud.tick(realDt);
    this.tickKO(realDt);
    this.effects.setCombatFrame(snapshot);

    this.effects.beginCamera();
    this.stage.render(snapshot, ts);
    this.fighters.render(snapshot);
    this.effects.render();
    this.fighters.renderDebug(snapshot);
    this.effects.endCamera();
    this.hud.render(snapshot);
  }

  newMatchStats() {
    return {
      damageDealt: 0,
      damageTaken: 0,
      perfectBlocks: 0,
      kos: 0,
      startMs: Date.now()
    };
  }

  trackStats(e) {
    if (!e || !this.matchStats) return;
    if (e.type === "BLOCK" && e.data?.perfect && e.data?.actor === "p1") {
      this.matchStats.perfectBlocks += 1;
    }
    if (e.type === "KO" && e.data?.winner === "p1") {
      this.matchStats.kos += 1;
    }
    const damageEvents = ["HIT", "KNOCKDOWN", "LAUNCH", "THROW", "BLOCK"];
    if (damageEvents.includes(e.type) && typeof e.data?.damage === "number") {
      if (e.data.attacker === "p1") this.matchStats.damageDealt += e.data.damage;
      else if (e.data.attacker === "p2") this.matchStats.damageTaken += e.data.damage;
    }
  }

  beginArcadeMatchFlow() {
    const run = AppState.arcadeRun;
    if (!run) return;
    const entry = run.ladder[run.currentMatchIndex];
    if (!entry) return;

    AppState.selectedStageId = entry.stageId;
    if (this.stage?.setStage) this.stage.setStage(entry.stageId);

    this.playArcadeStory(StoryKeys.TYPES.PREFIGHT, () => {
      this.startArcadeMatchCore();
    });
  }

  startArcadeMatchCore() {
    const run = AppState.arcadeRun;
    if (!run) return;
    const entry = run.ladder[run.currentMatchIndex];
    if (!entry) return;
    AppState.selectedStageId = entry.stageId;
    if (this.stage?.setStage) this.stage.setStage(entry.stageId);
    this.engine.aiDifficulty = entry.aiDifficulty;
    this.engine.startMatch(toEngineId(run.selectedP1FighterId), toEngineId(entry.opponentId));
    this.matchStats = this.newMatchStats();
    run.matchStartMs = Date.now();
    this.snapshot = this.engine.getSnapshot();
    this.resultsOverlay.classList.add("hidden");
    this.resultsVisible = false;
    this.hud.clearKO();
    this.koSequence = null;
    this.hitStop = 0;
    this.koLock = 0;
  }

  playArcadeStory(type, onDone = () => {}, options = {}) {
    if (!AppState.storyEnabled || AppState.gameMode !== "arcade") {
      onDone({ skipped: false });
      return;
    }

    const run = AppState.arcadeRun;
    if (!run) {
      onDone({ skipped: false });
      return;
    }

    const entry = run.ladder[run.currentMatchIndex];
    const p1Id = run.selectedP1FighterId;
    const p2Id = options.p2Id || entry?.opponentId;
    const stageId = options.stageId || entry?.stageId || AppState.selectedStageId;

    const sequence = StoryManager.getArcadeSequence({
      type,
      p1Id,
      p2Id,
      stageId,
      runSeed: run.runSeed,
      matchIndex: run.currentMatchIndex
    });

    if (!sequence?.panels?.length) {
      onDone({ skipped: false });
      return;
    }

    this.registry.set("storyP1", p1Id);
    this.registry.set("storyP2", p2Id);
    this.registry.set("storyStage", stageId);

    ensureStorySceneLoaded(this.game)
      .then(() => {
        this.scene.pause();
        this.scene.launch(StoryKeys.SCENE, {
          sequence,
          onComplete: (result) => {
            this.scene.resume();
            onDone(result || { skipped: false });
          }
        });
      })
      .catch(() => {
        onDone({ skipped: false });
      });
  }

  applyHitStop(e) {
    if (!e?.type) return;
    const heavyMove = e.type === "LAUNCH" || e.type === "KNOCKDOWN" || e.type === "THROW" || (e.type === "HIT" && ["heavy", "launcher", "sweep", "throw"].includes(e.data?.move));
    let stop = 0;
    if (e.type === "BLOCK") stop = 0.032;
    else if (heavyMove) stop = 0.11;
    else if (e.type === "HIT") stop = 0.056;
    else if (e.type === "KO") stop = 0.14;
    if (stop > 0) this.hitStop = Math.max(this.hitStop, stop);
  }

  neutralIntent() {
    return {
      left: false,
      right: false,
      up: false,
      down: false,
      hitPressed: false,
      kickPressed: false,
      powerPressed: false,
      guardHeld: false,
      guardTapped: false,
      flickLane: 0,
      jump: false,
      stepPower: false
    };
  }

  startKOSequence(e) {
    if (this.koSequence) return;
    this.koSequence = { timer: 1.2 };
    this.koLock = 1.2;
    this.hud.startKO("K.O.");
    audioFx.duckMusic(0.6, 0.5);
  }

  tickKO(dt) {
    if (!this.koSequence) return;
    this.koSequence.timer -= dt;
    if (this.koSequence.timer > 0) return;

    const snapshot = this.engine.finishPendingRound();
    snapshot.events.forEach((e) => {
      this.effects.onEvent(e);
      this.hud.onEvent(e);
      audioFx.onEvent(e);
      if (e.type === "MATCH_END") this.showResults(e);
    });
    this.snapshot = snapshot;
    this.koSequence = null;
  }

  showResults(e) {
    if (AppState.gameMode === "arcade") {
      this.showArcadeResults(e);
      return;
    }
    if (this.resultsVisible) return;
    const winnerKey = e?.data?.winner || "p1";
    const winnerId = winnerKey === "p1" ? this.snapshot.p1.name : this.snapshot.p2.name;
    const meta = RosterManager.getFighterMeta(winnerId);
    SaveManager.update((save) => ({
      ...save,
      progression: {
        ...save.progression,
        totalWins: save.progression.totalWins + (winnerKey === "p1" ? 1 : 0),
        unlockProgress: {
          ...save.progression.unlockProgress,
          [AppState.selectedP1]: {
            wins: (save.progression.unlockProgress[AppState.selectedP1]?.wins || 0) + (winnerKey === "p1" ? 1 : 0),
            arcadeClears: save.progression.unlockProgress[AppState.selectedP1]?.arcadeClears || 0
          }
        }
      },
      stats: {
        ...save.stats,
        matchesPlayed: save.stats.matchesPlayed + 1,
        damageDealt: save.stats.damageDealt + (this.matchStats?.damageDealt || 0),
        damageTaken: save.stats.damageTaken + (this.matchStats?.damageTaken || 0),
        perfectBlocks: save.stats.perfectBlocks + (this.matchStats?.perfectBlocks || 0),
        kos: save.stats.kos + (this.matchStats?.kos || 0)
      }
    }));
    this.winnerText.textContent = `WINNER: ${meta.displayName}`;
    this.nextFightBtn.classList.add("hidden");
    this.endRunBtn.classList.add("hidden");
    this.rematchBtn.classList.remove("hidden");
    this.changeFightersBtn.classList.remove("hidden");
    this.mainMenuBtn.classList.remove("hidden");
    this.matchMeta.textContent = "";
    this.resultsOverlay.classList.remove("hidden");
    this.resultsVisible = true;
    this.hud.clearKO();
  }

  showArcadeResults(e) {
    if (this.resultsVisible) return;
    const run = AppState.arcadeRun;
    if (!run) return;
    const winnerKey = e?.data?.winner || "p1";
    const winnerId = winnerKey === "p1" ? this.snapshot.p1.name : this.snapshot.p2.name;
    const meta = RosterManager.getFighterMeta(winnerId);
    const matchTimeMs = Math.max(0, Date.now() - (run.matchStartMs || Date.now()));

    this.winnerText.textContent = winnerKey === "p1" ? `WINNER: ${meta.displayName}` : "RUN FAILED";
    this.matchMeta.textContent = `MATCH ${run.currentMatchIndex + 1} / ${run.ladder.length} · Time ${Math.round(matchTimeMs / 1000)}s · Dealt ${this.matchStats.damageDealt} · Taken ${this.matchStats.damageTaken}`;

    run.totalDamageDealt += this.matchStats.damageDealt;
    run.totalDamageTaken += this.matchStats.damageTaken;
    run.perfectBlocks += this.matchStats.perfectBlocks;
    run.kos += this.matchStats.kos;

    if (winnerKey === "p1") {
      run.wins += 1;
      SaveManager.update((save) => ({
        ...save,
        progression: {
          ...save.progression,
          totalWins: save.progression.totalWins + 1,
          unlockProgress: {
            ...save.progression.unlockProgress,
            [run.selectedP1FighterId]: {
              wins: (save.progression.unlockProgress[run.selectedP1FighterId]?.wins || 0) + 1,
              arcadeClears: save.progression.unlockProgress[run.selectedP1FighterId]?.arcadeClears || 0
            }
          }
        },
        stats: {
          ...save.stats,
          matchesPlayed: save.stats.matchesPlayed + 1,
          damageDealt: save.stats.damageDealt + this.matchStats.damageDealt,
          damageTaken: save.stats.damageTaken + this.matchStats.damageTaken,
          perfectBlocks: save.stats.perfectBlocks + this.matchStats.perfectBlocks,
          kos: save.stats.kos + this.matchStats.kos
        }
      }));
      this.playArcadeStory(StoryKeys.TYPES.POSTFIGHT_WIN, () => {
        if (run.currentMatchIndex >= run.ladder.length - 1) {
          this.playArcadeStory(StoryKeys.TYPES.ENDING, () => this.showArcadeSummary(true));
          return;
        }
        this.nextFightBtn.classList.remove("hidden");
        this.endRunBtn.classList.remove("hidden");
        this.rematchBtn.classList.add("hidden");
        this.changeFightersBtn.classList.add("hidden");
        this.mainMenuBtn.classList.add("hidden");
        this.resultsOverlay.classList.remove("hidden");
        this.resultsVisible = true;
      });
    } else {
      run.losses += 1;
      SaveManager.update((save) => ({
        ...save,
        stats: {
          ...save.stats,
          matchesPlayed: save.stats.matchesPlayed + 1,
          damageDealt: save.stats.damageDealt + this.matchStats.damageDealt,
          damageTaken: save.stats.damageTaken + this.matchStats.damageTaken,
          perfectBlocks: save.stats.perfectBlocks + this.matchStats.perfectBlocks,
          kos: save.stats.kos + this.matchStats.kos
        }
      }));
      this.playArcadeStory(StoryKeys.TYPES.POSTFIGHT_LOSE, () => this.showArcadeSummary(false));
    }
    this.hud.clearKO();
  }

  showArcadeSummary(cleared) {
    const run = AppState.arcadeRun;
    if (!run) return;
    const totalTimeMs = Math.max(0, Date.now() - run.runStartMs);
    const grade = this.computeArcadeGrade(run, cleared, totalTimeMs);

    if (cleared) {
      SaveManager.update((save) => ({
        ...save,
        progression: {
          ...save.progression,
          arcadeClears: save.progression.arcadeClears + 1,
          unlockProgress: {
            ...save.progression.unlockProgress,
            [run.selectedP1FighterId]: {
              wins: save.progression.unlockProgress[run.selectedP1FighterId]?.wins || 0,
              arcadeClears: (save.progression.unlockProgress[run.selectedP1FighterId]?.arcadeClears || 0) + 1
            }
          }
        }
      }));
      const nextUnlocked = SaveManager.unlockNext();
      if (nextUnlocked) {
        const meta = RosterManager.getFighterMeta(nextUnlocked);
        this.unlockBanner.textContent = `NEW FIGHTER UNLOCKED: ${meta.displayName}`;
        this.unlockBanner.classList.remove("hidden");
      } else {
        this.unlockBanner.classList.add("hidden");
      }
      SaveManager.update((save) => ({
        ...save,
        progression: {
          ...save.progression,
          bestArcadeGrade: save.progression.bestArcadeGrade
            ? this.pickBestGrade(save.progression.bestArcadeGrade, grade)
            : grade,
          bestArcadeTimeMs: save.progression.bestArcadeTimeMs
            ? Math.min(save.progression.bestArcadeTimeMs, totalTimeMs)
            : totalTimeMs
        }
      }));
    } else {
      this.unlockBanner.classList.add("hidden");
    }

    this.arcadeSummaryResult.textContent = cleared ? "ARCADE CLEAR" : "ARCADE FAILED";
    this.arcadeSummaryStats.innerHTML = `
      <div>Grade: ${grade}</div>
      <div>Time: ${Math.round(totalTimeMs / 1000)}s</div>
      <div>Wins: ${run.wins} / ${run.ladder.length}</div>
      <div>Damage Taken: ${run.totalDamageTaken}</div>
      <div>Perfect Blocks: ${run.perfectBlocks}</div>
    `;
    this.arcadeSummaryOverlay.classList.remove("hidden");
    this.resultsOverlay.classList.add("hidden");
    this.resultsVisible = false;
    this.nextFightBtn.classList.add("hidden");
    this.endRunBtn.classList.add("hidden");
  }

  computeArcadeGrade(run, cleared, totalTimeMs) {
    let score = 1000;
    score -= run.totalDamageTaken * 1.2;
    score += run.perfectBlocks * 8;
    if (totalTimeMs < run.ladder.length * 35000) score += 60;
    if (cleared) score += 80;
    if (score >= 900) return "S";
    if (score >= 800) return "A";
    if (score >= 700) return "B";
    if (score >= 600) return "C";
    return "D";
  }

  pickBestGrade(a, b) {
    const order = ["D", "C", "B", "A", "S"];
    return order.indexOf(b) > order.indexOf(a) ? b : a;
  }
}

class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
    this.lastTs = 0;
    this.trainPaused = false;
    this.stepFrames = 0;
  }

  create() {
    const canvas = this.sys.game.canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    this.game.renderer.clearBeforeRender = false;

    this.engine = new GameEngine();
    this.inputRouter = new InputRouter();
    this.stage = new StageRenderer(ctx, WIDTH, HEIGHT, AppState.selectedStageId);
    this.fighters = new FighterRenderer(ctx);
    this.hud = new HudRenderer(document.getElementById("hud"));
    this.effects = new EffectsSystem(ctx, WIDTH, HEIGHT);
    this.recorder = new InputRecorder();
    this.dummy = new TrainingDummy();

    this.hudRoot = document.getElementById("hud");
    this.menuOverlay = document.getElementById("menuOverlay");
    this.selectOverlay = document.getElementById("selectOverlay");
    this.resultsOverlay = document.getElementById("resultsOverlay");
    this.trainingOverlay = document.getElementById("trainingOverlay");
    this.inputDisplay = document.getElementById("inputDisplay");
    this.infoPanel = document.getElementById("infoPanel");
    this.trainingBackBtn = document.getElementById("trainingBackBtn");
    this.resetPosBtn = document.getElementById("resetPosBtn");
    this.refillHealthBtn = document.getElementById("refillHealthBtn");
    this.toggleHitboxBtn = document.getElementById("toggleHitboxBtn");
    this.toggleInputBtn = document.getElementById("toggleInputBtn");
    this.toggleInfoBtn = document.getElementById("toggleInfoBtn");
    this.pauseTrainBtn = document.getElementById("pauseTrainBtn");
    this.stepTrainBtn = document.getElementById("stepTrainBtn");
    this.recordDummyBtn = document.getElementById("recordDummyBtn");
    this.playDummyBtn = document.getElementById("playDummyBtn");
    this.dummyBehavior = document.getElementById("dummyBehavior");
    this.autoRefill = document.getElementById("autoRefill");
    this.tuneTarget = document.getElementById("tuneTarget");
    this.tuneFighterId = document.getElementById("tuneFighterId");
    this.tuneScale = document.getElementById("tuneScale");
    this.tuneOffsetX = document.getElementById("tuneOffsetX");
    this.tuneOffsetY = document.getElementById("tuneOffsetY");
    this.tuneResetBtn = document.getElementById("tuneResetBtn");

    this.menuOverlay.classList.add("hidden");
    this.selectOverlay.classList.add("hidden");
    this.resultsOverlay.classList.add("hidden");
    this.hudRoot.classList.remove("hidden");
    this.trainingOverlay.classList.remove("hidden");

    this.engine.aiDifficulty = "easy";
    this.engine.roundTime = 999;
    this.engine.roundTimer = 999;
    this.engine.debugEnabled = AppState.training.showHitboxes;
    this.engine.startMatch(toEngineId(AppState.selectedP1), toEngineId(AppState.selectedP2));
    this.snapshot = this.engine.getSnapshot();
    this.refreshTuningUi();

    this.dummy.setBehavior(AppState.training.dummyBehavior);
    this.dummyBehavior.value = AppState.training.dummyBehavior;
    this.autoRefill.checked = AppState.training.autoRefill;

    this.bindTrainingUi();
    this.events.once("shutdown", () => this.unbindTrainingUi());
  }

  bindTrainingUi() {
    this.onBack = () => {
      audioFx.play("uiClick");
      this.trainingOverlay.classList.add("hidden");
      this.scene.start("MenuScene");
    };
    this.onReset = () => {
      this.engine.player.resetRound(WIDTH * 0.3, "mid");
      this.engine.cpu.resetRound(WIDTH * 0.7, "mid");
      this.engine.roundTimer = 999;
    };
    this.onRefill = () => {
      this.engine.player.hp = this.engine.player.hpMax;
      this.engine.cpu.hp = this.engine.cpu.hpMax;
    };
    this.onToggleHitbox = () => {
      this.engine.toggleDebug();
      this.toggleHitboxBtn.classList.toggle("selected", this.engine.debugEnabled);
      AppState.training.showHitboxes = this.engine.debugEnabled;
    };
    this.onToggleInput = () => {
      AppState.training.showInputs = !AppState.training.showInputs;
      this.inputDisplay.classList.toggle("hidden", !AppState.training.showInputs);
      this.toggleInputBtn.classList.toggle("selected", AppState.training.showInputs);
    };
    this.onToggleInfo = () => {
      AppState.training.showInfo = !AppState.training.showInfo;
      this.infoPanel.classList.toggle("hidden", !AppState.training.showInfo);
      this.toggleInfoBtn.classList.toggle("selected", AppState.training.showInfo);
    };
    this.onDummyChange = () => {
      AppState.training.dummyBehavior = this.dummyBehavior.value;
      this.dummy.setBehavior(this.dummyBehavior.value);
    };
    this.onAutoRefill = () => {
      AppState.training.autoRefill = this.autoRefill.checked;
    };
    this.onPauseTrain = () => {
      this.trainPaused = !this.trainPaused;
      this.pauseTrainBtn.classList.toggle("selected", this.trainPaused);
      this.pauseTrainBtn.textContent = this.trainPaused ? "Resume" : "Pause";
    };
    this.onStepTrain = () => {
      this.trainPaused = true;
      this.pauseTrainBtn.classList.add("selected");
      this.pauseTrainBtn.textContent = "Resume";
      this.stepFrames += 1;
    };
    this.onRecordDummy = () => {
      if (!this.dummy.recording) {
        this.dummy.startRecording();
        this.recordDummyBtn.classList.add("selected");
        this.recordDummyBtn.textContent = "Stop Record";
        this.playDummyBtn.classList.remove("selected");
      } else {
        this.dummy.stopRecording();
        this.recordDummyBtn.classList.remove("selected");
        this.recordDummyBtn.textContent = "Record Dummy";
      }
    };
    this.onPlayDummy = () => {
      const playing = this.dummy.togglePlayback();
      this.playDummyBtn.classList.toggle("selected", playing);
      this.playDummyBtn.textContent = playing ? "Stop Playback" : "Play Dummy";
      if (playing) {
        this.recordDummyBtn.classList.remove("selected");
        this.recordDummyBtn.textContent = "Record Dummy";
      }
    };
    this.onTuneChange = () => {
      const fighterId = this.tuneTarget.value === "p2" ? this.snapshot?.p2?.name : this.snapshot?.p1?.name;
      if (!fighterId) return;
      FighterAssetManager.setTuning(fighterId, {
        scale: Number(this.tuneScale.value),
        offsetX: Number(this.tuneOffsetX.value),
        offsetY: Number(this.tuneOffsetY.value)
      });
      this.fighters.assets.invalidate(fighterId);
      this.refreshTuningUi();
    };
    this.onTuneTarget = () => this.refreshTuningUi();
    this.onTuneReset = () => {
      const fighterId = this.tuneTarget.value === "p2" ? this.snapshot?.p2?.name : this.snapshot?.p1?.name;
      if (!fighterId) return;
      FighterAssetManager.clearTuning(fighterId);
      this.fighters.assets.invalidate(fighterId);
      this.refreshTuningUi();
    };

    this.trainingBackBtn.addEventListener("click", this.onBack);
    this.resetPosBtn.addEventListener("click", this.onReset);
    this.refillHealthBtn.addEventListener("click", this.onRefill);
    this.toggleHitboxBtn.addEventListener("click", this.onToggleHitbox);
    this.toggleInputBtn.addEventListener("click", this.onToggleInput);
    this.toggleInfoBtn.addEventListener("click", this.onToggleInfo);
    this.dummyBehavior.addEventListener("change", this.onDummyChange);
    this.autoRefill.addEventListener("change", this.onAutoRefill);
    this.pauseTrainBtn.addEventListener("click", this.onPauseTrain);
    this.stepTrainBtn.addEventListener("click", this.onStepTrain);
    this.recordDummyBtn.addEventListener("click", this.onRecordDummy);
    this.playDummyBtn.addEventListener("click", this.onPlayDummy);
    this.tuneTarget.addEventListener("change", this.onTuneTarget);
    this.tuneScale.addEventListener("input", this.onTuneChange);
    this.tuneOffsetX.addEventListener("input", this.onTuneChange);
    this.tuneOffsetY.addEventListener("input", this.onTuneChange);
    this.tuneResetBtn.addEventListener("click", this.onTuneReset);

    this.inputDisplay.classList.toggle("hidden", !AppState.training.showInputs);
    this.infoPanel.classList.toggle("hidden", !AppState.training.showInfo);
    this.toggleInputBtn.classList.toggle("selected", AppState.training.showInputs);
    this.toggleInfoBtn.classList.toggle("selected", AppState.training.showInfo);
    this.toggleHitboxBtn.classList.toggle("selected", this.engine.debugEnabled);
  }

  unbindTrainingUi() {
    this.trainingBackBtn.removeEventListener("click", this.onBack);
    this.resetPosBtn.removeEventListener("click", this.onReset);
    this.refillHealthBtn.removeEventListener("click", this.onRefill);
    this.toggleHitboxBtn.removeEventListener("click", this.onToggleHitbox);
    this.toggleInputBtn.removeEventListener("click", this.onToggleInput);
    this.toggleInfoBtn.removeEventListener("click", this.onToggleInfo);
    this.dummyBehavior.removeEventListener("change", this.onDummyChange);
    this.autoRefill.removeEventListener("change", this.onAutoRefill);
    this.pauseTrainBtn.removeEventListener("click", this.onPauseTrain);
    this.stepTrainBtn.removeEventListener("click", this.onStepTrain);
    this.recordDummyBtn.removeEventListener("click", this.onRecordDummy);
    this.playDummyBtn.removeEventListener("click", this.onPlayDummy);
    this.tuneTarget.removeEventListener("change", this.onTuneTarget);
    this.tuneScale.removeEventListener("input", this.onTuneChange);
    this.tuneOffsetX.removeEventListener("input", this.onTuneChange);
    this.tuneOffsetY.removeEventListener("input", this.onTuneChange);
    this.tuneResetBtn.removeEventListener("click", this.onTuneReset);
  }

  refreshTuningUi() {
    const fighterId = this.tuneTarget?.value === "p2" ? this.snapshot?.p2?.name : this.snapshot?.p1?.name;
    if (!fighterId || !this.tuneScale) return;
    const tune = FighterAssetManager.getTuning(fighterId);
    this.tuneFighterId.textContent = String(fighterId).toUpperCase();
    this.tuneScale.value = String(tune.scale ?? 1);
    this.tuneOffsetX.value = String(tune.offsetX ?? 0);
    this.tuneOffsetY.value = String(tune.offsetY ?? 0);
  }

  update(ts) {
    if (!this.lastTs) this.lastTs = ts;
    const realDt = Math.min((ts - this.lastTs) / 1000, 1 / 20);
    this.lastTs = ts;

    this.inputRouter.update(realDt);
    const p1Intent = this.inputRouter.getIntent();
    this.recorder.record(p1Intent, ts);
    this.dummy.recordIntent(p1Intent);

    this.dummy.update(realDt, this.snapshot, this.snapshot.events || []);
    const p2Intent = this.dummy.getIntent(this.snapshot);

    if (AppState.training.autoRefill) {
      this.engine.player.hp = this.engine.player.hpMax;
      this.engine.cpu.hp = this.engine.cpu.hpMax;
    }

    const doStep = !this.trainPaused || this.stepFrames > 0;
    if (this.stepFrames > 0 && doStep) this.stepFrames -= 1;
    const dt = doStep ? realDt : 0;
    const snapshot = dt > 0 ? this.engine.update(dt, p1Intent, p2Intent) : this.engine.getSnapshot();
    this.snapshot = snapshot;

    snapshot.events.forEach((e) => {
      this.effects.onEvent(e);
      this.hud.onEvent(e);
      this.fighters.onEvent(e);
      audioFx.onEvent(e);
      if (e.type === "HIT" || e.type === "BLOCK") {
        this.lastEvent = e;
      }
    });

    const intense = snapshot.p1.health / snapshot.p1.maxHealth < 0.25 || snapshot.p2.health / snapshot.p2.maxHealth < 0.25;
    audioFx.tick(realDt, intense);
    this.effects.tick(dt > 0 ? realDt : 0);
    this.hud.tick(realDt);
    this.effects.setCombatFrame(snapshot);

    this.effects.beginCamera();
    this.stage.render(snapshot, ts);
    this.fighters.render(snapshot);
    this.effects.render();
    this.fighters.renderDebug(snapshot);
    this.effects.endCamera();
    this.hud.render(snapshot);

    this.renderInputDisplay();
    this.renderInfoPanel();
    this.refreshTuningUi();
  }

  renderInputDisplay() {
    if (!AppState.training.showInputs) return;
    const entries = this.recorder.getEntries();
    const rows = entries.map((e) => {
      const dir = e.dir === -1 ? "←" : e.dir === 1 ? "→" : "·";
      const vert = e.vert === -1 ? "↑" : e.vert === 1 ? "↓" : "·";
      const lane = e.lane === -1 ? "⇣" : e.lane === 1 ? "⇡" : "";
      const btns = [e.hit ? "HIT" : "", e.kick ? "KICK" : "", e.power ? "POWER" : "", e.guard ? "GUARD" : ""].filter(Boolean).join("+");
      return `<div class=\"inputRow\">${vert}${dir}${lane} <span>${btns || "-"}</span></div>`;
    });
    this.inputDisplay.innerHTML = rows.join("");
  }

  renderInfoPanel() {
    if (!AppState.training.showInfo) return;
    const e = this.lastEvent;
    if (!e) return;
    const move = e.data?.move || e.data?.attackType || "-";
    const type = e.type || "-";
    const damage = e.data?.damage ?? "-";
    const combo = this.snapshot.p1.comboCount || 0;
    const adv = e.data?.advantageMs != null ? `${e.data.advantageMs > 0 ? "+" : ""}${Math.round(e.data.advantageMs)}ms` : "-";
    this.infoPanel.innerHTML = `
      <div>Last Move: ${move}</div>
      <div>Last Event: ${type}</div>
      <div>Damage: ${damage}</div>
      <div>Combo: ${combo}</div>
      <div>Adv: ${adv}</div>
    `;
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "gameMount",
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,
  backgroundColor: "#050b1f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: true,
    antialias: false,
    clearBeforeRender: false
  },
  scene: [MenuScene, SelectScene, FightScene, TrainingScene]
});
