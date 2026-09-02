import coreActions from './core-config-actions.json';

/**
 * Finds the config actions a recipe can use in this particular codebase.
 *
 * Three things produce an action name, and only the first can come from a
 * static list:
 *
 *  - Drupal core, which is the same everywhere for a given core version.
 *    core-config-actions.json is generated from core's source by
 *    scripts/extract-config-actions.php, so it ships rather than being
 *    rediscovered on every activation.
 *  - A deriver that reads the installed entity types.
 *    PermissionsPerBundleDeriver turns every bundle entity type into
 *    grantPermissionsForEach<Bundle>, so the set differs per site and no
 *    schema can ever hold it. These come from the config entities the YAML
 *    scan has already found.
 *  - A contrib or custom module that declares its own. Only reading that
 *    module's PHP finds these.
 *
 * See docs/tracking-drupal-recipes.md.
 */

/** An action, and enough about it to explain itself in the completion list. */
export interface DiscoveredAction {
  name: string;
  /** Where it came from, shown as the completion's documentation. */
  origin: string;
}

/**
 * The bundle entity types core generates per-bundle actions from.
 *
 * PermissionsPerBundleDeriver camelizes the bundle entity type id, so
 * taxonomy_vocabulary becomes grantPermissionsForEachTaxonomyVocabulary. The
 * config prefix is how the YAML scan recognises that the entity type is
 * present at all.
 */
const BUNDLE_ENTITY_TYPES: { prefix: string; suffix: string }[] = [
  { prefix: 'node.type.', suffix: 'NodeType' },
  { prefix: 'taxonomy.vocabulary.', suffix: 'TaxonomyVocabulary' },
  { prefix: 'media.type.', suffix: 'MediaType' },
  { prefix: 'comment.type.', suffix: 'CommentType' },
  { prefix: 'block_content.type.', suffix: 'BlockContentType' },
  { prefix: 'contact.form.', suffix: 'ContactForm' },
];

/**
 * A ConfigAction plugin declares its own id, unless it names a deriver, in
 * which case the deriver decides and nothing static can say what it produces.
 */
const CONFIG_ACTION = /#\[ConfigAction\((?<args>[\s\S]*?)\)\]/g;

/**
 * An #[ActionMethod] attribute and the method it sits on. Other attributes may
 * come between the two.
 */
const ACTION_METHOD =
  /#\[ActionMethod\((?<args>[\s\S]*?)\)\]\s*(?:#\[[\s\S]*?\]\s*)*public function\s+(?<method>[A-Za-z0-9_]+)\s*\(/g;

/**
 * Pluralises an action name the way core does.
 *
 * EntityMethodDeriver runs the method name through Symfony's EnglishInflector,
 * which is why hideComponents is a real action although that word appears
 * nowhere in core. Only the handful of endings that occur on action names are
 * covered; anything else keeps its own name, which is the safe direction to be
 * wrong in, since offering a name that does not exist is worse than missing
 * one that does.
 *
 * @param string name
 *   The singular action name.
 * @returns string
 *   The plural, or an empty string when there is no sensible one.
 */
export function pluralise(name: string): string {
  // A name already ending in s is left alone. Core's inflector would sometimes
  // add -es here, but guessing wrong invents an action that does not exist,
  // which is worse than missing one that does.
  if (/s$/.test(name)) {
    return '';
  }

  if (/(x|z|ch|sh)$/.test(name)) {
    return `${name}es`;
  }

  if (/[^aeiou]y$/.test(name)) {
    return `${name.slice(0, -1)}ies`;
  }

  return `${name}s`;
}

/**
 * The actions declared by one PHP file.
 *
 * @param string source
 *   The file contents.
 * @param string origin
 *   What to tell the user this file is, i.e. the module name.
 * @returns DiscoveredAction[]
 *   The actions the file declares, including pluralised aliases.
 */
export function actionsInPhp(source: string, origin: string): DiscoveredAction[] {
  const found: DiscoveredAction[] = [];
  const add = (name: string) => {
    if (name !== '' && !found.some((a) => a.name === name)) {
      found.push({ name, origin });
    }
  };

  for (const match of source.matchAll(CONFIG_ACTION)) {
    const args = match.groups?.args ?? '';

    // A plugin with a deriver contributes no usable name of its own: the
    // deriver decides, and it needs a running site to do so.
    if (/deriver:/.test(args)) {
      continue;
    }

    const id = /id:\s*'([^']+)'/.exec(args);

    if (id !== null) {
      // An entity-type-scoped id is written without its prefix in a recipe.
      add(id[1].includes(':') ? id[1].split(':')[1] : id[1]);
    }
  }

  for (const match of source.matchAll(ACTION_METHOD)) {
    const args = match.groups?.args ?? '';
    const explicit = /name:\s*'([^']+)'/.exec(args);
    const name = explicit !== null ? explicit[1] : (match.groups?.method ?? '');

    add(name);

    if (/pluralize:\s*FALSE/i.test(args)) {
      continue;
    }

    const given = /pluralize:\s*'([^']+)'/.exec(args);

    add(given !== null ? given[1] : pluralise(name));
  }

  return found;
}

/**
 * The per-bundle actions this codebase's entity types imply.
 *
 * @param Iterable<string> configNames
 *   The config names the YAML scan has cached.
 * @returns DiscoveredAction[]
 *   One grantPermissionsForEach action per bundle entity type present.
 */
export function actionsFromBundles(
  configNames: Iterable<string>
): DiscoveredAction[] {
  const present = new Set<string>();

  for (const name of configNames) {
    for (const { prefix, suffix } of BUNDLE_ENTITY_TYPES) {
      // A bundle is one segment after the prefix; anything longer is some
      // other config that merely starts the same way.
      if (name.startsWith(prefix) && !name.slice(prefix.length).includes('.')) {
        present.add(suffix);
      }
    }
  }

  return [...present].map((suffix) => ({
    name: `grantPermissionsForEach${suffix}`,
    origin: 'Generated from the entity types in this codebase',
  }));
}

/**
 * Every action available in this codebase.
 *
 * @param Iterable<string> configNames
 *   The config names the YAML scan has cached.
 * @param DiscoveredAction[] fromModules
 *   Actions found by reading contrib and custom module PHP.
 * @returns DiscoveredAction[]
 *   Core's actions, plus what this codebase adds, without duplicates.
 */
export function collectActions(
  configNames: Iterable<string>,
  fromModules: DiscoveredAction[]
): DiscoveredAction[] {
  const byName = new Map<string, DiscoveredAction>();

  for (const action of coreActions.actions) {
    byName.set(action.name, { name: action.name, origin: 'Drupal core' });
  }

  // A module that redeclares a core action does not get to claim it twice, but
  // the codebase's own actions are worth saying so about.
  for (const action of [...actionsFromBundles(configNames), ...fromModules]) {
    if (!byName.has(action.name)) {
      byName.set(action.name, action);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
