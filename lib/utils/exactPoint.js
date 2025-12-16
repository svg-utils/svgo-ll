import { ExactNum } from './exactNum.js';

export class ExactPoint {
  #x;
  #y;

  /**
   * @param {ExactNum} x
   * @param {ExactNum} y
   */
  constructor(x, y) {
    this.#x = x;
    this.#y = y;
  }

  getX() {
    return this.#x;
  }

  getY() {
    return this.#y;
  }

  /**
   * @param {ExactNum|undefined} dx
   * @param {ExactNum} [dy]
   * @return {ExactPoint|undefined}
   */
  incr(dx, dy) {
    const x = dx === undefined ? this.#x : this.#x.add(dx);
    const y = dy === undefined ? this.#y : this.#y.add(dy);
    return x === undefined || y === undefined
      ? undefined
      : new ExactPoint(x, y);
  }

  static zero() {
    return new ExactPoint(new ExactNum(0), new ExactNum(0));
  }
}
