import { RosterManager } from "../engine/roster/RosterManager.js";
import { PortraitManager } from "./PortraitManager.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class HudRenderer {
  constructor(root) {
    this.root = root;
    this.p1Name = root.querySelector("#p1Name");
    this.p2Name = root.querySelector("#p2Name");
    this.p1Health = root.querySelector("#p1Health");
    this.p2Health = root.querySelector("#p2Health");
    this.p1Chip = root.querySelector("#p1Chip");
    this.p2Chip = root.querySelector("#p2Chip");
    this.p1Rounds = root.querySelector("#p1Rounds");
    this.p2Rounds = root.querySelector("#p2Rounds");
    this.timer = root.querySelector("#timer");
    this.timerPlate = root.querySelector(".timerPlate");
    this.combo = root.querySelector("#comboText");
    this.battleCue = root.querySelector("#battleCue");
    this.koText = root.querySelector("#koText");
    this.p1Portrait = root.querySelector("#p1Portrait");
    this.p2Portrait = root.querySelector("#p2Portrait");

    this.prevP1 = 1;
    this.prevP2 = 1;
    this.lastH1 = 1;
    this.lastH2 = 1;
    this.flashP1 = 0;
    this.flashP2 = 0;
    this.bigHitP1 = 0;
    this.bigHitP2 = 0;
    this.timerAnim = 0;
    this.lastSecond = null;
    this.comboTimer = 0;
    this.combo.textContent = "";
    this.combo.classList.add("inactive");
    this.comboPop = 0;
    this.cueTimer = 0;
    this.koState = "idle";
    this.koTimer = 0;
  }

  pip(n) {
    let html = "";
    for (let i = 0; i < 2; i += 1) {
      html += `<span class="roundPip ${i < n ? "win" : ""}"></span>`;
    }
    return html;
  }

  onEvent(e) {
    const showCue = (text, cls) => {
      if (!this.battleCue) return;
      this.battleCue.textContent = text;
      this.battleCue.classList.remove("counter", "punish", "break");
      if (cls) this.battleCue.classList.add(cls);
      this.battleCue.classList.add("show");
      this.cueTimer = 0.55;
    };

    if (e.type === "COMBO") {
      this.combo.textContent = `COMBO ${e.data.count} +${e.data.bonus}`;
      this.comboTimer = 0.9;
      this.combo.classList.remove("inactive");
      this.combo.classList.add("active");
      this.comboPop = 0.18;
    }
    if (e.type === "THROW_BREAK") showCue("THROW BREAK", "break");
    if (e.type === "HIT" || e.type === "LAUNCH" || e.type === "KNOCKDOWN") {
      if (e.data?.punish) showCue("PUNISH", "punish");
      else if (e.data?.counter) showCue("COUNTER", "counter");
    }
  }

  tick(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo.textContent = "";
        this.combo.classList.add("inactive");
        this.combo.classList.remove("active");
      }
    }
    if (this.comboPop > 0) {
      this.comboPop -= dt;
      if (this.comboPop <= 0) this.combo.classList.remove("active");
    }
    if (this.cueTimer > 0) {
      this.cueTimer -= dt;
      if (this.cueTimer <= 0 && this.battleCue) {
        this.battleCue.classList.remove("show", "counter", "punish", "break");
        this.battleCue.textContent = "";
      }
    }
    if (this.flashP1 > 0) this.flashP1 -= dt;
    if (this.flashP2 > 0) this.flashP2 -= dt;
    if (this.bigHitP1 > 0) this.bigHitP1 -= dt;
    if (this.bigHitP2 > 0) this.bigHitP2 -= dt;
    if (this.koState !== "idle") this.tickKO(dt);
    if (this.timerAnim > 0) {
      this.timerAnim -= dt;
      if (this.timerAnim <= 0) this.timerPlate.classList.remove("tick");
    }
  }

  render(snapshot) {
    const p1Meta = RosterManager.getFighterMeta(snapshot.p1.name);
    const p2Meta = RosterManager.getFighterMeta(snapshot.p2.name);
    this.p1Name.textContent = p1Meta.displayName;
    this.p2Name.textContent = p2Meta.displayName;
    this.p1Name.style.color = p1Meta.accent.primary;
    this.p2Name.style.color = p2Meta.accent.primary;
    this.root.style.setProperty("--p1-primary", p1Meta.accent.primary);
    this.root.style.setProperty("--p1-secondary", p1Meta.accent.secondary);
    this.root.style.setProperty("--p2-primary", p2Meta.accent.primary);
    this.root.style.setProperty("--p2-secondary", p2Meta.accent.secondary);
    if (this.p1Portrait) {
      PortraitManager.loadPortrait(snapshot.p1.name, (url) => {
        this.p1Portrait.style.backgroundImage = `url(${url})`;
        this.p1Portrait.style.backgroundSize = "cover";
        this.p1Portrait.style.backgroundPosition = "center";
      });
    }
    if (this.p2Portrait) {
      PortraitManager.loadPortrait(snapshot.p2.name, (url) => {
        this.p2Portrait.style.backgroundImage = `url(${url})`;
        this.p2Portrait.style.backgroundSize = "cover";
        this.p2Portrait.style.backgroundPosition = "center";
      });
    }

    const h1 = clamp(snapshot.p1.health / snapshot.p1.maxHealth, 0, 1);
    const h2 = clamp(snapshot.p2.health / snapshot.p2.maxHealth, 0, 1);

    if (h1 < this.lastH1) {
      this.flashP1 = 0.18;
      if (this.lastH1 - h1 > 0.12) this.bigHitP1 = 0.2;
    }
    if (h2 < this.lastH2) {
      this.flashP2 = 0.18;
      if (this.lastH2 - h2 > 0.12) this.bigHitP2 = 0.2;
    }
    this.lastH1 = h1;
    this.lastH2 = h2;

    this.prevP1 += (h1 - this.prevP1) * 0.16;
    this.prevP2 += (h2 - this.prevP2) * 0.16;

    this.p1Health.style.width = `${h1 * 100}%`;
    this.p2Health.style.width = `${h2 * 100}%`;
    this.p1Chip.style.width = `${this.prevP1 * 100}%`;
    this.p2Chip.style.width = `${this.prevP2 * 100}%`;

    this.p1Health.classList.toggle("flash", this.flashP1 > 0);
    this.p2Health.classList.toggle("flash", this.flashP2 > 0);
    this.p1Health.classList.toggle("low", h1 <= 0.25);
    this.p2Health.classList.toggle("low", h2 <= 0.25);
    this.p1Health.classList.toggle("critical", h1 <= 0.15);
    this.p2Health.classList.toggle("critical", h2 <= 0.15);
    this.root.classList.toggle("p1Hit", this.bigHitP1 > 0);
    this.root.classList.toggle("p2Hit", this.bigHitP2 > 0);

    this.p1Rounds.innerHTML = this.pip(snapshot.p1.rounds);
    this.p2Rounds.innerHTML = this.pip(snapshot.p2.rounds);
    const seconds = Math.max(0, Math.ceil(snapshot.roundTimer));
    this.timer.textContent = String(seconds);
    if (this.lastSecond !== null && seconds !== this.lastSecond) {
      this.timerPlate.classList.remove("tick");
      this.timerPlate.classList.add("tick");
      this.timerAnim = 0.2;
    }
    this.lastSecond = seconds;
    this.timerPlate.classList.toggle("danger", seconds <= 10);
  }

  startKO(text = "K.O.") {
    if (!this.koText) return;
    this.koText.textContent = text;
    this.koText.classList.remove("fade", "winner");
    this.koText.classList.add("show", "pop");
    this.koState = "in";
    this.koTimer = 0.22;
  }

  showWinner(text = "") {
    if (!this.koText) return;
    this.koText.textContent = text;
    this.koText.classList.remove("fade", "pop");
    this.koText.classList.add("show", "winner");
    this.koState = "winner";
    this.koTimer = 1.0;
  }

  clearKO() {
    if (!this.koText) return;
    this.koText.textContent = "";
    this.koText.classList.remove("show", "pop", "fade", "winner");
    this.koState = "idle";
    this.koTimer = 0;
  }

  tickKO(dt) {
    this.koTimer -= dt;
    if (this.koState === "in" && this.koTimer <= 0) {
      this.koText.classList.remove("pop");
      this.koState = "hold";
      this.koTimer = 0.6;
    } else if (this.koState === "hold" && this.koTimer <= 0) {
      this.koText.classList.add("fade");
      this.koState = "out";
      this.koTimer = 0.25;
    } else if (this.koState === "out" && this.koTimer <= 0) {
      this.clearKO();
    } else if (this.koState === "winner" && this.koTimer <= 0) {
      this.clearKO();
    }
  }
}
