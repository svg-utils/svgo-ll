import { MarkerAttValue } from './markerAttValue.js';

export class ClipPathAttValue extends MarkerAttValue {
  /**
   * @param {string|undefined} strValue
   * @param {boolean} [isImportant]
   * @param {import('../types/presentationAttUrl.js').PresentationAttUrl|undefined} [urlValue]
   */
  constructor(strValue, isImportant, urlValue) {
    super(strValue, isImportant, urlValue);
  }
}
