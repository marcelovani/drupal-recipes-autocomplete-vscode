import { workspace } from 'vscode';
import { addToCache, cacheItem } from '../utils/cache';
import DrupalWorkspace from './drupal-workspace';
import {
  DiscoveredAction,
  actionsInPhp,
  collectActions,
} from './config-action-discovery';

/**
 * Finds the config actions this codebase offers, and caches them as
 * suggestions under config/actions/<config name>.
 *
 * Core's own actions ship as a generated list, so only contrib and custom
 * modules are read here. That keeps the scan to a few hundred files rather
 * than the whole of core, and it is the only part a static list cannot cover:
 * a module that declares an action of its own.
 */
export class PhpDiscovery {
  private drupalWorkspace: DrupalWorkspace;
  private cache: Map<string, cacheItem[]>;

  constructor(drupalWorkspace: DrupalWorkspace, cache: Map<string, cacheItem[]>) {
    this.drupalWorkspace = drupalWorkspace;
    this.cache = cache;
  }

  /**
   * Reads the modules in the workspace and caches what they can do.
   */
  async discover(): Promise<DiscoveredAction[]> {
    const fromModules = await this.actionsFromModules();
    const actions = collectActions(this.cache.keys(), fromModules);

    for (const action of actions) {
      addToCache(
        'config/actions/*',
        '',
        '',
        action.name,
        action.origin,
        `${action.name}:\n  `,
        'config_item',
        this.cache
      );
    }

    return actions;
  }

  /**
   * The actions declared by contrib and custom modules in the workspace.
   *
   * Only files that mention an attribute are read, so the cost is a glob and a
   * handful of reads rather than parsing everything.
   */
  private async actionsFromModules(): Promise<DiscoveredAction[]> {
    // Core is excluded because its actions already ship; vendor and
    // node_modules because nothing there is part of the site.
    const files = await this.drupalWorkspace.findFiles(
      '**/{modules,themes,profiles}/**/src/**/*.php',
      '**/{vendor,node_modules,core}/**'
    );

    const found: DiscoveredAction[] = [];

    for (const file of files) {
      let source: string;

      try {
        const bytes = await workspace.fs.readFile(file);
        source = Buffer.from(bytes).toString('utf8');
      } catch {
        // A file that has moved mid-scan is not worth failing the scan for.
        continue;
      }

      // Cheap test before the expensive one: most PHP files declare nothing.
      if (!source.includes('ConfigAction') && !source.includes('ActionMethod')) {
        continue;
      }

      const module = this.moduleName(file.toString());

      for (const action of actionsInPhp(source, `Provided by ${module}`)) {
        if (!found.some((a) => a.name === action.name)) {
          found.push(action);
        }
      }
    }

    return found;
  }

  /**
   * The extension a file belongs to, taken from the directory above src/.
   *
   * @param string filePath
   *   The file path.
   * @returns string
   *   The module name, or a readable fallback.
   */
  private moduleName(filePath: string): string {
    const match = /\/([^/]+)\/src\//.exec(filePath);

    return match !== null ? match[1] : 'a module in this codebase';
  }
}
