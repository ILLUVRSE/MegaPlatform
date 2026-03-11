import Phaser from "phaser";
import { WIDTH, HEIGHT } from "../engine/data.js";
import { RosterManager } from "../engine/roster/RosterManager.js";
import { AppState } from "../state/AppState.js";

const TRANSITION_MS = 240;
const KB_ZOOM_TO = 1.02;
const KB_PAN = 14;
const TYPEWRITER_CHARS_PER_SEC = 55;
const SPEAKER_LINE = /^\s*([A-Za-z0-9_ -]{2,18})\s*:\s*(.+)$/;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class StoryScene extends Phaser.Scene {
  constructor() {
    super("StoryScene");
    this.sequence = null;
    this.onComplete = null;
    this.index = 0;
    this.advancing = false;
    this.isEnding = false;
    this.pendingLoads = new Set();
    this.textRows = [];
    this.parsedLines = [];
    this.visibleChars = 0;
    this.totalChars = 0;
    this.textFullyShown = true;
    this.autoAdvanceMs = null;
  }

  init(data) {
    this.sequence = data?.sequence || { type: "prefight", panels: [] };
    this.onComplete = typeof data?.onComplete === "function" ? data.onComplete : null;
    this.index = 0;
    this.advancing = false;
    this.isEnding = false;
    this.pendingLoads = new Set();
    this.textRows = [];
    this.parsedLines = [];
    this.visibleChars = 0;
    this.totalChars = 0;
    this.textFullyShown = true;
    this.autoAdvanceMs = null;
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor("#030613");

    this.storyTextMode = AppState.storyTextMode === "typewriter" ? "typewriter" : "instant";
    this.storyAutoAdvance = AppState.storyAutoAdvance === true;

    this.p1Id = this.registry.get("storyP1") || "vex";
    this.p2Id = this.registry.get("storyP2") || "byte";
    this.stageId = this.registry.get("storyStage") || "neonDojo";
    this.p1Meta = RosterManager.getFighterMeta(this.p1Id);
    this.p2Meta = RosterManager.getFighterMeta(this.p2Id);

    this.stageRoot = this.add.container(WIDTH * 0.5, HEIGHT * 0.5);
    this.uiRoot = this.add.container(0, 0);
    this.dialogueRoot = this.add.container(0, 0);

    this.makeUiOverlay();
    this.bindInput();
    this.showPanel(0);
  }

  bindInput() {
    this.onPointerUp = () => this.onAdvanceInput();
    this.input.on("pointerup", this.onPointerUp);

    this.keys = this.input.keyboard.addKeys({
      nextA: Phaser.Input.Keyboard.KeyCodes.SPACE,
      nextB: Phaser.Input.Keyboard.KeyCodes.ENTER,
      skip: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.events.on("shutdown", () => {
      this.input.off("pointerup", this.onPointerUp);
      if (this.keys) {
        this.keys.nextA?.destroy();
        this.keys.nextB?.destroy();
        this.keys.skip?.destroy();
      }
    });
  }

  makeUiOverlay() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const textBg = this.add.rectangle(w * 0.5, h - 98, w * 0.94, 132, 0x060914, 0.86).setStrokeStyle(2, 0xb2f0ff, 0.45);
    const hint = this.add.text(w * 0.5, h - 26, "Tap / Enter to continue", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#d9f9ff",
      align: "center"
    }).setOrigin(0.5).setAlpha(0.9);

    this.skipBtn = this.add.text(w - 20, 18, "SKIP", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#d3eeff",
      backgroundColor: "rgba(8,12,26,0.58)"
    })
      .setPadding(10, 6, 10, 6)
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", (_pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        this.finish(true);
      });

    this.uiRoot.add([textBg, hint, this.skipBtn]);

    const baseY = h - 146;
    for (let i = 0; i < 3; i += 1) {
      const chipBg = this.add.rectangle(62, baseY + i * 34, 90, 24, 0x2f4c69, 0.95).setOrigin(0, 0.5);
      const chipText = this.add.text(70, baseY + i * 34, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: "#f2f7ff",
        fontStyle: "bold"
      }).setOrigin(0, 0.5);
      const lineText = this.add.text(160, baseY + i * 34, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "23px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0, 0.5);

      this.dialogueRoot.add([chipBg, chipText, lineText]);
      this.textRows.push({ chipBg, chipText, lineText });
    }

    if (this.sequence.type === "prefight") {
      const plate = this.add.rectangle(w * 0.5, 68, Math.min(420, w * 0.82), 56, 0x091125, 0.76).setStrokeStyle(2, 0xb2f0ff, 0.45);
      const names = this.add.text(w * 0.5, 58, `${this.p1Meta.displayName}  VS  ${this.p2Meta.displayName}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center"
      }).setOrigin(0.5);
      const stage = this.add.text(w * 0.5, 78, this.stageId, {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#bbdcff",
        align: "center"
      }).setOrigin(0.5);
      this.vsCard = this.add.container(0, 0, [plate, names, stage]);
      this.uiRoot.add(this.vsCard);
    }
  }

  update(_time, delta) {
    if (this.keys && !this.isEnding) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.nextA) || Phaser.Input.Keyboard.JustDown(this.keys.nextB)) this.onAdvanceInput();
      if (Phaser.Input.Keyboard.JustDown(this.keys.skip)) this.finish(true);
    }

    this.tickTypewriter(delta);
    this.tickAutoAdvance(delta);
  }

  onAdvanceInput() {
    if (this.advancing || this.isEnding) return;
    if (this.storyTextMode === "typewriter" && !this.textFullyShown) {
      this.completeCurrentText();
      return;
    }
    this.clearAutoAdvance();
    this.goNextPanel();
  }

  goNextPanel() {
    if (this.index >= this.sequence.panels.length - 1) {
      this.finish(false);
      return;
    }

    this.playPageFlip();
    this.advancing = true;
    this.tweens.add({
      targets: [this.stageRoot, this.dialogueRoot],
      alpha: 0,
      duration: TRANSITION_MS,
      onComplete: () => {
        this.index += 1;
        this.showPanel(this.index, true);
        this.advancing = false;
      }
    });
  }

  finish(skipped) {
    if (this.isEnding) return;
    this.isEnding = true;
    this.tweens.killAll();
    this.clearAutoAdvance();
    this.tweens.add({
      targets: [this.stageRoot, this.uiRoot, this.dialogueRoot],
      alpha: 0,
      duration: TRANSITION_MS,
      onComplete: () => {
        if (this.onComplete) this.onComplete({ skipped: !!skipped, type: this.sequence.type });
        this.scene.stop();
      }
    });
  }

  showPanel(panelIndex, fadeIn = false) {
    const panel = this.sequence.panels[panelIndex] || { text: ["..."] };
    this.renderPanelVisual(panel);
    this.ensurePanelTexture(panel, (loaded) => {
      if (loaded && this.index === panelIndex && !this.isEnding) this.renderPanelVisual(panel);
    });

    this.setPanelDialogue(panel.text || []);

    this.stageRoot.setAlpha(fadeIn ? 0 : 1);
    this.dialogueRoot.setAlpha(fadeIn ? 0 : 1);

    if (fadeIn) {
      this.tweens.add({
        targets: [this.stageRoot, this.dialogueRoot],
        alpha: 1,
        duration: TRANSITION_MS
      });
    }

    this.preloadPanel(panelIndex + 1);
  }

  setPanelDialogue(lines) {
    this.parsedLines = lines.slice(0, 3).map((line) => this.parseLine(line));
    this.totalChars = this.parsedLines.reduce((sum, line) => sum + line.text.length, 0);

    this.clearAutoAdvance();
    if (this.storyTextMode === "typewriter") {
      this.visibleChars = 0;
      this.textFullyShown = this.totalChars === 0;
    } else {
      this.visibleChars = this.totalChars;
      this.textFullyShown = true;
    }

    this.renderDialogue();
    if (this.textFullyShown) this.scheduleAutoAdvance();
  }

  parseLine(rawLine) {
    const line = String(rawLine || "").trim();
    const match = line.match(SPEAKER_LINE);

    if (!match) {
      return {
        speaker: "NARRATION",
        text: line,
        chipColor: 0x3b4655,
        chipTextColor: "#d8e7ff",
        isNarration: true
      };
    }

    const speaker = String(match[1] || "").trim().toUpperCase();
    const text = String(match[2] || "").trim();
    const chipColor = this.getSpeakerColor(speaker);

    return {
      speaker,
      text,
      chipColor,
      chipTextColor: "#ffffff",
      isNarration: false
    };
  }

  getSpeakerColor(speaker) {
    const s = String(speaker || "").trim().toUpperCase();
    const p1Name = String(this.p1Meta.displayName || "").toUpperCase();
    const p2Name = String(this.p2Meta.displayName || "").toUpperCase();

    if (s === p1Name || s === String(this.p1Id).toUpperCase()) {
      return Phaser.Display.Color.HexStringToColor(this.p1Meta.accent.primary).color;
    }
    if (s === p2Name || s === String(this.p2Id).toUpperCase()) {
      return Phaser.Display.Color.HexStringToColor(this.p2Meta.accent.primary).color;
    }

    return 0x4d657f;
  }

  renderDialogue() {
    let charsLeft = Math.floor(this.visibleChars);

    this.textRows.forEach((row, i) => {
      const parsed = this.parsedLines[i];
      if (!parsed) {
        row.chipBg.setVisible(false);
        row.chipText.setVisible(false);
        row.lineText.setVisible(false);
        return;
      }

      const shownCount = clamp(charsLeft, 0, parsed.text.length);
      charsLeft -= parsed.text.length;
      const shownText = parsed.text.slice(0, shownCount);

      row.chipBg.setVisible(true);
      row.chipText.setVisible(true);
      row.lineText.setVisible(true);

      row.chipBg.setFillStyle(parsed.chipColor, parsed.isNarration ? 0.75 : 0.92);
      row.chipText.setText(parsed.speaker);
      row.chipText.setColor(parsed.chipTextColor);

      const chipWidth = Math.max(88, row.chipText.width + 14);
      row.chipBg.setSize(chipWidth, 24);
      row.lineText.x = row.chipBg.x + chipWidth + 12;
      row.lineText.setText(shownText);
      row.lineText.setColor(parsed.isNarration ? "#d3dcf1" : "#ffffff");
      row.lineText.setFontStyle(parsed.isNarration ? "italic" : "normal");
    });
  }

  completeCurrentText() {
    this.visibleChars = this.totalChars;
    this.textFullyShown = true;
    this.renderDialogue();
    this.scheduleAutoAdvance();
  }

  tickTypewriter(deltaMs) {
    if (this.storyTextMode !== "typewriter" || this.textFullyShown || this.advancing || this.isEnding) return;

    const prev = Math.floor(this.visibleChars);
    this.visibleChars = Math.min(this.totalChars, this.visibleChars + (deltaMs / 1000) * TYPEWRITER_CHARS_PER_SEC);
    const next = Math.floor(this.visibleChars);

    if (next !== prev) this.renderDialogue();

    if (this.visibleChars >= this.totalChars) {
      this.textFullyShown = true;
      this.scheduleAutoAdvance();
    }
  }

  scheduleAutoAdvance() {
    if (!this.storyAutoAdvance || !this.textFullyShown || this.isEnding || this.advancing) return;
    const delay = 2500 + clamp(this.totalChars * 20, 0, 1000);
    this.autoAdvanceMs = delay;
  }

  tickAutoAdvance(deltaMs) {
    if (this.autoAdvanceMs == null || this.advancing || this.isEnding) return;
    this.autoAdvanceMs -= deltaMs;
    if (this.autoAdvanceMs <= 0) {
      this.clearAutoAdvance();
      this.goNextPanel();
    }
  }

  clearAutoAdvance() {
    this.autoAdvanceMs = null;
  }

  playPageFlip() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("pixelbrawl-story-pageflip"));
  }

  renderPanelVisual(panel) {
    this.stageRoot.removeAll(true);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const panelImagePath = panel.image && panel.image.startsWith("src/assets/") ? panel.image.replace(/^src\//, "/src/") : null;

    const drawPlaceholder = () => {
      const bg = this.add.graphics();
      bg.fillGradientStyle(
        Phaser.Display.Color.HexStringToColor(this.p1Meta.accent.primary).color,
        Phaser.Display.Color.HexStringToColor(this.p2Meta.accent.primary).color,
        0x0b1230,
        0x060813,
        1,
        1,
        1,
        1
      );
      bg.fillRect(-w * 0.5, -h * 0.5, w, h);

      const title = this.add.text(0, -h * 0.22, `${this.p1Meta.displayName}  VS  ${this.p2Meta.displayName}`, {
        fontFamily: "Trebuchet MS",
        fontSize: "52px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 7,
        align: "center"
      }).setOrigin(0.5);

      const stageTag = this.add.text(0, h * 0.18, this.stageId, {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#d9f9ff"
      }).setOrigin(0.5);

      this.stageRoot.add([bg, title, stageTag]);
      this.applyKenBurns(this.stageRoot);
    };

    if (panelImagePath) {
      const key = `story_panel_${panel.image}`;
      if (this.textures.exists(key)) {
        const img = this.add.image(0, 0, key);
        const scale = Math.max(w / img.width, h / img.height);
        img.setScale(scale);
        this.stageRoot.add(img);
        this.applyKenBurns(img);
        return;
      }
    }

    drawPlaceholder();
  }

  preloadPanel(panelIndex) {
    const panel = this.sequence.panels[panelIndex];
    this.ensurePanelTexture(panel);
  }

  ensurePanelTexture(panel, onDone = () => {}) {
    if (!panel?.image) {
      onDone(false);
      return;
    }

    const key = `story_panel_${panel.image}`;
    if (this.textures.exists(key)) {
      onDone(true);
      return;
    }
    if (this.pendingLoads.has(key)) {
      onDone(false);
      return;
    }

    const path = panel.image.startsWith("src/assets/") ? panel.image.replace(/^src\//, "/src/") : null;
    if (!path) {
      onDone(false);
      return;
    }

    this.pendingLoads.add(key);
    this.load.image(key, path);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.pendingLoads.delete(key);
      onDone(this.textures.exists(key));
    });
    if (!this.load.isLoading()) this.load.start();
  }

  applyKenBurns(target) {
    target.setScale(1);
    target.setPosition(target.x || 0, target.y || 0);

    this.tweens.add({
      targets: target,
      scale: KB_ZOOM_TO,
      x: (target.x || 0) + clamp(Phaser.Math.Between(-KB_PAN, KB_PAN), -KB_PAN, KB_PAN),
      y: (target.y || 0) + clamp(Phaser.Math.Between(-KB_PAN, KB_PAN), -KB_PAN, KB_PAN),
      duration: Phaser.Math.Between(2400, 4000),
      ease: "Sine.Out"
    });
  }
}
