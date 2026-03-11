import { RosterManager } from "../engine/roster/RosterManager.js";

const cache = new Map();

const makePlaceholder = (meta) => {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = meta.accent.primary;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 56, canvas.width, 40);

  ctx.fillStyle = meta.accent.secondary;
  ctx.font = "bold 18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.displayName.slice(0, 4), canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL();
};

export class PortraitManager {
  static getPlaceholderUrl(id) {
    const key = String(id || "").toLowerCase();
    const meta = RosterManager.getFighterMeta(key);
    const placeholder = makePlaceholder(meta);
    return placeholder;
  }

  static loadPortrait(id, onReady) {
    const key = String(id || "").toLowerCase();
    const meta = RosterManager.getFighterMeta(key);
    if (cache.has(key)) {
      const cached = cache.get(key);
      if (cached.status === "ready") onReady(cached.url);
      else onReady(cached.placeholder);
      return cached.placeholder;
    }

    const placeholder = makePlaceholder(meta);
    const entry = { status: "loading", url: null, placeholder };
    cache.set(key, entry);

    const portraitUrl = meta.portrait || `assets/fighters/${key}/portrait.png`;
    const atlasUrl = meta.assets?.image || `assets/fighters/${key}/atlas.png`;

    const img = new Image();
    img.onload = () => {
      entry.status = "ready";
      entry.url = portraitUrl;
      onReady(portraitUrl);
    };
    img.onerror = () => {
      const atlasImg = new Image();
      atlasImg.onload = () => {
        const c = document.createElement("canvas");
        c.width = 96;
        c.height = 96;
        const x = c.getContext("2d");
        x.imageSmoothingEnabled = false;
        x.fillStyle = "#0b1026";
        x.fillRect(0, 0, c.width, c.height);
        const sw = atlasImg.width;
        const sh = atlasImg.height;
        const scale = Math.min(c.width / sw, c.height / sh);
        const dw = Math.round(sw * scale);
        const dh = Math.round(sh * scale);
        const dx = Math.round((c.width - dw) / 2);
        const dy = Math.round((c.height - dh) / 2);
        x.drawImage(atlasImg, dx, dy, dw, dh);
        entry.status = "ready";
        entry.url = c.toDataURL();
        onReady(entry.url);
      };
      atlasImg.onerror = () => {
        entry.status = "ready";
        entry.url = placeholder;
        onReady(placeholder);
      };
      atlasImg.src = atlasUrl;
    };
    img.src = portraitUrl;
    return placeholder;
  }
}
