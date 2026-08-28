<?php

/**
 * Lists every config action a Drupal core checkout exposes to a recipe.
 *
 * Usage:
 *   php scripts/extract-config-actions.php /path/to/drupal-core [autoload.php]
 *
 * Reading the source rather than the handbook is deliberate. An action can ship
 * without anyone writing it up, and the documentation has lagged core more than
 * once. See docs/tracking-drupal-recipes.md.
 *
 * Two things produce an action name, matching how ConfigActionManager builds
 * its plugin list:
 *
 *  - A ConfigAction plugin class, whose id is the action name — unless it names
 *    a deriver, in which case the deriver decides and this script cannot say.
 *  - An #[ActionMethod] attribute on a config entity method. EntityMethodDeriver
 *    makes one action per method plus a pluralised alias unless pluralize is
 *    FALSE, which is why hideComponents is a real action despite that string
 *    appearing nowhere in core.
 *
 * Names produced by a deriver are reported separately and have to be read out
 * of the deriver. Some of them do not exist until a site is built:
 * PermissionsPerBundleDeriver generates grantPermissionsForEach<Bundle> from the
 * entity types that happen to be installed. No static list can be complete for
 * those, which is the argument for issue #8.
 */

declare(strict_types=1);

use Symfony\Component\String\Inflector\EnglishInflector;

$root = rtrim($argv[1] ?? '', '/');

if ($root === '' || !is_dir("$root/core")) {
  fwrite(STDERR, "Usage: php scripts/extract-config-actions.php /path/to/drupal-core [autoload.php]\n");
  exit(1);
}

$autoload = $argv[2] ?? "$root/vendor/autoload.php";

if (!file_exists($autoload)) {
  fwrite(STDERR, "Could not find $autoload.\nPass the path to any Drupal vendor/autoload.php as the second argument; symfony/string is needed to pluralise the way core does.\n");
  exit(1);
}

require $autoload;

$inflector = new EnglishInflector();
$actions = [];
$derived = [];

/**
 * Records an action and the file it came from.
 */
$add = function (string $name, string $source, string $kind) use (&$actions): void {
  if ($name === '') {
    return;
  }

  $actions[$name] ??= ['name' => $name, 'kind' => $kind, 'sources' => []];
  $actions[$name]['sources'][] = $source;
  $actions[$name]['sources'] = array_values(array_unique($actions[$name]['sources']));
};

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("$root/core"));

foreach ($files as $file) {
  if ($file->getExtension() !== 'php') {
    continue;
  }

  $path = str_replace("$root/", '', $file->getPathname());

  // Core's own test fixtures declare actions that are not part of the API.
  if (str_contains($path, '/tests/')) {
    continue;
  }

  $code = file_get_contents($file->getPathname());

  if (str_contains($code, '#[ConfigAction')) {
    if (preg_match("/id:\s*'([^']+)'/", $code, $id)) {
      if (preg_match('/deriver:\s*([A-Za-z0-9_]+)::class/', $code, $deriver)) {
        // A plugin with a deriver contributes no usable name of its own.
        $derived[] = [
          'plugin' => $id[1],
          'deriver' => $deriver[1],
          'source' => $path,
        ];
      }
      else {
        $add($id[1], $path, 'plugin');
      }
    }
  }

  if (!str_contains($code, 'ActionMethod')) {
    continue;
  }

  $pattern = '/#\[ActionMethod\((?<args>.*?)\)\]\s*(?:#\[[^\]]*\]\s*)*public function\s+(?<method>[A-Za-z0-9_]+)\s*\(/s';

  if (!preg_match_all($pattern, $code, $matches, PREG_SET_ORDER)) {
    continue;
  }

  foreach ($matches as $match) {
    $args = $match['args'];
    $name = $match['method'];

    // An explicit name overrides the method name.
    if (preg_match("/name:\s*'([^']+)'/", $args, $explicit)) {
      $name = $explicit[1];
    }

    $add($name, $path, 'entity_method');

    // pluralize defaults to TRUE, and takes FALSE or an explicit string.
    if (preg_match('/pluralize:\s*FALSE/i', $args)) {
      continue;
    }

    if (preg_match("/pluralize:\s*'([^']+)'/", $args, $explicit)) {
      $add($explicit[1], $path, 'entity_method_plural');
      continue;
    }

    $plural = $inflector->pluralize($name)[0] ?? '';

    if ($plural !== $name) {
      $add($plural, $path, 'entity_method_plural');
    }
  }
}

ksort($actions, SORT_NATURAL | SORT_FLAG_CASE);
usort($derived, fn (array $a, array $b): int => strcmp($a['plugin'], $b['plugin']));

$commit = shell_exec('git -C ' . escapeshellarg($root) . ' rev-parse --short HEAD 2>/dev/null');

echo json_encode([
  'core' => trim($commit ?: '') ?: 'unknown',
  'actions' => array_values($actions),
  'derived' => $derived,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";
