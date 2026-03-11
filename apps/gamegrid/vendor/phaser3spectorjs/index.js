'use strict';

class Spector {
  constructor() {
    this.onCapture = { add: () => {} };
  }

  displayUI() {}
  spyCanvases() {}
  captureCanvas() {}
  captureNextFrame() {}
  startCapture() {}
  stopCapture() {}
  setMarker() {}
  log() {}
}

module.exports = Spector;
module.exports.Spector = Spector;
