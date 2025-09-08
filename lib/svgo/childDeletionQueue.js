export class ChildDeletionQueue {
  /** @type {Map<import('../types.js').XastParent,Set<import('../types.js').XastChild>>} */
  #childrenToDeleteByParent = new Map();

  /**
   * @param {import('../types.js').XastChild} child
   */
  add(child) {
    let childrenToDelete = this.#childrenToDeleteByParent.get(child.parentNode);
    if (!childrenToDelete) {
      childrenToDelete = new Set();
      this.#childrenToDeleteByParent.set(child.parentNode, childrenToDelete);
    }
    childrenToDelete.add(child);
  }

  delete() {
    // For each parent, delete no longer needed children.
    for (const [parent, childrenToDelete] of this.#childrenToDeleteByParent) {
      parent.children = parent.children.filter((c) => !childrenToDelete.has(c));
    }
  }
}
