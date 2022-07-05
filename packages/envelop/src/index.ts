import { Plugin } from '@envelop/types'
import type { Config } from 'graphql-no-alias'
import { createValidation } from 'graphql-no-alias'

export { createTypeDefinition } from 'graphql-no-alias'
export type { Config } from 'graphql-no-alias'

/**
 * Uses no-alias directive
 * @param config - {@link Config }
 *
 * @see {@link https://github.com/ivandotv/graphql-no-alias | GraphQL no alias }
 * @see {@link createValidation }
 */
export function useNoAlias(config?: Config): Plugin {
  const { validation } = createValidation(config)

  return {
    onValidate({ addValidationRule }) {
      addValidationRule(validation)
    }
  }
}
