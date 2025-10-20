import { MarkerAttValue } from './markerAttValue.js';

export class FilterAttValue extends MarkerAttValue {
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
   * @returns {FilterAttValue|undefined}
   */
  static getAttValue(element, attName) {
    return this.getAttValueGeneric(
      element,
      attName,
      (value) => new FilterAttValue(value),
    );
  }
}
