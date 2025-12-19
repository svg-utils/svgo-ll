import { HrefAttValue } from '../lib/attrs/hrefAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import {
  getHrefId,
  getReferencedIds2,
  moveChildren,
} from '../lib/tools-ast.js';

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
  /** @type {boolean} */
  #hasStyleRefs;

  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {string[]} styleIds
   */
  constructor(element, styleIds) {
    this.#id = element.svgAtts.get('id')?.toString();
    this.#element = element;
    this.#hrefId = getHrefId(element);
    this.#hasStyleRefs = styleIds.includes(this.#id ?? '');
  }

  /**
   * @param {import('../types/types.js').ReferenceInfo} ref
   */
  addPaintRef(ref) {
    this.#paintRefs.push(ref);
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

  getNumberOfReferences() {
    return (
      this.#paintRefs.length +
      this.#patternRefs.size +
      (this.#hasStyleRefs ? 1 : 0)
    );
  }

  getPatternRefs() {
    return this.#patternRefs;
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
    this.#href.#patternRefs.add(this);
    return true;
  }

  isReferenced() {
    return (
      this.#paintRefs.length > 0 ||
      this.#patternRefs.size > 0 ||
      this.#hasStyleRefs
    );
  }

  isReferencedByPaint() {
    return this.#paintRefs.length > 0 || this.#hasStyleRefs;
  }

  /**
   * @param {PatternInfo|undefined} ref
   */
  setHref(ref) {
    if (this.#href !== undefined) {
      this.#href.#patternRefs.delete(this);
    }
    if (ref) {
      ref.#patternRefs.add(this);
    }

    this.#href = ref;
    this.#hrefId = ref?.getId();
    if (ref === undefined) {
      this.#element.svgAtts.delete('href');
    } else {
      this.#element.svgAtts.set('href', new HrefAttValue('#' + this.#hrefId));
    }
  }
}

/** @type {import('./plugins-types.js').Plugin<'minifyPatterns'>}; */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const styleIds = styleData.getIdsReferencedByProperties();

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
              const info = new PatternInfo(element, styleIds);
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
 * @param {IterableIterator<PatternInfo>} refs
 * @param {string} attName
 * @returns {boolean}
 */
function allReferersOverride(refs, attName) {
  for (const ref of refs) {
    if (ref.getElement().svgAtts.get(attName) === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * @param {PatternInfo} info
 * @param {Set<PatternInfo>} changedPatterns
 */
function collapseTemplate(info, changedPatterns) {
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
  // TODO: ROLL THIS INTO SETHREF()?
  changedPatterns.add(target);
  changedPatterns.add(targetHref);

  // See if we can collapse again.
  collapseTemplate(info, changedPatterns);
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
 * @param {PatternInfo} info
 * @param {Set<PatternInfo>} changedPatterns
 * @param {ChildDeletionQueue} childrenToDelete
 */
function mergeIntoReferrer(info, changedPatterns, childrenToDelete) {
  // If this pattern is only referenced by a single pattern, merge it into the referencing pattern.
  if (info.getNumberOfReferences() !== 1) {
    return;
  }
  const refs = info.getPatternRefs();
  if (refs.size !== 1) {
    return;
  }
  refs.forEach((ref) =>
    mergeIntoTemplate(ref, changedPatterns, childrenToDelete),
  );
}

/**
 * @param {PatternInfo} info
 * @param {Set<PatternInfo>} changedPatterns
 * @param {ChildDeletionQueue} childrenToDelete
 */
function mergeIntoTemplate(info, changedPatterns, childrenToDelete) {
  const href = info.getHref();
  if (href === undefined) {
    return;
  }
  if (href.getNumberOfReferences() !== 1) {
    return;
  }

  // The target template is only referenced by this pattern; merge them.
  const element = info.getElement();
  const targetEl = href.getElement();
  if (element.children.every((child) => child.type !== 'element')) {
    moveChildren(targetEl.children, element);
  }

  for (const [attName, attValue] of targetEl.svgAtts.entries()) {
    if (!OVERRIDEABLE_PATTERN_ATTS.has(attName)) {
      continue;
    }
    if (element.svgAtts.get(attName) !== undefined) {
      continue;
    }
    element.svgAtts.set(attName, attValue);
  }

  changedPatterns.delete(href);
  childrenToDelete.add(targetEl);

  const newHref = href.getHref();
  info.setHref(newHref);
  if (newHref !== undefined) {
    // TODO: ROLL THIS INTO SETHREF()?
    changedPatterns.add(newHref);
    mergeIntoTemplate(info, changedPatterns, childrenToDelete);
  }
}

/**
 * @param {Set<PatternInfo>} patterns
 */
function minifyPatterns(patterns) {
  const childrenToDelete = new ChildDeletionQueue();
  minifyPatternSet(patterns, childrenToDelete);
  childrenToDelete.delete();
}

/**
 * @param {Set<PatternInfo>} patterns
 * @param {ChildDeletionQueue} childrenToDelete
 */
function minifyPatternSet(patterns, childrenToDelete) {
  /** @type {Set<PatternInfo>} */
  const changedPatterns = new Set();

  for (const info of patterns) {
    changedPatterns.delete(info);
    if (!info.isReferenced()) {
      info.setHref(undefined);
      childrenToDelete.add(info.getElement());
    }
    collapseTemplate(info, changedPatterns);
    mergeIntoTemplate(info, changedPatterns, childrenToDelete);
    mergeIntoReferrer(info, changedPatterns, childrenToDelete);
    removeUselessAttributes(info);
  }

  if (changedPatterns.size > 0) {
    minifyPatterns(changedPatterns);
  }
}

/**
 * @param {PatternInfo} info
 */
function removeUselessAttributes(info) {
  if (info.isReferencedByPaint()) {
    return;
  }
  const element = info.getElement();
  const refs = info.getPatternRefs();
  for (const attName of element.svgAtts.keys()) {
    if (!OVERRIDEABLE_PATTERN_ATTS.has(attName)) {
      continue;
    }
    if (allReferersOverride(refs.values(), attName)) {
      element.svgAtts.delete(attName);
    }
  }
}
