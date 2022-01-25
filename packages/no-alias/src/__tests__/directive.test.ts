import { buildSchema, GraphQLError, parse, validate } from 'graphql'
import createValidation from '..'

describe('Directive on type field', () => {
  test('If the directive is not present, ignore all aliases', () => {
    const { validation, typeDefs } = createValidation()

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])
    expect(errors).toHaveLength(0)
  })

  test('By default do not allow more than 1 alias per field', () => {
    const { validation, typeDefs } = createValidation()
    const defaultCount = 1

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultCount}`, 'i')
    )
  })

  test('Set custom number of allowed aliases', () => {
    const { validation, typeDefs } = createValidation()
    const allow = 3

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias(allow: ${allow})
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      query Test {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        alias_2: getUser {
          name
        }

        alias_3: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${allow}`, 'i')
    )
  })

  test('Set custom default value maximum allowed when creating the validation', () => {
    const defaultAllow = 3
    const { validation, typeDefs } = createValidation({ defaultAllow })

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        alias_2: getUser {
          name
        }

        alias_3: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultAllow}`, 'i')
    )
  })

  test('Set custom directive name', () => {
    const defaultAllow = 3
    const directiveName = 'customDirectiveName'

    const { validation, typeDefs } = createValidation({
      defaultAllow,
      directiveName
    })

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @${directiveName}
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        alias_2: getUser {
          name
        }

        alias_3: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultAllow}`, 'i')
    )
  })

  test('Always report single error per field', () => {
    const defaultAllow = 3
    const directiveName = 'customDirectiveName'

    const { validation, typeDefs } = createValidation({
      defaultAllow,
      directiveName
    })

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @${directiveName}
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        alias_2: getUser {
          name
        }

        alias_3: getUser {
          name
        }

        alias_4: getUser {
          name
        }

        alias_5: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultAllow}`, 'i')
    )
  })

  describe('Custom error', () => {
    test('Return custom GraphQlError instance', () => {
      const allow = 1
      const errorMessage = 'custom_error_message'

      const errorFn = jest.fn().mockReturnValue(new GraphQLError(errorMessage))

      const { validation, typeDefs } = createValidation({ errorFn })

      const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias(allow:${allow})
      }
      type User {
        name: String
      }
    `)

      const query = /* GraphQL */ `
        {
          getUser {
            name
          }
          alias_1: getUser {
            name
          }
        }
      `
      const doc = parse(query)
      const errors = validate(schema, doc, [validation])

      expect(errors).toHaveLength(1)
      expect(errors[0].message).toMatch(errorMessage)
    })

    test('Return string from error', () => {
      const allow = 1
      const errorMessage = 'custom_error_message'

      const errorFn = jest.fn().mockReturnValue(errorMessage)

      const { validation, typeDefs } = createValidation({ errorFn })

      const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias(allow:${allow})
      }
      type User {
        name: String
      }
    `)

      const query = /* GraphQL */ `
        {
          getUser {
            name
          }
          alias_1: getUser {
            name
          }
        }
      `
      const doc = parse(query)
      const errors = validate(schema, doc, [validation])

      expect(errors).toHaveLength(1)
      expect(errors[0].message).toMatch(errorMessage)
    })
  })

  test('Handle the case when all queries use alias', () => {
    const { validation, typeDefs } = createValidation()
    const defaultCount = 1

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        alias_1: getUser {
          name
        }
        alias_2: getUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultCount}`, 'i')
    )
  })
})
