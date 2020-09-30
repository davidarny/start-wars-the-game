class ImageLoader {
  /**
   * @private
   * @type {HTMLImageElement}
   */
  _image = null;

  /**
   * @param {string} path Path to image
   */
  constructor(path) {
    this._path = path;
  }

  /**
   * @public
   * @returns {Promise<HTMLImageElement>}
   * @throws {ErrorEvent}
   */
  async load() {
    return new Promise((resolve, reject) => {
      this._image = new Image();
      this._image.src = this._path;
      this._image.addEventListener("load", () => resolve(this._image));
      this._image.addEventListener("error", reject);
    });
  }

  clear() {
    this._image = null;
  }
}
