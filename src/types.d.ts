import { CompletionItem } from 'vscode';

declare module 'doc-parser' {
  interface Doc {
    kind: 'doc';
    summary: string;
    body?: Block[];
  }

  type blockType = 'return' | 'param' | 'throws' | 'deprecated';

  interface Block {
    kind: blockType;
    description?: string;
    type?: unknown;
  }

  export default class DocParser {
    parse(text: string): Doc;
  }
}

export interface CompletionItemWithCallback extends CompletionItem {
  callback: string;
}

export type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_]
  ? Tail_
  : never;
