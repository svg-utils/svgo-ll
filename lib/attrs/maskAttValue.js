import { MarkerAttValue } from './markerAttValue.js';

export class MaskAttValue extends MarkerAttValue {
  /**
   * @param {string|undefined} strValue
   * @param {boolean} [isImportant]
   * @param {import('../types/presentationAttUrl.js').PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, isImportant, urlValue) {
    super(strValue, isImportant, urlValue);
  }

  /**
   * @param {import('../types.js').XastElement} element
   * @param {string} attName
   * @returns {MaskAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new MaskAttValue(value),
    );
  }
}
