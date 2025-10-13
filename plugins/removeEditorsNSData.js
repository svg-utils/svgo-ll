import { editorNamespaces } from './_collections.js';
import { deleteOtherAtt, getOtherAtts, NS_XMLNS } from '../lib/tools-ast.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

export const name = 'removeEditorsNSData';
export const description =
  'removes editors namespaces, elements and attributes';

/**
 * Remove editors namespaces, elements and attributes.
 *
 * @example
 * <svg xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">
 * <sodipodi:namedview/>
 * <path sodipodi:nodetypes="cccc"/>
 *
 * @type {import('./plugins-types.js').Plugin<'removeEditorsNSData'>}
 */
export function fn(info, params) {
  let namespaces = [...editorNamespaces];
  if (Array.isArray(params.additionalNamespaces)) {
    namespaces = [...editorNamespaces, ...params.additionalNamespaces];
  }

  const childrenToDelete = new ChildDeletionQueue();

  return {
    element: {
      enter: (element) => {
        // collect namespace prefixes from svg element
        if (element.local === 'svg' && element.uri === undefined) {
          for (const att of getOtherAtts(element)) {
            if (att.uri === NS_XMLNS && namespaces.includes(att.value)) {
              deleteOtherAtt(element, att);
            }
          }
        }
        // remove editor attributes, for example
        // <* sodipodi:*="">
        for (const att of getOtherAtts(element)) {
          if (namespaces.includes(att.uri)) {
            deleteOtherAtt(element, att);
          }
        }
        // remove editor elements, for example
        // <sodipodi:*>
        if (element.uri !== undefined && namespaces.includes(element.uri)) {
          childrenToDelete.add(element);
        }
      },
    },
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
}
