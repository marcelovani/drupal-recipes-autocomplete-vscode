<?php

declare(strict_types=1);

namespace Drupal\recipe_test_module\Entity;

use Drupal\Core\Config\Action\Attribute\ActionMethod;
use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * Carries an ActionMethod, which is derived into an action and a plural alias.
 */
final class TestThing {

  #[ActionMethod(adminLabel: new TranslatableMarkup('Set the widget'))]
  public function setWidget(string $value): void {}

}
