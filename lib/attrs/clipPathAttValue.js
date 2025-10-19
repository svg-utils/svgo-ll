import { MarkerAttValue } from './markerAttValue.js';

export class ClipPathAttValue extends MarkerAttValue {
  /**
   * @param {string|undefined} strValue
   * @param {import('../types/presentationAttUrl.js').PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, urlValue) {
    super(strValue, urlValue);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {ClipPathAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new ClipPathAttValue(value),
    );
  }
}
