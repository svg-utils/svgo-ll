import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getHrefId, getReferencedIds2 } from '../lib/tools-ast.js';

export const name = 'minifyPatterns';
export const description =
  'merge pattern elements and remove unused attributes';

/** @type {Set<string>} */
const OVERRIDEABLE_PATTERN_ATTS = new Set([
  'height',
  'patternContentUnits',
  'patternTransform',
  'patternUnits',
  'preserveAspectRatio',
  'viewBox',
  'width',
  'x',
  'y',
]);

class PatternInfo {
  #id;
  #element;
  #hrefId;
  /** @type {PatternInfo|undefined} */
  #href;
  /** @type {import('../types/types.js').ReferenceInfo[]} */
  #paintRefs = [];
  /** @type {Set<PatternInfo>} */
  #patternRefs = new Set();

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  constructor(element) {
    this.#id = element.svgAtts.get('id')?.toString();
    this.#element = element;
    this.#hrefId = getHrefId(element);
  }

  /**
   * @param {import('../types/types.js').ReferenceInfo} ref
   */
  addPaintRef(ref) {
    this.#paintRefs.push(ref);
  }

  /**
   * @param {PatternInfo} ref
   */
  addTemplateRef(ref) {
    this.#patternRefs.add(ref);
  }

  getElement() {
    return this.#element;
  }

  getHref() {
    return this.#href;
  }

  getHrefId() {
    return this.#hrefId;
  }

  getId() {
    return this.#id;
  }

  /**
   * @param {Map<string,PatternInfo>} patternInfoById
   * @returns {boolean}
   */
  initHref(patternInfoById) {
    if (this.#hrefId === undefined) {
      return true;
    }

    this.#href = patternInfoById.get(this.#hrefId);
    if (this.#href === undefined) {
      return false;
    }
    this.#href.addTemplateRef(this);
    return true;
  }

  isReferenced() {
    return this.#paintRefs.length > 0 || this.#patternRefs.size > 0;
  }

  /**
   * @param {PatternInfo} ref
   */
  removeTemplateRef(ref) {
    this.#patternRefs.delete(ref);
  }

  /**
   * @param {PatternInfo} ref
   */
  setHref(ref) {
    this.#href = ref;
    const id = ref.getId();
    this.#element.svgAtts.set('href', new HrefAttValue('#' + id));
  }
}

/** @type {import('./plugins-types.js').Plugin<'minifyPatterns'>}; */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  /** @type {Set<PatternInfo>} */
  const patterns = new Set();

  /** @type {Map<string,PatternInfo>} */
  const patternInfoById = new Map();

  /** @type {import('../types/types.js').ReferenceInfo[]} */
  const paintReferences = [];

  return {
    element: {
      enter: (element) => {
        if (element.uri !== undefined) {
          return;
        }

        switch (element.local) {
          case 'pattern':
            {
              const info = new PatternInfo(element);
              patterns.add(info);
              const id = info.getId();
              if (id !== undefined) {
                patternInfoById.set(id, info);
              }
            }
            break;
          default: {
            const refs = getReferencedIds2(element);
            refs.forEach((ref) => {
              if (ref.name === 'fill' || ref.name === 'stroke') {
                paintReferences.push(ref);
              }
            });
          }
        }
      },
    },
    root: {
      exit: () => {
        initializeReferences(patterns, patternInfoById, paintReferences);

        minifyPatterns(patterns);
      },
    },
  };
};

/**
 * @param {PatternInfo} info
 */
function collapseTemplate(info) {
  // Remove intermediate template references if possible.

  const target = info.getHref();
  if (target === undefined) {
    return;
  }
  const targetHref = target.getHref();
  if (targetHref === undefined) {
    return;
  }

  // If none of the intermediate template attributes are used, bypass the intermediate template.
  const srcEl = info.getElement();
  const targetEl = target.getElement();
  for (const attName of targetEl.svgAtts.keys()) {
    if (!OVERRIDEABLE_PATTERN_ATTS.has(attName)) {
      continue;
    }
    if (srcEl.svgAtts.get(attName) === undefined) {
      return;
    }
  }

  info.setHref(targetHref);
  target.removeTemplateRef(info);
  targetHref.addTemplateRef(info);

  // See if we can collapse again.
  collapseTemplate(info);
}

/**
 * @param {Set<PatternInfo>} patterns
 * @param {Map<string,PatternInfo>} patternInfoById
 * @param {import('../types/types.js').ReferenceInfo[]} paintReferences
 */
function initializeReferences(patterns, patternInfoById, paintReferences) {
  for (const info of patterns) {
    info.initHref(patternInfoById);
    // TODO: HANDLE false return
  }

  for (const ref of paintReferences) {
    const referencedPattern = patternInfoById.get(ref.id);
    if (referencedPattern !== undefined) {
      referencedPattern.addPaintRef(ref);
    }
  }
}

/**
 * @param {Set<PatternInfo>} patterns
 */
function minifyPatterns(patterns) {
  const childrenToDelete = new ChildDeletionQueue();

  for (const info of patterns) {
    if (!info.isReferenced()) {
      childrenToDelete.add(info.getElement());
    }
    collapseTemplate(info);
  }

  childrenToDelete.delete();
}
