import { Plugin } from '@envelop/types'
import { createValidation } from 'graphql-no-alias'
import type { Config } from 'graphql-no-alias'

export { createTypeDefinition } from 'graphql-no-alias'
export type { Config } from 'graphql-no-alias'

export function useNoAlias(config?: Config): Plugin {
  const { validation } = createValidation(config)

  return {
    onValidate({ addValidationRule }) {
      addValidationRule(validation)
    }
  }
}
