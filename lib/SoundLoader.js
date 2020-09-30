class SoundLoader {
  /**
   * @private
   * @type {HTMLAudioElement | null}
   */
  _sound = null;

  constructor(path, volume) {
    this._path = path;
    this._volume = volume;
  }

  /**
   * @public
   * @return {Promise<HTMLAudioElement>}
   * @throws {ErrorEvent}
   */
  async load() {
    return new Promise((resolve, reject) => {
      this._sound = new Audio(this._path);
      this._sound.volume = this._volume;
      this._sound.addEventListener("canplaythrough", () => resolve(this._sound));
      this._sound.addEventListener("error", reject);
    });
  }

  clear() {
    this._sound = null;
  }
}
