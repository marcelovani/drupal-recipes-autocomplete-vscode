import { Disposable as IDisposable } from 'vscode';

export default class Disposable implements IDisposable {
  readonly disposables: IDisposable[] = [];

  dispose(): void {
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
