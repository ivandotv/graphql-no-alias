import { Plugin } from '@envelop/types'
import createValidation, { Config } from 'graphql-no-alias'

export type NoAliasConfig = Config

export function useNoAlias(config?: Config): Plugin {
  const { validation } = createValidation(config)

  return {
    onValidate({ addValidationRule }) {
      addValidationRule(validation)
    }
  }
}
