import Phaser from 'phaser';
import { getOnlineSession } from '../net/onlineService';

const OPTIONS = ['Quick Match (Unranked)', 'Private Match: Create Lobby', 'Private Match: Join Lobby', 'Back'];

export class OnlineMenuScene extends Phaser.Scene {
  private selected = 0;
  private lines: Phaser.GameObjects.Text[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private soakPanel: HTMLDivElement | null = null;

  constructor() {
    super('online-menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0c211a');
    this.add
      .text(this.scale.width / 2, 82, 'ONLINE', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '48px',
        color: '#dffff0'
      })
      .setOrigin(0.5);

    this.lines = OPTIONS.map((opt, i) =>
      this.add
        .text(this.scale.width / 2, 190 + i * 60, opt, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '32px',
          color: '#97d8bb'
        })
        .setOrigin(0.5)
    );
    this.updateSelection();

    this.statusText = this.add
      .text(this.scale.width / 2, this.scale.height - 120, 'Connect to online services...', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '20px',
        color: '#9fcbb8',
        align: 'center'
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height - 60, 'Arrows/W-S to select, Enter/Space to confirm', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '18px',
        color: '#8cb8a7'
      })
      .setOrigin(0.5);

    const session = getOnlineSession();
    this.mountSoakControls();
    session.net.onConnectionStatus((connected) => {
      if (connected) {
        this.statusText.setText('Connected. Pick a mode.');
      } else {
        this.statusText.setText('Disconnected. Reconnecting...');
      }
    });

    session.net.onMessage((msg) => {
      if (msg.type === 'LOBBY_CREATED') {
        this.statusText.setText(`Lobby code: ${msg.code} (waiting for opponent)`);
      }
      if (msg.type === 'LOBBY_JOINED') {
        this.statusText.setText(`Lobby ${msg.code}: ${msg.players.length}/2 joined`);
      }
      if (msg.type === 'MATCH_FOUND') {
        this.statusText.setText('Match found. Loading arena...');
        this.unmountSoakControls();
        this.scene.start('match', {
          mode: 'online',
          online: {
            matchId: msg.matchId,
            hostClientId: msg.hostClientId,
            clientId: session.net.clientId,
            seed: msg.seed,
            startAtTick: msg.startAtTick
          }
        });
      }
      if (msg.type === 'ERROR') {
        this.statusText.setText(`Error: ${msg.message}`);
      }
    });

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.submit());
    this.input.keyboard?.on('keydown-SPACE', () => this.submit());
    this.events.on('shutdown', () => this.unmountSoakControls());
  }

  private moveSelection(delta: number): void {
    this.selected = (this.selected + delta + OPTIONS.length) % OPTIONS.length;
    this.updateSelection();
  }

  private updateSelection(): void {
    this.lines.forEach((line, i) => {
      line.setColor(i === this.selected ? '#fff6a3' : '#97d8bb');
      line.setScale(i === this.selected ? 1.07 : 1);
    });
  }

  private submit(): void {
    const session = getOnlineSession();
    if (this.selected === 0) {
      session.queueMatch();
      this.statusText.setText('Searching queue...');
      return;
    }
    if (this.selected === 1) {
      session.createLobby();
      this.statusText.setText('Creating lobby...');
      return;
    }
    if (this.selected === 2) {
      const code = window.prompt('Enter lobby code')?.trim();
      if (!code) {
        return;
      }
      session.joinLobby(code);
      this.statusText.setText(`Joining ${code.toUpperCase()}...`);
      return;
    }
    this.unmountSoakControls();
    this.scene.start('menu');
  }

  private mountSoakControls(): void {
    this.unmountSoakControls();
    const session = getOnlineSession();
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.right = '14px';
    panel.style.bottom = '14px';
    panel.style.background = 'rgba(5, 20, 16, 0.85)';
    panel.style.border = '1px solid #2f6654';
    panel.style.padding = '10px';
    panel.style.color = '#d7fff0';
    panel.style.fontFamily = 'Trebuchet MS, sans-serif';
    panel.style.fontSize = '12px';
    panel.style.zIndex = '9999';
    panel.innerHTML = '<div style=\"font-size:13px;margin-bottom:8px;\">Network Soak</div>';

    const addSlider = (label: string, min: number, max: number, step: number, initial: number, onValue: (v: number) => void): void => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '70px 120px 36px';
      row.style.alignItems = 'center';
      row.style.gap = '6px';
      row.style.marginBottom = '6px';
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(initial);
      const value = document.createElement('span');
      value.textContent = String(initial);
      input.oninput = () => {
        const v = Number(input.value);
        value.textContent = String(v);
        onValue(v);
      };
      row.append(text, input, value);
      panel.appendChild(row);
    };

    addSlider('Latency', 0, 250, 5, 0, (v) => session.net.setSimulation({ latencyMs: v }));
    addSlider('Jitter', 0, 120, 5, 0, (v) => session.net.setSimulation({ jitterMs: v }));
    addSlider('Drop %', 0, 5, 1, 0, (v) => session.net.setSimulation({ dropRate: v / 100 }));

    document.body.appendChild(panel);
    this.soakPanel = panel;
  }

  private unmountSoakControls(): void {
    if (!this.soakPanel) {
      return;
    }
    this.soakPanel.remove();
    this.soakPanel = null;
  }
}
