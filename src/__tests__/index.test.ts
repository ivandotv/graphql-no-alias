import { buildSchema, FieldNode, GraphQLError, parse, validate } from 'graphql'
import { createValidation } from '../'

describe('Directive on field', () => {
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
        getUser @noAlias {
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

  test('Do not allow alias if the directive is present', () => {
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
        getUser @noAlias {
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

  test('Set custom maximum allowed', () => {
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
      new RegExp(`Allowed number of calls.+${allow}`, 'i')
    )
  })

  test('Set global maximum allowed', () => {
    const allow = 3
    const { validation, typeDefs } = createValidation(allow)

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
      new RegExp(`Allowed number of calls.+${allow}`, 'i')
    )
  })

  test('Change directive name', () => {
    const allow = 3
    const directiveName = 'customDirectiveName'

    const { validation, typeDefs } = createValidation(allow, directiveName)

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
      new RegExp(`Allowed number of calls.+${allow}`, 'i')
    )
  })
})
