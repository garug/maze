export default class TreeNode {

  private parent?: TreeNode;

  private id: string;

  public constructor(id: string) {
    this.id = id;
  }

  get root(): TreeNode {
    return this.parent ? this.parent.root : this;
  }

  set root(node: TreeNode) {
    node.root.parent = this;
  }

  toString() {
    return this.id;
  }
}