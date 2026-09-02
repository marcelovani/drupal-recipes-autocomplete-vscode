<?php

declare(strict_types=1);

namespace Drupal\recipe_test_module\Plugin\ConfigAction;

use Drupal\Core\Config\Action\Attribute\ConfigAction;
use Drupal\Core\Config\Action\ConfigActionPluginInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * A config action that only this codebase has, so no static list can know it.
 */
#[ConfigAction(
  id: 'doSomethingModuleSpecific',
  admin_label: new TranslatableMarkup('Do something module specific'),
)]
final class TestAction implements ConfigActionPluginInterface {

  public function apply(string $configName, mixed $value): void {}

}
