import Disposable from '../disposable';
import {
  FileSystemWatcher,
  RelativePattern,
  workspace,
  WorkspaceConfiguration,
} from 'vscode';
import DrupalWorkspace from './drupal-workspace';

export default class DrupalWorkspaceProvider extends Disposable {
  drupalWorkspace: DrupalWorkspace;

  constructor(arg: { drupalWorkspace: DrupalWorkspace }) {
    super();

    this.drupalWorkspace = arg.drupalWorkspace;
  }

  get name(): string {
    throw new Error('Getter name not implemented.');
  }

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration(this.configName);
  }

  get configName(): string {
    return `drupal.${this.name}`;
  }

  get source() {
    return `Drupal: ${this.name}`;
  }
}
