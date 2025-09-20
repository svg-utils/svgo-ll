import { ExactNum } from '../../lib/exactnum.js';

describe('test minification', () => {
  /** @type {{in:string,digits:number,out:string}[]} */
  const testCases = [{ in: '.00004', digits: 4, out: '0' }];

  for (const testCase of testCases) {
    it(`${testCase.in}`, () => {
      const e = new ExactNum(testCase.in).round(testCase.digits);
      expect(e.getMinifiedString()).toBe(testCase.out);
    });
  }
});

describe('test preservation of digits in addition/subtraction', () => {
  /** @type {{n1:number,n2:number,result:number|undefined,addSub:'+'|'-'}[]} */
  const testCases = [
    { n1: 128.3, n2: 0.04, result: 128.34, addSub: '+' },
    { n1: 128.3, n2: 0.7, result: 129, addSub: '+' },
    { n1: 128, n2: 8.8817842e-16, result: undefined, addSub: '+' },
    { n1: 128, n2: 8.8817842e-16, result: undefined, addSub: '-' },
  ];

  for (const testCase of testCases) {
    it(`${testCase.n1} ${testCase.addSub} ${testCase.n2}`, () => {
      const e = new ExactNum(testCase.n1);
      const n2 = new ExactNum(testCase.n2);
      const result = testCase.addSub === '+' ? e.add(n2) : e.sub(n2);
      if (testCase.result == undefined) {
        expect(result).toBeUndefined();
      } else {
        if (result === undefined) {
          expect(result).toBeDefined();
        } else {
          expect(result.isEqualTo(new ExactNum(testCase.result))).toBe(true);
        }
      }
    });
  }
});

it('trim trailing zeros in ExactNum constructor', () => {
  const e = new ExactNum('1.30');
  expect(e.getNumberOfDigits()).toBe(1);
});

describe('test incr', () => {
  it('.2+.1+.7', () => {
    const n1 = new ExactNum('.2');
    const n2 = new ExactNum('.1');
    const n3 = new ExactNum('.7');
    expect(n1.getNumberOfDigits()).toBe(1);
    n1.incr(n2);
    expect(n1.getNumberOfDigits()).toBe(1);
    n1.incr(n3);
    expect(n1.getNumberOfDigits()).toBe(0);
    expect(n1.getMinifiedString()).toBe('1');
  });

  it('.3+.3+.3+.1', () => {
    const n1 = new ExactNum('.3');
    const n2 = new ExactNum('.3');
    const n3 = new ExactNum('.3');
    const n4 = new ExactNum('.1');
    expect(n1.getNumberOfDigits()).toBe(1);
    n1.incr(n2);
    expect(n1.getNumberOfDigits()).toBe(1);
    n1.incr(n3);
    expect(n1.getNumberOfDigits()).toBe(1);
    n1.incr(n4);
    expect(n1.getNumberOfDigits()).toBe(0);
    expect(n1.getMinifiedString()).toBe('1');
  });
});
