import { buildSchema, parse, validate } from 'graphql'
import createValidation from '..'

describe('Object type level validation', () => {
  test('Object level directive applies to all fields', () => {
    const { validation, typeDefs } = createValidation()
    const defaultCount = 1

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query @noAlias {
        createUser: User
        createAnotherUser: User
      }

      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      query {
        createUser {
          name
        }
        create_alias_1: createUser {
          name
        }
        create_alias_2: createUser {
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

  test('Object level directive can accept custom value', () => {
    const { validation, typeDefs } = createValidation()
    const defaultCount = 4

    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query @noAlias(allow:${defaultCount}) {
        createUser: User
        createAnotherUser: User
      }

      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      query {
        createUser {
          name
        }
        create_alias_1: createUser {
          name
        }
        create_alias_2: createUser {
          name
        }
        create_alias_3: createUser {
          name
        }
        create_alias_4: createUser {
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
