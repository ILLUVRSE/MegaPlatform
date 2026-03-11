import Phaser from 'phaser';

export function addPortraitHint(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const text = scene.add.text(scene.scale.width * 0.5, scene.scale.height - 18, '', {
    fontFamily: 'Verdana',
    fontSize: '14px',
    color: '#8db8db'
  }).setOrigin(0.5).setDepth(120).setScrollFactor(0);

  const refresh = () => {
    const portrait = scene.scale.height >= scene.scale.width;
    text.setText(portrait ? 'Portrait optimized' : 'Landscape supported');
  };

  refresh();
  scene.scale.on('resize', refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off('resize', refresh);
  });

  return text;
}
