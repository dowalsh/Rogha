// src/components/editor/nodes/emoji-node.tsx
"use client";

import * as React from "react";
import {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
  TextNode,
} from "lexical";

type SerializedEmojiNode = Spread<
  {
    type: "emoji";
    version: 1;
    emoji: string;
  },
  SerializedTextNode
>;

export class EmojiNode extends TextNode {
  __emoji: string;

  static getType(): string {
    return "emoji";
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__emoji, node.__text, node.__key);
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    const node = new EmojiNode(serializedNode.emoji, serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      type: "emoji",
      version: 1,
      emoji: this.__emoji,
    };
  }

  constructor(emoji: string, text?: string, key?: NodeKey) {
    // we can store the actual emoji char in text for selection behavior
    super(text ?? emoji, key);
    this.__emoji = emoji;
  }

  // Optional: control behavior
  isTextEntity(): true {
    return true;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // Style your emoji (optional)
    dom.classList.add("emoji-node");
    return dom;
  }

  // ⛔️ FIX: use `this` for the first param to match the base signature
  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // If nothing relevant changed, reuse DOM
    if (this.__emoji === prevNode.__emoji && this.__text === prevNode.__text) {
      // delegate to parent (handles format/style changes)
      return super.updateDOM(prevNode, dom, config);
    }
    // If emoji/text changed, ask Lexical to re-create DOM
    return false;
  }
}

// helper to construct
export function $createEmojiNode(emoji: string): EmojiNode {
  return new EmojiNode(emoji);
}

export function $isEmojiNode(
  node?: LexicalNode | null | undefined
): node is EmojiNode {
  return node instanceof EmojiNode;
}
